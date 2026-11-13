import { storagePath } from '../routes/logbook-private.routes';
import type { Prisma } from '@prisma/client';
import { HttpError } from './workflow';

export function attachmentLinks(value: unknown): { title: string; url: string }[] {
  if (value == null || value === '') return [];
  if (typeof value !== 'string' || value.length > 30000) throw new HttpError(400, 'Invalid attachments.');
  let entries: unknown;
  try { entries = JSON.parse(value); } catch { entries = value.split('\n').filter(Boolean); }
  if (!Array.isArray(entries) || entries.length > 20) throw new HttpError(400, 'Use up to 20 attachments.');
  return entries.map(entry => {
    const url = typeof entry === 'string' ? entry.trim() : typeof entry?.url === 'string' ? entry.url.trim() : '';
    const title = typeof entry?.title === 'string' ? entry.title.trim() : 'Artifact';
    if (!url || url.length > 2000 || title.length > 300 || (!/^https?:\/\//i.test(url) && !/^\/(?:uploads|private-uploads)\/[a-zA-Z0-9_./-]+$/.test(url))) throw new HttpError(400, 'Attachments must use HTTP(S) links or uploaded files.');
    if (url.startsWith('/') && url.split('/').some((part: string) => part === '..')) throw new HttpError(400, 'Invalid attachment path.');
    try { if (!url.startsWith('/')) { const parsed = new URL(url); if (parsed.username || parsed.password) throw new Error(); } } catch { throw new HttpError(400, 'Invalid attachment URL.'); }
    return { title, url };
  });
}

export async function validateAttachments(tx: Prisma.TransactionClient, value: unknown, userId: string, applicationId: string) {
  const links = attachmentLinks(value);
  for (const link of links) {
    const key = storagePath(link.url);
    if (key) {
      const document = await tx.document.findFirst({where:{OR:[{fileUrl:link.url},{fileUrl:key}],userId,applicationId,type:'LOGBOOK_ATTACHMENT'}});
      if (!document) {
        const existing = await tx.dailyLog.findMany({where:{applicationId,student:{userId},attachmentUrl:{not:null}},select:{attachmentUrl:true}});
        if (!existing.some(log => attachmentLinks(log.attachmentUrl).some(item => storagePath(item.url) === key))) throw new HttpError(400, 'Use your own logbook file upload.');
      }
      // Retain the canonical private key after checking ownership.
      link.url = key;
    }
  }
  return links.length ? JSON.stringify(links) : null;
}
