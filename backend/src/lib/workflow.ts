import { Prisma, ApplicationStatus } from '@prisma/client';
import type { Response } from 'express';
import prisma from './prisma';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const activeStatuses: ApplicationStatus[] = ['COMMITTED', 'CANCEL_REQUESTED'];
export const placementStatuses: ApplicationStatus[] = [...activeStatuses, 'CANCELLED'];
export const targetHours = 400;

// All application and logbook mutations lock the same student row. Recheck state
// after acquiring the lock, so simultaneous requests cannot bypass the workflow.
export async function withStudentLock<T>(studentId: string, action: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "StudentProfile" WHERE id = ${studentId} FOR UPDATE`;
    return action(tx);
  }, { maxWait: 10000, timeout: 15000 });
}

export async function companyPlacement(userId: string, studentId: string, applicationId?: string, history = false) {
  const placement = await prisma.application.findFirst({
    where: {
      ...(applicationId ? { id: applicationId } : {}),
      studentId,
      status: { in: history ? placementStatuses : activeStatuses },
      jobPost: { company: { userId } }
    },
    orderBy: { updatedAt: 'desc' }
  });
  if (!placement) throw new HttpError(403, 'This placement is not assigned to your company.');
  return placement;
}

export function rating(value: unknown, optional = false): number | null {
  if (optional && (value === undefined || value === null || value === '')) return null;
  const result = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isInteger(result) || result < 1 || result > 5) throw new HttpError(400, 'Rating must be an integer from 1 to 5.');
  return result;
}

export function handleRouteError(res: Response, error: unknown, message: string) {
  if (error instanceof HttpError) { res.status(error.status).json({ error: error.message }); return; }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    res.status(409).json({ error: 'This record already exists. Refresh and try again.' }); return;
  }
  console.error(message, error);
  res.status(500).json({ error: message });
}

export function workDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) throw new HttpError(400, 'Invalid work date.');
  const day = value.slice(0, 10);
  const date = new Date(day + 'T00:00:00.000Z');
  if (isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== day) throw new HttpError(400, 'Invalid work date.');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  if (day > today) throw new HttpError(400, 'Cannot submit a daily log for a future date.');
  return { date, isBackdated: day < today };
}
