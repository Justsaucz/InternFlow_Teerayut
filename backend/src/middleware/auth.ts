import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../lib/prisma';
import { managedAuthEnabled, validateManagedSession, ManagedSession } from '../lib/managedAuth';

export interface AuthRequest extends Request { user?: { userId: string; role: Role; neonSession?: ManagedSession } }
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'Unauthorized: No token provided' }); return; }
  let decoded: { userId: string; role: Role; passwordVersion?: number; neonSession?: ManagedSession };
  try { decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key') as typeof decoded; }
  catch { res.status(401).json({ error: 'Unauthorized: Invalid token' }); return; }
  try {
    if(managedAuthEnabled() && !(await validateManagedSession(decoded.neonSession,decoded.userId))){res.status(401).json({error:'Session expired. Please sign in again.'});return;}
    const user = typeof decoded.userId === 'string' ? await prisma.user.findUnique({ where: { id: decoded.userId }, select: { role: true, passwordVersion: true, emailVerificationRequired: true, emailVerifiedAt: true } }) : null;
    if (!user || user.passwordVersion !== (decoded.passwordVersion ?? 0) || (user.emailVerificationRequired && !user.emailVerifiedAt)) { res.status(401).json({ error: 'Session expired. Please sign in again.' }); return; }
    req.user = { userId: decoded.userId, role: user.role, ...(decoded.neonSession?{neonSession:decoded.neonSession}:{}) }; next();
  } catch { res.status(503).json({ error: 'Authentication service is temporarily unavailable.' }); }
};
export const authorize = (roles: Role[]) => (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
  if (!roles.includes(req.user.role)) { res.status(403).json({ error: 'Forbidden: Insufficient permissions' }); return; }
  next();
};
