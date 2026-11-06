import { Prisma } from '@prisma/client';
import prisma from './prisma';
import { notifyApplication } from './notifications';

type ReadinessApplication = {
  status: string;
  readinessEnabled: boolean; readinessStartDate: Date | null; readinessDeadline: Date | null; readinessVersion: number;
  readinessConfirmations: { scheduleVersion: number; source: string; confirmedAt: Date; confirmedById: string }[];
};
export function readinessView(app: ReadinessApplication, now = new Date()) {
  const job = app;
  if (!job.readinessEnabled || !job.readinessStartDate || !job.readinessDeadline || !['COMMITTED','CANCEL_REQUESTED'].includes(app.status)) return null;
  const confirmation = app.readinessConfirmations.find(c => c.scheduleVersion === job.readinessVersion);
  return { version:job.readinessVersion, startDate:job.readinessStartDate, deadline:job.readinessDeadline,
    status:app.status === 'CANCEL_REQUESTED' ? 'PAUSED' : confirmation ? `CONFIRMED_${confirmation.source === 'STUDENT_WEB' ? 'WEB' : 'EMAIL'}` : job.readinessDeadline < now ? 'OVERDUE' : 'PENDING',
    confirmation: confirmation ? { source:confirmation.source, confirmedAt:confirmation.confirmedAt, recordedBy:confirmation.confirmedById, late:confirmation.confirmedAt > job.readinessDeadline } : null };
}

// Persisted notice keys avoid duplicate alerts across restarts and API instances.
export async function processReadinessNotices(now = new Date()) {
  let sent = 0;
  for (const kind of ['REQUESTED','OVERDUE'] as const) {
    const cutoff = kind === 'REQUESTED' ? new Date(now.getTime() + 3 * 86400000) : now;
    const candidates = await prisma.$queryRaw<{id:string;studentId:string;jobPostId:string}[]>(Prisma.sql`
      SELECT a.id, a."studentId", a."jobPostId" FROM "Application" a
      WHERE a.status='COMMITTED' AND a."readinessEnabled"=true AND a."readinessDeadline" <= ${cutoff}
      AND a."readinessStartDate" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "ReadinessConfirmation" c WHERE c."applicationId"=a.id AND c."scheduleVersion"=a."readinessVersion")
      AND NOT EXISTS (SELECT 1 FROM "ReadinessNotice" n WHERE n."applicationId"=a.id AND n."scheduleVersion"=a."readinessVersion" AND n.kind=${kind})
      ORDER BY a."readinessDeadline",a.id LIMIT 100`);
    for (const candidate of candidates) {
      const created = await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "StudentProfile" WHERE id=${candidate.studentId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM "Application" WHERE id=${candidate.id} FOR UPDATE`;
        const app = await tx.application.findUnique({where:{id:candidate.id},include:{jobPost:true,readinessConfirmations:true}});
        if (!app || app.status !== 'COMMITTED' || !app.readinessEnabled || !app.readinessStartDate || !app.readinessDeadline || app.readinessDeadline > cutoff || app.readinessConfirmations.some(c=>c.scheduleVersion === app.readinessVersion)) return 0;
        // Do not send an obsolete request alert after the deadline; send the overdue alert instead.
        if (kind === 'REQUESTED' && app.readinessDeadline < now) {
          await tx.readinessNotice.createMany({data:{applicationId:app.id,scheduleVersion:app.readinessVersion,kind},skipDuplicates:true}); return 0;
        }
        const notice = await tx.readinessNotice.createMany({data:{applicationId:app.id,scheduleVersion:app.readinessVersion,kind},skipDuplicates:true});
        if (!notice.count) return 0;
        await notifyApplication(tx,app.id,kind === 'REQUESTED' ? 'student' : 'both',`READINESS_${kind}`,kind === 'REQUESTED' ? 'กรุณายืนยันความพร้อมก่อนเริ่มงาน / Please confirm your readiness before the deadline.' : 'ยังไม่ได้รับคำยืนยันความพร้อมตามกำหนด กรุณาติดตาม / Readiness confirmation is overdue. Please follow up.');
        return 1;
      });
      sent += created;
    }
  }
  return sent;
}
export function startReadinessNotices() {
  let running = false;
  const tick = async () => { if(running)return;running=true;try{await processReadinessNotices();}catch{console.error('Readiness notifications could not be processed; will retry.');}finally{running=false;} };
  void tick(); const timer=setInterval(()=>void tick(),60000);timer.unref();return timer;
}
