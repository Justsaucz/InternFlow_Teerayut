import type { Prisma } from '@prisma/client';
import { Router, Response, RequestHandler } from 'express';
import path from 'node:path';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { HttpError, handleRouteError } from '../lib/workflow';
import { documentBytes } from '../lib/screening';

const router = Router();
function urls(value: string | null): string[] {
  if (!value) return [];
  try { const entries = JSON.parse(value); if (Array.isArray(entries)) return entries.map(e => typeof e === 'string' ? e : e?.url).filter(v => typeof v === 'string'); } catch { /* legacy single URL */ }
  return value.split('\n').map(s => s.trim()).filter(Boolean);
}
export function storagePath(url: string) {
  if (/^\/(?:private-uploads|uploads)\/[a-zA-Z0-9_.-]+$/.test(url)) return url;
  try {
    const parsed = new URL(url);
    const bucket = process.env.S3_BUCKET_NAME;
    if (bucket && parsed.protocol === 'https:' && [`${bucket}.s3.amazonaws.com`, `${bucket}.s3.${process.env.AWS_REGION || 'ap-southeast-1'}.amazonaws.com`].includes(parsed.hostname)) return decodeURIComponent(parsed.pathname);
    const origins = [process.env.API_PUBLIC_URL, `http://localhost:${process.env.PORT || 4000}`, `http://127.0.0.1:${process.env.PORT || 4000}`].filter(Boolean);
    if ((origins.includes(parsed.origin) || ['localhost','127.0.0.1'].includes(parsed.hostname)) && /^\/uploads\/[a-zA-Z0-9_.-]+$/.test(parsed.pathname)) return parsed.pathname;
  } catch { /* external URL */ }
  return null;
}
async function linkedLogs(url: string) {
  const key = storagePath(url);
  if (!key) return [];
  const where = { attachmentUrl: { contains: path.basename(key) } };
  const include = { student: { select: { userId: true } }, application: { select: { jobPost: { select: { company: { select: { userId: true } } } } } } };
  const [daily, weekly] = await Promise.all([prisma.dailyLog.findMany({ where, include }), prisma.weeklyLog.findMany({ where, include })]);
  return [...daily, ...weekly].filter(log => urls(log.attachmentUrl).some(value => storagePath(value) === key));
}
// Keep the privacy classification after an attachment is removed from an editable log.
export async function retainLogbookAttachments(tx: Prisma.TransactionClient, log: {attachmentUrl:string|null; applicationId:string|null; studentId:string}) {
  const student = await tx.studentProfile.findUnique({where:{id:log.studentId},select:{userId:true}});
  if (!student) return;
  for (const url of urls(log.attachmentUrl)) {
    const key=storagePath(url); if(!key)continue;
    const known=await tx.document.findFirst({where:{fileUrl:url,userId:student.userId,applicationId:log.applicationId,type:'LOGBOOK_ATTACHMENT'}});
    if(!known)await tx.document.create({data:{fileUrl:url,userId:student.userId,applicationId:log.applicationId,type:'LOGBOOK_ATTACHMENT',title:path.basename(key)}});
  }
}
export async function backfillLogbookAttachments() {
  // Cursor batches bound memory during startup; no file bytes are moved or removed.
  for (const model of ['dailyLog','weeklyLog'] as const) {
    let cursor:string|undefined;
    for (;;) {
      const options = {where:{attachmentUrl:{not:null}},select:{id:true,attachmentUrl:true,applicationId:true,studentId:true},orderBy:{id:'asc' as const},take:100,...(cursor?{cursor:{id:cursor},skip:1}:{})};
      const logs = model === 'dailyLog' ? await prisma.dailyLog.findMany(options) : await prisma.weeklyLog.findMany(options);
      if(!logs.length)break;
      for(const log of logs)await prisma.$transaction(tx=>retainLogbookAttachments(tx,log));
      cursor=logs[logs.length-1].id;
    }
  }
}
// Protect legacy files too, without moving/deleting student evidence or breaking public logos.
export const protectLegacyLogbookFiles: RequestHandler = async (req, res, next) => {
  try {
    const requested='/uploads'+req.path;
    const docs=await prisma.document.findMany({where:{type:'LOGBOOK_ATTACHMENT',fileUrl:{contains:path.basename(req.path)}},select:{fileUrl:true}});
    if (docs.some(doc=>storagePath(doc.fileUrl)===requested) || (await linkedLogs(requested)).length) { res.set('Cache-Control', 'private, no-store').status(404).json({ error: 'Private file. Sign in to view this attachment.' }); return; }
    next();
  } catch { res.status(503).json({ error: 'File access is temporarily unavailable.' }); }
};
router.get('/content', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const url = typeof req.query.url === 'string' ? req.query.url : '';
    const key = storagePath(url);
    if (!key) throw new HttpError(404, 'File not found.');
    const docs = await prisma.document.findMany({ where: { fileUrl: {contains:path.basename(key)}, type: 'LOGBOOK_ATTACHMENT' }, include: { application: { select: { jobPost: { select: { company: { select: { userId: true } } } } } } } });
    const doc = docs.find(d => storagePath(d.fileUrl) === key && (d.userId === req.user!.userId || d.application?.jobPost.company.userId === req.user!.userId));
    const logs = doc ? [] : await linkedLogs(url);
    if (!doc && !logs.some(log => log.student.userId === req.user!.userId || log.application?.jobPost.company.userId === req.user!.userId)) throw new HttpError(404, 'File not found or access denied.');
    const types: Record<string,string> = { '.pdf':'application/pdf', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.doc':'application/msword', '.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.zip':'application/zip' };
    const mimeType = doc?.mimeType || types[path.extname(key).toLowerCase()] || 'application/octet-stream';
    const stored=doc?.fileUrl||url;
    const { bytes } = await documentBytes({ fileUrl: stored.startsWith('http') && !stored.includes('.amazonaws.com/') ? key : stored, mimeType }, false);
    res.set({ 'Content-Type': mimeType, 'X-Content-Type-Options':'nosniff', 'Cache-Control':'private, no-store', 'Content-Disposition': `${mimeType.startsWith('image/') || mimeType === 'application/pdf' ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(doc?.title || path.basename(key))}` }).send(bytes);
  } catch (error) { handleRouteError(res, error, 'Failed to read attachment.'); }
});
export default router;
