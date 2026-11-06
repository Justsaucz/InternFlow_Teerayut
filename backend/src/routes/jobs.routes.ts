import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { Role } from '@prisma/client';
import { HttpError, placementStatuses, handleRouteError } from '../lib/workflow';
import { cleanText, questions } from '../lib/screening';

const router = Router();

// GET all active jobs (For students to search)
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const jobs = await prisma.jobPost.findMany({
      where: { isActive: true },
      include: {
        company: {
          select: { id: true, companyName: true, logoUrl: true, address: true, industry: true, website: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(jobs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET jobs posted by the logged-in company (MUST be before /:id to avoid route conflict)
router.get('/company', authenticate, authorize([Role.COMPANY_HR]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const companyProfile = await prisma.companyProfile.findUnique({ where: { userId } });
    
    if (!companyProfile) {
      res.status(404).json({ error: 'Company profile not found' });
      return;
    }

    const jobs = await prisma.jobPost.findMany({
      where: { companyProfileId: companyProfile.id },
      include: {
        _count: { select: { applications: true } },
        screeningTemplate:{select:{onApply:true}}
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(jobs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET single job details
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const job = await prisma.jobPost.findUnique({
      where: { id },
      include: {
        company: {
          select: { companyName: true, logoUrl: true, address: true, industry: true, website: true, description: true }
        }
      }
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.json(job);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST a new job (For Company HR)
router.post('/', authenticate, authorize([Role.COMPANY_HR]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { 
      title, 
      description, 
      requirements, 
      location, 
      isRemote, 
      positions, 
      allowance,
      workingHours,
      contactEmail,
      contactPhone,
      contactLine,
      applicationLink,
      isActive 
    } = req.body;

    const companyProfile = await prisma.companyProfile.findUnique({ where: { userId } });
    if (!companyProfile) {
      res.status(404).json({ error: 'Company profile not found' });
      return;
    }

    const questionnaire=req.body.questionnaire;
    let template: {title:string;questions:ReturnType<typeof questions>;onApply:boolean}|undefined;
    if(questionnaire!=null){
      if(typeof questionnaire!=='object'||questionnaire.onApply!==true)throw new HttpError(400,'A publishing questionnaire must be required during application.');
      template={title:cleanText(questionnaire.title,160),questions:questions(questionnaire.questions),onApply:true};
    }
    const newJob = await prisma.jobPost.create({
      data: {
        ...(template?{screeningTemplate:{create:{title:template.title,questions:JSON.parse(JSON.stringify(template.questions)),onApply:true,updatedBy:userId!}}}:{}),
        companyProfileId: companyProfile.id,
        title,
        description,
        requirements: requirements || '',
        location,
        isRemote: isRemote ?? false,
        positions: parseInt(positions) || 1,
        allowance: allowance || null,
        workingHours: workingHours || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        contactLine: contactLine || null,
        applicationLink: applicationLink || null,
        isActive: isActive !== undefined ? isActive : true,
      }
    });

    res.status(201).json(newJob);
  } catch (error) {
    handleRouteError(res,error,'Failed to publish job and questionnaire.');
  }
});

// PUT update an existing job (For Company HR)
router.put('/:id', authenticate, authorize([Role.COMPANY_HR]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const id = req.params.id as string;
    const { 
      title, 
      description, 
      requirements, 
      location, 
      isRemote, 
      positions, 
      allowance,
      workingHours,
      contactEmail,
      contactPhone,
      contactLine,
      applicationLink,
      isActive 
    } = req.body;

    const companyProfile = await prisma.companyProfile.findUnique({ where: { userId } });
    if (!companyProfile) {
      res.status(404).json({ error: 'Company profile not found' });
      return;
    }

    const existingJob = await prisma.jobPost.findUnique({ where: { id } });
    if (!existingJob) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    if (existingJob.companyProfileId !== companyProfile.id) {
      res.status(403).json({ error: 'Unauthorized to edit this job' });
      return;
    }

    const updatedJob = await prisma.jobPost.update({
      where: { id },
      data: {
        title,
        description,
        requirements: requirements || '',
        location,
        isRemote: isRemote ?? existingJob.isRemote,
        positions: positions ? parseInt(positions) : existingJob.positions,
        allowance: allowance !== undefined ? allowance : existingJob.allowance,
        workingHours: workingHours !== undefined ? workingHours : existingJob.workingHours,
        contactEmail: contactEmail !== undefined ? contactEmail : existingJob.contactEmail,
        contactPhone: contactPhone !== undefined ? contactPhone : existingJob.contactPhone,
        contactLine: contactLine !== undefined ? contactLine : existingJob.contactLine,
        applicationLink: applicationLink !== undefined ? applicationLink : existingJob.applicationLink,
        isActive: isActive !== undefined ? isActive : existingJob.isActive,
      }
    });

    res.json(updatedJob);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE a job (For Company HR with safe cascade cleanup)
router.delete('/:id', authenticate, authorize([Role.COMPANY_HR]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const id = req.params.id as string;

    const companyProfile = await prisma.companyProfile.findUnique({ where: { userId } });
    if (!companyProfile) {
      res.status(404).json({ error: 'Company profile not found' });
      return;
    }

    const existingJob = await prisma.jobPost.findUnique({ where: { id } });
    if (!existingJob) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    if (existingJob.companyProfileId !== companyProfile.id) {
      res.status(403).json({ error: 'Unauthorized to delete this job' });
      return;
    }

    // Deleting a posting must never erase a placement or its certification history.
    const linkedPlacement = await prisma.application.findFirst({ where: { jobPostId: id, status: { in: placementStatuses } } });
    if (linkedPlacement) throw new HttpError(409, 'This posting has internship records. Close the posting instead of deleting it.');

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "JobPost" WHERE id = ${id} FOR UPDATE`;
      const placement = await tx.application.findFirst({ where: { jobPostId: id, status: { in: placementStatuses } } });
      const history = await tx.dailyLog.findFirst({ where: { application: { jobPostId: id } } });
      const evaluation = await tx.internshipEvaluation.findFirst({ where: { application: { jobPostId: id } } });
      const screening = await tx.application.findFirst({ where: { jobPostId: id, OR: [{ evidenceEntries: { some: {} } }, { screeningAssessment: { isNot: null } }, { portfolioReviews: { some: {} } }] } });
      if (placement || history || evaluation || screening) throw new HttpError(409, 'This posting has internship or screening records. Close the posting instead.');
      // 1. Find all applications for this job
      const applications = await tx.application.findMany({
        where: { jobPostId: id },
        select: { id: true }
      });
      const appIds = applications.map(a => a.id);

      if (appIds.length > 0) {
        // Unbind or cleanup evaluations for these applications
        await tx.internshipEvaluation.deleteMany({
          where: { applicationId: { in: appIds } }
        });

        // Unlink daily logs and weekly logs from these applications (preserve student log history)
        await tx.dailyLog.updateMany({
          where: { applicationId: { in: appIds } },
          data: { applicationId: null }
        });
        await tx.weeklyLog.updateMany({
          where: { applicationId: { in: appIds } },
          data: { applicationId: null }
        });

        // Delete documents linked to these applications
        await tx.document.deleteMany({
          where: { applicationId: { in: appIds } }
        });

        // Delete the applications
        await tx.application.deleteMany({
          where: { id: { in: appIds } }
        });
      }

      // 2. Finally delete the job post
      await tx.jobPost.delete({ where: { id } });
    });

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    handleRouteError(res, error, 'Failed to delete job post.');
  }
});

export default router;
