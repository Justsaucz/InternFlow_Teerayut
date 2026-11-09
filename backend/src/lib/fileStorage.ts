import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import prisma from './prisma';
import { HttpError } from './workflow';

export const databaseFiles = () => process.env.FILE_STORAGE === 'database';
export const validFileKey = (key: string) => /^(?:uploads|private-uploads)\/[a-zA-Z0-9_.-]+$/.test(key);

export async function readStoredUpload(key: string) {
  if (!validFileKey(key)) throw new HttpError(404, 'File not found.');
  const rows = await prisma.$queryRaw<{bytes: Uint8Array; mimeType: string}[]>`
    SELECT "bytes", "mimeType" FROM "StoredUpload" WHERE "fileKey" = ${key}`;
  if (!rows.length) throw new HttpError(404, 'File not found.');
  return { bytes: Buffer.from(rows[0].bytes), mimeType: rows[0].mimeType };
}

// Multer calls this after authentication. Private files keep the existing URL
// format so that the original document and logbook authorization still applies.
export const databaseStorage = {
  _handleFile(req: Request, file: Express.Multer.File, callback: (error?: Error | null, info?: Partial<Express.Multer.File>) => void) {
    const chunks: Buffer[] = [];
    let size = 0;
    file.stream.on('data', (part: Buffer) => { size += part.length; chunks.push(part); });
    file.stream.on('error', callback);
    file.stream.on('end', () => {
      void (async () => {
        // Multer discards a file that reached its configured size limit.
        if ((file.stream as typeof file.stream & {truncated?: boolean}).truncated) return callback(new Error('File size must be under 5MB.'));
        const extension = /\.[a-zA-Z0-9]+$/.exec(file.originalname)?.[0].toLowerCase() || '';
        const folder = ['/evidence','/application','/logbook'].includes(req.path) ? 'private-uploads' : 'uploads';
        const filename = randomUUID() + extension;
        const key = `${folder}/${filename}`;
        const bytes = Buffer.concat(chunks);
        await prisma.$transaction(async tx => {
          // Serialize quota checks so simultaneous uploads cannot exceed it.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(29061109)`;
          const usage = await tx.$queryRaw<{total: bigint}[]>`SELECT COALESCE(SUM(octet_length("bytes")), 0)::bigint AS total FROM "StoredUpload"`;
          if (Number(usage[0].total) + size > 100 * 1024 * 1024) throw new HttpError(413, 'The file storage limit (100MB) has been reached. Please contact the administrator.');
          await tx.$executeRaw`INSERT INTO "StoredUpload" ("fileKey", "bytes", "mimeType") VALUES (${key}, ${bytes}, ${file.mimetype})`;
        });
        callback(null, { filename, size, path: key });
      })().catch(callback);
    });
  },
  _removeFile(_req: Request, file: Express.Multer.File, callback: (error: Error | null) => void) {
    const key = file.path;
    if (!key || !validFileKey(key)) return callback(null);
    void prisma.$executeRaw`DELETE FROM "StoredUpload" WHERE "fileKey" = ${key}`.then(() => callback(null), callback);
  }
};
