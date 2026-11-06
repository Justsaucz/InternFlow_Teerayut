import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { rateLimit } from 'express-rate-limit';
import prisma from '../lib/prisma';
import { HttpError, handleRouteError } from '../lib/workflow';
import { mailConfigured, sendAccountLink, tokenHash } from '../lib/accountMail';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const limit = rateLimit({ windowMs: 15 * 60000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Too many account requests. Please try again in 15 minutes.' } });
const generic = { message: 'If an eligible account exists, an email will be sent. Please check your inbox and spam folder.' };
const email = (value: unknown) => {
  if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) throw new HttpError(400, 'Enter a valid email address.');
  return value.trim().toLowerCase();
};
for (const [route, purpose] of [['/forgot-password', 'RESET_PASSWORD'], ['/resend-verification', 'VERIFY_EMAIL']] as const) {
  router.post(route, limit, async (req: Request, res: Response) => {
    const started = Date.now();
    try {
      const address = email(req.body.email);
      if (!mailConfigured()) throw new HttpError(503, 'Email delivery is not configured. Please contact the administrator.');
      const user = await prisma.user.findFirst({ where: { email: { equals: address, mode: 'insensitive' } } });
      if (user && (purpose === 'RESET_PASSWORD' || !user.emailVerifiedAt)) {
        try { await sendAccountLink(user, purpose); } catch { /* Same response for existing and unknown accounts. Delivery failure is logged without recipient or token. */ console.error('Account email delivery failed. Check SMTP settings.'); }
      }
      await new Promise(resolve => setTimeout(resolve, Math.max(0, 650 - (Date.now() - started))));
      res.json(generic);
    } catch (error) { handleRouteError(res, error, 'Account request failed.'); }
  });
}
router.post('/reset-password', limit, async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new HttpError(400, 'This password reset link is invalid or expired.');
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) throw new HttpError(400, 'Use at least 8 characters and no more than 72 UTF-8 bytes.');
    const hashed = await bcrypt.hash(password, 12);
    await prisma.$transaction(async tx => {
      const record = await tx.accountToken.findUnique({ where: { tokenHash: tokenHash(token) } });
      if (!record || record.purpose !== 'RESET_PASSWORD') throw new HttpError(400, 'This password reset link is invalid or expired.');
      const claimed = await tx.accountToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      if (!claimed.count) throw new HttpError(400, 'This password reset link is invalid or expired.');
      await tx.user.update({ where: { id: record.userId }, data: { password: hashed, passwordVersion: { increment: 1 } } });
      await tx.accountToken.updateMany({ where: { userId: record.userId, purpose: 'RESET_PASSWORD', usedAt: null }, data: { usedAt: new Date() } });
    });
    res.json({ message: 'Password changed. Please sign in again.' });
  } catch (error) { handleRouteError(res, error, 'Password reset failed.'); }
});
router.post('/verify-email', limit, async (req: Request, res: Response) => {
  try {
    const token = req.body.token;
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new HttpError(400, 'This verification link is invalid or expired.');
    await prisma.$transaction(async tx => {
      const record = await tx.accountToken.findUnique({ where: { tokenHash: tokenHash(token) } });
      if (!record || record.purpose !== 'VERIFY_EMAIL') throw new HttpError(400, 'This verification link is invalid or expired.');
      const used = await tx.accountToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      if (!used.count) throw new HttpError(400, 'This verification link is invalid or expired.');
      await tx.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
    });
    res.json({ message: 'Email verified. You can now sign in.' });
  } catch (error) { handleRouteError(res, error, 'Email verification failed.'); }
});
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { email: true, emailVerifiedAt: true } });
  res.json(user);
});
export default router;
