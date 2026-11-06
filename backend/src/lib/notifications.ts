import { Prisma } from '@prisma/client';
export async function notifyApplication(tx: Prisma.TransactionClient, applicationId: string, audience: 'student' | 'company' | 'both', kind: string, message: string) {
  const app = await tx.application.findUnique({ where: { id: applicationId }, include: { student: { select: { userId: true } }, jobPost: { include: { company: { select: { userId: true } } } } } });
  if (!app) return;
  const data = [];
  const screening = /^(ASSESSMENT|PORTFOLIO|EVIDENCE)_/.test(kind) ? '/dashboard/screening?applicationId=' + app.id : null;
  if (audience !== 'company') data.push({ userId: app.student.userId, kind, title: app.jobPost.title, message, href: screening || '/dashboard/applications' });
  if (audience !== 'student') data.push({ userId: app.jobPost.company.userId, kind, title: app.jobPost.title, message, href: screening || '/dashboard/applicants' });
  await tx.notification.createMany({ data });
}
