import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { Role } from '@prisma/client';
import { handleRouteError, HttpError } from '../lib/workflow';
import { mailConfigured, sendAccountLink } from '../lib/accountMail';

const router = Router();

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role } = req.body;

    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254 ||
        typeof password !== 'string' || password.length < 6 || Buffer.byteLength(password, 'utf8') > 72 ||
        typeof name !== 'string' || !name.trim() || ![Role.STUDENT, Role.COMPANY_HR].includes(role)) {
      res.status(400).json({ error: 'Provide a valid email, name, student/company role, and a password of at least 6 characters (up to 72 bytes).' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } }
    });
    if (existingUser) {
      res.status(400).json({ error: 'Email already in use' });
      return;
    }

    const demo = process.env.DEMO_MODE === 'true';
    if (!demo && !mailConfigured()) throw new HttpError(503, 'Email delivery must be configured before registering new accounts.');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Nested writes keep account and profile creation atomic.
    const user = await prisma.user.create({
      data: {
        email: cleanEmail, password: hashedPassword, name: name.trim(), role, emailVerificationRequired: !demo,
        ...(role === Role.STUDENT ? {
          studentProfile: { create: { studentId: '', major: '', faculty: '', year: 1, skills: [] } }
        } : { companyProfile: { create: { companyName: name.trim(), industry: '' } } })
      }
    });

    if (demo) {
      res.status(201).json({ message: 'Demo account created. Email is not verified in this trial.', userId: user.id, verificationRequired: false, emailSent: false });
      return;
    }
    let emailSent = true;
    try { await sendAccountLink(user, 'VERIFY_EMAIL'); } catch { emailSent = false; console.error('Verification email delivery failed. Use resend after fixing SMTP.'); }
    res.status(201).json({ message: 'Account created. Verify your email before signing in.', userId: user.id, verificationRequired: true, emailSent });
  } catch (error) {
    handleRouteError(res, error, 'Failed to register account.');
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const cleanEmail = email.trim();
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' }
      }
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (user.emailVerificationRequired && !user.emailVerifiedAt) { res.status(403).json({ error: 'Verify your email before signing in.', code: 'EMAIL_NOT_VERIFIED' }); return; }

    const token = jwt.sign(
      { userId: user.id, role: user.role, passwordVersion: user.passwordVersion },
      process.env.JWT_SECRET || 'super_secret_jwt_key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
