import nodemailer from 'nodemailer';
import { createHash, randomBytes } from 'node:crypto';
import prisma from './prisma';
import { HttpError } from './workflow';

export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export function mailConfigured() { return Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM && process.env.FRONTEND_URL); }
export async function sendAccountLink(user: { id: string; email: string }, purpose: 'RESET_PASSWORD' | 'VERIFY_EMAIL') {
  if (!mailConfigured()) throw new HttpError(503, 'Email delivery is not configured. Please contact the administrator.');
  const origin = new URL(process.env.FRONTEND_URL!);
  if (!['http:', 'https:'].includes(origin.protocol) || (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:')) throw new HttpError(503, 'A secure frontend URL is required.');
  const raw = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + (purpose === 'RESET_PASSWORD' ? 30 : 24 * 60) * 60000);
  const record = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
    await tx.accountToken.updateMany({ where: { userId: user.id, purpose, usedAt: null }, data: { usedAt: new Date() } });
    return tx.accountToken.create({ data: { userId: user.id, purpose, tokenHash: tokenHash(raw), expiresAt } });
  });
  const url = new URL(purpose === 'RESET_PASSWORD' ? '/reset-password' : '/verify-email', origin);
  url.hash = 'token=' + raw;
  const reset = purpose === 'RESET_PASSWORD';
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true',
    requireTLS: process.env.NODE_ENV === 'production' && process.env.SMTP_SECURE !== 'true',
    ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } } : {}),
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
  try {
    await transport.sendMail({ from: process.env.MAIL_FROM, to: user.email,
      subject: reset ? 'InternFlow - Reset your password / ตั้งรหัสผ่านใหม่' : 'InternFlow - Verify your email / ยืนยันอีเมล',
      text: `${reset ? 'Reset your InternFlow password. This link expires in 30 minutes.' : 'Verify your InternFlow email. This link expires in 24 hours.'}\n\n${url.href}\n\nIf you did not request this, ignore this email.`,
    });
  } catch {
    await prisma.accountToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
    throw new HttpError(503, 'Email could not be delivered. Please try again later.');
  } finally { transport.close(); }
}
