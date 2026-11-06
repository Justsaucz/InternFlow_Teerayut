import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { Role } from '@prisma/client';
import { retainLogbookAttachments } from './logbook-private.routes';
import { notifyApplication } from '../lib/notifications';
import { HttpError, activeStatuses, placementStatuses, targetHours, withStudentLock, companyPlacement, rating, workDate, handleRouteError } from '../lib/workflow';

import { validateAttachments } from '../lib/logbook-attachments';

const router = Router();

// Helper to group daily logs by week
function groupLogsByWeek(dailyLogs: any[]) {
  const weekMap = new Map<number, any>();

  for (const log of dailyLogs) {
    const week = log.weekNumber || 1;
    if (!weekMap.has(week)) {
      weekMap.set(week, {
        weekNumber: week,
        startDate: log.logDate,
        endDate: log.logDate,
        totalHours: 0,
        approvedHours: 0,
        mentorApproved: true, // will be false if any day is not approved
        hasBackdated: false,
        mentorRating: null,
        mentorFeedback: null,
        days: []
      });
    }

    const group = weekMap.get(week);
    group.days.push(log);
    group.totalHours += (log.hoursWorked || 0);
    if (log.mentorApproved) {
      group.approvedHours += (log.hoursWorked || 0);
    } else {
      group.mentorApproved = false;
    }
    if (log.isBackdated) {
      group.hasBackdated = true;
    }

    const logTime = new Date(log.logDate).getTime();
    if (logTime < new Date(group.startDate).getTime()) {
      group.startDate = log.logDate;
    }
    if (logTime > new Date(group.endDate).getTime()) {
      group.endDate = log.logDate;
    }
  }

  // Summarise approved daily ratings; a daily comment is never a weekly review.
  for (const group of weekMap.values()) {
    const ratings = group.days.filter((day: any) => day.mentorApproved && day.mentorRating != null).map((day: any) => day.mentorRating);
    group.mentorRating = ratings.length ? Math.round(ratings.reduce((sum: number, value: number) => sum + value, 0) / ratings.length * 10) / 10 : null;
    group.ratedDays = ratings.length;
  }
  // Sort weeks in ascending or descending order
  return Array.from(weekMap.values()).sort((a, b) => b.weekNumber - a.weekNumber);
}

function logSummary(logs: any[]) {
  return {
    logs, groupedWeeks: groupLogsByWeek(logs), targetHours,
    totalHours: logs.reduce((sum, log) => sum + log.hoursWorked, 0),
    approvedHours: logs.filter(log => log.mentorApproved).reduce((sum, log) => sum + log.hoursWorked, 0)
  };
}

router.get('/my', authenticate, authorize([Role.STUDENT]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.userId }, include: { user: { select: { name: true, email: true, avatarUrl: true } } } });
    if (!student) throw new HttpError(404, 'Student profile not found.');
    const placement = await prisma.application.findFirst({
      where: { studentId: student.id, status: { in: placementStatuses } },
      orderBy: { updatedAt: 'desc' },
      include: { jobPost: { include: { company: true } }, evaluation: true }
    });
    // Prefer the current placement over archived records, regardless of enum order.
    const activePlacement = await prisma.application.findFirst({
      where: { studentId: student.id, status: { in: activeStatuses } },
      include: { jobPost: { include: { company: true } }, evaluation: true }, orderBy: { updatedAt: 'desc' }
    });
    const selected = activePlacement || placement;
    const logs = selected ? await prisma.dailyLog.findMany({
      where: { studentId: student.id, applicationId: selected.id }, orderBy: { logDate: 'desc' }
    }) : [];
    res.json({ student: { ...student, applications: selected ? [selected] : [] }, ...logSummary(logs), activePlacement });
  } catch (error) { handleRouteError(res, error, 'Failed to fetch logbook.'); }
});

router.post('/', authenticate, authorize([Role.STUDENT]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.userId } });
    if (!student) throw new HttpError(404, 'Student profile not found.');
    const { id, logDate, weekNumber, hoursWorked, workModality, supervisorName, tasksDone, problemsAndSolutions, learnings, attachmentUrl } = req.body;
    const { date, isBackdated } = workDate(logDate);
    const hours = hoursWorked === undefined ? 8 : Number(hoursWorked);
    const week = weekNumber === undefined ? 1 : Number(weekNumber);
    if (!Number.isFinite(hours) || hours < 1 || hours > 12 || !Number.isInteger(week) || week < 1) throw new HttpError(400, 'Hours must be 1–12 and week number must be a positive integer.');
    if (workModality && !['ON_SITE', 'REMOTE', 'HYBRID'].includes(workModality)) throw new HttpError(400, 'Invalid work modality.');
    if ([tasksDone, learnings, supervisorName, problemsAndSolutions, attachmentUrl].some(value => value != null && typeof value !== 'string')) throw new HttpError(400, 'Invalid logbook fields.');
    let tasks;
    try { tasks = JSON.parse(tasksDone || '[]'); } catch { throw new HttpError(400, 'Tasks must be a list.'); }
    if (!Array.isArray(tasks) || !tasks.length || tasks.some(task => typeof task !== 'string' || !task.trim())) throw new HttpError(400, 'At least one completed task is required.');
    const result = await withStudentLock(student.id, async tx => {
      const active = await tx.application.findFirst({ where: { studentId: student.id, status: { in: activeStatuses } } });
      if (!active) throw new HttpError(403, 'An active committed placement is required.');
      if (id) {
        const existing = await tx.dailyLog.findFirst({ where: { id, studentId: student.id, applicationId: active.id } });
        if (!existing) throw new HttpError(404, 'Log entry not found.');
        if (existing.mentorApproved) throw new HttpError(409, 'Approved logs cannot be edited.');
        await retainLogbookAttachments(tx, existing);
      }
      // Legacy records may contain a time of day. Exact timestamp uniqueness alone
      // does not prevent a second entry for that same calendar date.
      const duplicate = await tx.dailyLog.findFirst({ where: {
        studentId: student.id, ...(id ? { id: { not: id } } : {}),
        logDate: { gte: date, lt: new Date(date.getTime() + 86400000) }
      } });
      if (duplicate) throw new HttpError(409, 'A daily log already exists for this work date.');
      const safeAttachments = await validateAttachments(tx, attachmentUrl, req.user!.userId, active.id);
      const data = { logDate: date, weekNumber: week, hoursWorked: hours, workModality: workModality || 'ON_SITE', supervisorName: supervisorName || null, tasksDone, problemsAndSolutions: problemsAndSolutions || null, learnings: learnings || '', attachmentUrl: safeAttachments, isBackdated };
      if (id) {
        // Enforce the approval condition in the write as well as the check.
        const updated = await tx.dailyLog.updateMany({ where: { id, studentId: student.id, applicationId: active.id, mentorApproved: false }, data });
        if (!updated.count) throw new HttpError(409, 'This log has already been approved.');
        return tx.dailyLog.findUnique({ where: { id } });
      }
      return tx.dailyLog.create({ data: { ...data, studentId: student.id, applicationId: active.id } });
    });
    res.status(id ? 200 : 201).json(result);
  } catch (error) { handleRouteError(res, error, 'Failed to save daily log.'); }
});

router.delete('/:id', authenticate, authorize([Role.STUDENT]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.userId } });
    if (!student) throw new HttpError(404, 'Student profile not found.');
    const id = req.params.id as string;
    await withStudentLock(student.id, async tx => {
      const existing = await tx.dailyLog.findFirst({ where: { id, studentId: student.id } });
      if (!existing) throw new HttpError(404, 'Log entry not found.');
      if (existing.mentorApproved) throw new HttpError(409, 'Approved logs cannot be deleted.');
      const active = await tx.application.findFirst({ where: { id: existing.applicationId || '', studentId: student.id, status: { in: activeStatuses } } });
      if (!active) throw new HttpError(409, 'Archived placement logs are read-only.');
      await retainLogbookAttachments(tx, existing);
      await tx.dailyLog.deleteMany({ where: { id, studentId: student.id, mentorApproved: false } });
    });
    res.json({ message: 'Daily log deleted successfully.' });
  } catch (error) { handleRouteError(res, error, 'Failed to delete daily log.'); }
});

router.get('/student/:studentId', authenticate, authorize([Role.COMPANY_HR]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.params.studentId as string;
    const applicationId = typeof req.query.applicationId === 'string' ? req.query.applicationId : undefined;
    const placement = await companyPlacement(req.user!.userId, studentId, applicationId);
    const student = await prisma.studentProfile.findUnique({ where: { id: studentId }, include: { user: { select: { name: true, email: true, avatarUrl: true } } } });
    const logs = await prisma.dailyLog.findMany({ where: { studentId, applicationId: placement.id }, orderBy: { logDate: 'desc' } });
    res.json({ student, applicationId: placement.id, ...logSummary(logs) });
  } catch (error) { handleRouteError(res, error, 'Failed to fetch student logs.'); }
});

const approveSingleLog = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const log = await prisma.dailyLog.findUnique({ where: { id } });
    if (!log?.applicationId) throw new HttpError(404, 'Log entry not found.');
    const mentorRating = rating(req.body.mentorRating, true);
    if (req.body.mentorFeedback != null && typeof req.body.mentorFeedback !== 'string') throw new HttpError(400, 'Invalid feedback.');
    const updated = await withStudentLock(log.studentId, async tx => {
      const placement = await tx.application.findFirst({ where: { id: log.applicationId!, studentId: log.studentId, status: { in: activeStatuses }, jobPost: { company: { userId: req.user!.userId } } } });
      if (!placement) throw new HttpError(403, 'This log is not assigned to your company.');
      const changed = await tx.dailyLog.updateMany({ where: { id, mentorApproved: false }, data: { mentorApproved: true, mentorRating, mentorFeedback: req.body.mentorFeedback?.trim() || null } });
      if (!changed.count) throw new HttpError(409, 'This log has already been approved.');
      await notifyApplication(tx, placement.id, 'student', 'LOG_APPROVED', 'บันทึกการฝึกงานได้รับอนุมัติ / Your logbook entry was approved.');
      return tx.dailyLog.findUniqueOrThrow({ where: { id } });
    });
    res.json(updated);
  } catch (error) { handleRouteError(res, error, 'Failed to approve daily log.'); }
};

router.put('/:id/approve', authenticate, authorize([Role.COMPANY_HR]), approveSingleLog);
router.post('/:id/approve', authenticate, authorize([Role.COMPANY_HR]), approveSingleLog);
router.post('/approve/:id', authenticate, authorize([Role.COMPANY_HR]), approveSingleLog);

router.post('/batch-approve', authenticate, authorize([Role.COMPANY_HR]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId, applicationId, weekNumber, mentorFeedback } = req.body;
    const week = Number(weekNumber);
    if (typeof studentId !== 'string' || !Number.isInteger(week) || week < 1) throw new HttpError(400, 'Student and a valid week number are required.');
    const mentorRating = rating(req.body.mentorRating, true);
    if (mentorFeedback != null && typeof mentorFeedback !== 'string') throw new HttpError(400, 'Invalid feedback.');
    const result = await withStudentLock(studentId, async tx => {
      const placement = await tx.application.findFirst({ where: { ...(applicationId ? { id: applicationId } : {}), studentId, status: { in: activeStatuses }, jobPost: { company: { userId: req.user!.userId } } } });
      if (!placement) throw new HttpError(403, 'This placement is not assigned to your company.');
      const where = { studentId, applicationId: placement.id, weekNumber: week };
      // Keep earlier individual sign-offs intact when approving remaining days.
      const updated = await tx.dailyLog.updateMany({ where: { ...where, mentorApproved: false }, data: { mentorApproved: true, mentorRating, mentorFeedback: mentorFeedback?.trim() || null } });
      if (updated.count) await notifyApplication(tx, placement.id, 'student', 'LOG_APPROVED', `บันทึกสัปดาห์ที่ ${week} ได้รับอนุมัติ / Week ${week} logbook approved.`);
      return { updatedCount: updated.count, logs: await tx.dailyLog.findMany({ where, orderBy: { logDate: 'asc' } }) };
    });
    res.json({ message: `Week ${week} verified.`, ...result });
  } catch (error) { handleRouteError(res, error, 'Failed to approve week.'); }
});

export default router;
