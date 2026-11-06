import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { Role, EvaluationStatus } from '@prisma/client';
import { HttpError, activeStatuses, placementStatuses, targetHours, companyPlacement, withStudentLock, rating, handleRouteError } from '../lib/workflow';

const router = Router();

const getCompanyInternsHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const company = await prisma.companyProfile.findUnique({ where: { userId: req.user!.userId } });
    if (!company) throw new HttpError(404, 'Company profile not found.');
    const applications = await prisma.application.findMany({
      where: { jobPost: { companyProfileId: company.id }, status: { in: activeStatuses } },
      include: { jobPost: true, student: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } }, dailyLogs: { orderBy: { logDate: 'asc' } }, evaluation: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(applications.map(app => ({
      applicationId: app.id, status: app.status, jobTitle: app.jobPost.title,
      student: { ...app.student, dailyLogs: app.dailyLogs },
      totalHours: app.dailyLogs.reduce((sum, log) => sum + log.hoursWorked, 0),
      approvedHours: app.dailyLogs.filter(log => log.mentorApproved).reduce((sum, log) => sum + log.hoursWorked, 0),
      targetHours, evaluation: app.evaluation
    })));
  } catch (error) { handleRouteError(res, error, 'Failed to fetch interns.'); }
};

router.get('/company', authenticate, authorize([Role.COMPANY_HR]), getCompanyInternsHandler);
router.get('/company/interns', authenticate, authorize([Role.COMPANY_HR]), getCompanyInternsHandler);

router.post('/submit', authenticate, authorize([Role.COMPANY_HR]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId, applicationId, feedback } = req.body;
    if ((!studentId && !applicationId) || (studentId != null && typeof studentId !== 'string') || (applicationId != null && typeof applicationId !== 'string') || (typeof feedback !== 'string' || !feedback.trim())) throw new HttpError(400, 'A valid student or application and feedback are required.');
    const company = await prisma.companyProfile.findUnique({ where: { userId: req.user!.userId } });
    if (!company) throw new HttpError(404, 'Company profile not found.');
    const app = await prisma.application.findFirst({ where: {
      ...(applicationId ? { id: applicationId } : {}), ...(studentId ? { studentId } : {}),
      jobPost: { companyProfileId: company.id }, status: { in: activeStatuses }
    }, orderBy: { updatedAt: 'desc' } });
    if (!app) throw new HttpError(403, 'You can only evaluate your own committed interns.');
    const scores = { workQualityScore: rating(req.body.workQualityScore)!, punctualityScore: rating(req.body.punctualityScore)!, teamworkScore: rating(req.body.teamworkScore)! };
    const evaluation = await withStudentLock(app.studentId, async tx => {
      const current = await tx.application.findFirst({ where: { id: app.id, studentId: app.studentId, jobPost: { companyProfileId: company.id }, status: { in: activeStatuses } } });
      if (!current) throw new HttpError(409, 'This placement is no longer active.');
      return tx.internshipEvaluation.upsert({
        where: { applicationId: app.id },
        create: { ...scores, feedback: feedback.trim(), applicationId: app.id, studentId: app.studentId, companyId: company.id, status: EvaluationStatus.COMPANY_EVALUATED },
        update: { ...scores, feedback: feedback.trim(), status: EvaluationStatus.COMPANY_EVALUATED }
      });
    });
    res.json(evaluation);
  } catch (error) { handleRouteError(res, error, 'Failed to submit evaluation.'); }
});

router.get('/report/:studentId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.params.studentId as string;
    const requestedId = typeof req.query.applicationId === 'string' ? req.query.applicationId : undefined;
    let placement;
    if (req.user!.role === Role.STUDENT) {
      const own = await prisma.studentProfile.findFirst({ where: { id: studentId, userId: req.user!.userId } });
      if (!own) throw new HttpError(403, 'You can only view your own report.');
      placement = await prisma.application.findFirst({ where: { ...(requestedId ? { id: requestedId } : {}), studentId, status: { in: requestedId ? placementStatuses : activeStatuses } }, orderBy: { updatedAt: 'desc' } });
      if (!placement && !requestedId) placement = await prisma.application.findFirst({ where: { studentId, status: 'CANCELLED' }, orderBy: { updatedAt: 'desc' } });
    } else if (req.user!.role === Role.COMPANY_HR) {
      placement = await companyPlacement(req.user!.userId, studentId, requestedId, true);
    } else { throw new HttpError(403, 'You are not authorized to view this report.'); }
    if (!placement) throw new HttpError(404, 'Student placement not found.');
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId }, include: {
        user: { select: { name: true, email: true } },
        dailyLogs: { where: { applicationId: placement.id }, orderBy: { logDate: 'asc' } },
        evaluations: { where: { applicationId: placement.id }, include: { company: true } },
        applications: { where: { id: placement.id }, include: { jobPost: { include: { company: true } } } }
      }
    });
    if (!student) throw new HttpError(404, 'Student profile not found.');
    const approvedHours = student.dailyLogs.filter(log => log.mentorApproved).reduce((sum, log) => sum + log.hoursWorked, 0);
    res.json({ student, activeApp: student.applications[0], evaluation: student.evaluations[0] || null,
      totalHours: student.dailyLogs.reduce((sum, log) => sum + log.hoursWorked, 0), approvedHours, targetHours,
      dailyLogs: student.dailyLogs, weeklyLogs: student.dailyLogs });
  } catch (error) { handleRouteError(res, error, 'Failed to generate report.'); }
});

export default router;
