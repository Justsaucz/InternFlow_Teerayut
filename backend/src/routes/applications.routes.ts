import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { Role, ApplicationStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { applicationDocuments } from './applicationFlow.routes';
import { cleanText, documentBytes, safeLink, Question, validateReview, aiConfigured, hasBrokenText } from '../lib/screening';
import { criteria, contextHash, isSummary, validateSummary, remapSummary } from '../lib/portfolioSummary';
import { readable } from '../lib/summaryService';
import { HttpError, activeStatuses, withStudentLock, handleRouteError } from '../lib/workflow';
import { notifyApplication } from '../lib/notifications';

import { readinessView } from '../lib/readiness';

const router = Router();

// POST - Student applies for a job with multi-attachment pinpoint documents & links
router.post('/', authenticate, authorize([Role.STUDENT]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { jobPostId, coverLetter, cvUrl, attachments } = req.body;
    if (typeof jobPostId !== 'string' || (coverLetter != null && typeof coverLetter !== 'string') ||
        (attachments != null && (!Array.isArray(attachments) || attachments.some((att: any) =>
          !att || typeof att.url !== 'string' || (att.title != null && typeof att.title !== 'string'))))) {
      throw new HttpError(400, 'Invalid application data.');
    }

    const student = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!student) {
      res.status(404).json({ error: 'Student profile not found. Please complete your profile first.' });
      return;
    }

    const targetJob = await prisma.jobPost.findUnique({
      where: { id: jobPostId },
      include: { company: { select: { companyName: true } } }
    });
    if (!targetJob || !targetJob.isActive) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    // Check if student already has a COMMITTED placement
    const currentActive = await prisma.application.findFirst({
      where: {
        studentId: student.id,
        status: { in: ['COMMITTED', 'CANCEL_REQUESTED'] }
      },
      include: { jobPost: { include: { company: true } } }
    });
    if (currentActive) {
      res.status(400).json({ 
        error: `You already have an active internship placement at ${currentActive.jobPost.company.companyName}. You cannot apply to new jobs until your current placement is cancelled and approved by the company.` 
      });
      return;
    }

    // 1. Check if student already applied to this specific job
    const existingApplication = await prisma.application.findFirst({
      where: { studentId: student.id, jobPostId }
    });
    if (existingApplication) {
      res.status(400).json({ error: 'You have already applied to this job.' });
      return;
    }

    // 2. Check if student already has an active application with this same company
    const existingCompanyApp = await prisma.application.findFirst({
      where: {
        studentId: student.id,
        jobPost: { companyProfileId: targetJob.companyProfileId },
        status: { in: ['PENDING', 'REVIEWING', 'INTERVIEW_SCHEDULED', 'ACCEPTED'] }
      },
      include: { jobPost: { select: { title: true } } }
    });
    if (existingCompanyApp) {
      res.status(400).json({ 
        error: `You already have an active application (${existingCompanyApp.jobPost.title}) with ${targetJob.company.companyName}. You can only have 1 active application per company at a time.` 
      });
      return;
    }

    const uploaded=await applicationDocuments(userId!,req.body.documentIds??[]);
    const contribution=cleanText(req.body.contribution??'',3000,false);
    const skillText=cleanText(req.body.skills??'',1000,false);
    const skills=[...new Set(skillText.split(',').map(s=>s.trim()).filter(Boolean))];
    if(skills.length>15||skills.some(s=>s.length>80))throw new HttpError(400,'Use up to 15 skills of 80 characters each.');
    if(coverLetter && coverLetter.length>6000)throw new HttpError(400,'Cover letter must be within 6000 characters.');
    if((attachments?.length||0)>10)throw new HttpError(400,'Use up to 10 links.');
    const safeAttachments=(attachments||[]).map((a:any)=>({...a,url:a.url.startsWith('/uploads/')?a.url:safeLink(a.url)}));
    const hashes:Record<string,string>={};
    for(const doc of uploaded)hashes[doc.id]=(await documentBytes(doc,false)).sha256;
    const preparation=req.body.preparationId?await prisma.applicationPreparation.findFirst({where:{id:cleanText(req.body.preparationId,100),userId:userId!,jobPostId,expiresAt:{gt:new Date()}}}):null;
    const modern=preparation&&isSummary(preparation.report)?preparation.report:null;
    const aiIds=uploaded.filter(d=>readable(d.mimeType)).map(d=>d.id);
    if(req.body.preparationId&&(!preparation||req.body.aiConsent!==true||
      (modern?preparation.documentIds.length!==aiIds.length||preparation.documentIds.some(id=>!aiIds.includes(id))||modern.contextHash!==contextHash(targetJob):preparation.contribution!==contribution||preparation.skills!==skillText||preparation.documentIds.length!==uploaded.length)||
      preparation.documentIds.some(id=>(preparation.hashes as Record<string,string>)[id]!==hashes[id])))throw new HttpError(409,'The automatic summary no longer matches your files or this job. Wait for the updated summary or continue without AI.');

    // Create the application, evidence and optional answers atomically.
    const application = await withStudentLock(student.id, async (tx) => {
      const active = await tx.application.findFirst({ where: { studentId: student.id, status: { in: activeStatuses } } });
      if (active) throw new HttpError(409, 'You already have an active placement.');
      const job = await tx.jobPost.findUnique({ where: { id: jobPostId } });
      if (!job?.isActive) throw new HttpError(409, 'This job is no longer accepting applications.');
      // Serialize questionnaire edits with the final submit, including disabled -> enabled.
      await tx.$queryRaw`SELECT id FROM "JobPost" WHERE id = ${job.id} FOR UPDATE`;
      const template=await tx.screeningTemplate.findUnique({where:{jobPostId:job.id}});
      const questionnaire=req.body.questionnaire;
      const questionnaireAnswers:Record<string,string>={};
      if(template?.onApply){
        if(!questionnaire||questionnaire.version!==template.version)throw new HttpError(409,'The company questionnaire changed. Reload the application form and answer the current questions.');
        const qs=template.questions as unknown as Question[];
        if(!questionnaire.answers||typeof questionnaire.answers!=='object'||Array.isArray(questionnaire.answers)||Object.keys(questionnaire.answers).length!==qs.length)throw new HttpError(400,'Answer every company question before applying.');
        for(const q of qs){const answer=cleanText(questionnaire.answers[q.id],6000);if(q.type==='CHOICE'&&!q.options.includes(answer))throw new HttpError(400,'Choose an available answer option.');questionnaireAnswers[q.id]=answer;}
      }else if(questionnaire)throw new HttpError(409,'The company removed this questionnaire. Reload the application form before submitting.');
      const companyApp = await tx.application.findFirst({ where: {
        studentId: student.id, jobPost: { companyProfileId: job.companyProfileId },
        status: { in: ['PENDING', 'REVIEWING', 'INTERVIEW_SCHEDULED', 'ACCEPTED'] }
      } });
      if (companyApp) throw new HttpError(409, 'You already have an active application with this company.');
      const app = await tx.application.create({
        data: {
          jobPostId,
          studentId: student.id,
          coverLetter: coverLetter || null,
        }
      });

      if (safeAttachments.length > 0 && userId) {
        for (const att of safeAttachments) {
          if (att.url && typeof att.url === 'string' && att.url.trim().length > 0) {
            const title = att.title && att.title.trim() ? att.title.trim() : 'Document';
            const isCV = title.toLowerCase().includes('cv') || title.toLowerCase().includes('resume');
            await tx.document.create({
              data: {
                userId,
                applicationId: app.id,
                title,
                fileUrl: att.url.trim(),
                type: isCV ? 'CV' : 'REPORT'
              }
            });
          }
        }
      } else if (cvUrl && userId) {
        await tx.document.create({
          data: {
            userId: userId,
            applicationId: app.id,
            title: 'Resume/CV',
            fileUrl: cvUrl,
            type: 'CV'
          }
        });
      }

      const evidence=[];
      const idMap:Record<string,string>={};
      for(const doc of uploaded){
        const linked=await tx.document.updateMany({where:{id:doc.id,userId:userId!,applicationId:null},data:{applicationId:app.id}});
        if(linked.count!==1)throw new HttpError(409,'This file was used by another application. Upload it again.');
        const entry=await tx.evidenceEntry.create({data:{applicationId:app.id,projectKey:randomUUID(),title:doc.title.slice(0,160),summary:coverLetter?.trim()||'File attached during application. See the artifact for supporting evidence.',contribution:contribution||'Not specified by the applicant; HR should confirm the individual contribution.',skills,evidenceDate:new Date(),documentId:doc.id,fileSha256:hashes[doc.id]!,aiConsent:req.body.aiConsent===true,createdBy:userId!}});
        evidence.push(entry);idMap[doc.id]=entry.id;
      }
      if(preparation){
        const report=isSummary(preparation.report)?validateSummary(preparation.report,new Set(preparation.documentIds),criteria(targetJob),targetJob,preparation.report.language):validateReview(preparation.report,new Set(preparation.documentIds));
        const mapped=isSummary(report)?remapSummary(report,idMap):{...report,skills:report.skills.map((s:any)=>({...s,evidenceIds:s.evidenceIds.map((id:string)=>idMap[id])}))};
        await tx.portfolioReview.create({data:{applicationId:app.id,source:'GEMINI_DRAFT',model:preparation.model,createdBy:userId!,report:JSON.parse(JSON.stringify(mapped)),evidenceSnapshot:JSON.parse(JSON.stringify(evidence.filter(e=>preparation.documentIds.includes(e.documentId!))))}});
        await tx.applicationPreparation.delete({where:{id:preparation.id}});
      }
      if(template?.onApply){
        await tx.screeningAssessment.create({data:{applicationId:app.id,title:template.title,questions:template.questions as Prisma.InputJsonValue,templateVersion:template.version,status:'SUBMITTED',answers:questionnaireAnswers,assignedBy:template.updatedBy,dueAt:new Date(),submittedAt:new Date()}});
        await notifyApplication(tx,app.id,'company','ASSESSMENT_SUBMITTED','ผู้สมัครส่งแบบทดสอบพร้อมใบสมัคร / Candidate submitted the questionnaire with their application.');
      }
      await notifyApplication(tx, app.id, 'company', 'APPLICATION_NEW', 'มีใบสมัครใหม่ / A candidate submitted an application.');
      return app;
    });

    res.status(201).json({ message: 'Application submitted successfully', application });
  } catch (error) {
    handleRouteError(res, error, 'Failed to submit application.');
  }
});

// GET - Student views their own applications
router.get('/my', authenticate, authorize([Role.STUDENT]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const student = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!student) {
      res.status(404).json({ error: 'Student profile not found' });
      return;
    }

    const applications = await prisma.application.findMany({
      where: { studentId: student.id },
      include: {
        readinessConfirmations:true,
        documents: { where: { type: { notIn: ['PORTFOLIO_EVIDENCE','LOGBOOK_ATTACHMENT'] } } },
        jobPost: {
          include: {
            company: { select: { id: true, companyName: true, logoUrl: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(applications.map(({readinessConfirmations,...app})=>({...app,readiness:readinessView({...app,readinessConfirmations})})));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET - Company HR views applicants for their jobs
router.get('/company', authenticate, authorize([Role.COMPANY_HR]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const company = await prisma.companyProfile.findUnique({ where: { userId } });
    if (!company) {
      res.status(404).json({ error: 'Company profile not found' });
      return;
    }

    const applications = await prisma.application.findMany({
      where: {
        jobPost: { companyProfileId: company.id }
      },
      include: {
        jobPost: { select: { id:true, title: true, description:true, requirements:true, readinessEnabled:true, readinessDeadline:true, readinessVersion:true, startDate:true } },
        evidenceEntries:{select:{id:true,createdAt:true,aiConsent:true,document:{select:{mimeType:true}}},orderBy:{createdAt:'desc'}},
        screeningAssessment:{select:{status:true,review:true}},
        portfolioReviews:{select:{source:true,report:true,createdAt:true},orderBy:{createdAt:'desc'},take:20},
        readinessConfirmations:true,
        documents: { where: { type: { notIn: ['PORTFOLIO_EVIDENCE','LOGBOOK_ATTACHMENT'] } } },
        student: {
          include: {
            user: { select: { name: true, email: true, avatarUrl: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(applications.map(({evidenceEntries,screeningAssessment,portfolioReviews,readinessConfirmations,...app})=>{
      const ai=portfolioReviews.find(r=>r.source==='GEMINI_DRAFT'&&isSummary(r.report)&&!hasBrokenText(r.report));
      const manual=portfolioReviews.find(r=>r.source==='MANUAL');
      const newest=evidenceEntries[0]?.createdAt;
      const manualCurrent=Boolean(manual&&(!newest||manual.createdAt>=newest));
      const report=ai?.report as any;
      const review=screeningAssessment?.review as any;
      const contextCurrent=Boolean(ai&&isSummary(ai.report)&&ai.report.contextHash===contextHash(app.jobPost));
      return {...app,readiness:readinessView({...app,readinessConfirmations}),jobPost:{id:app.jobPost.id,title:app.jobPost.title},screeningSummary:{evidenceCount:evidenceEntries.length,aiSummary:report?.summary||null,aiContents:report?.contents||[],aiMissingRequirements:(report?.requirements||[]).filter((q:any)=>q.status!=='FOUND'),summaryKey:(newest?.toISOString()||'')+contextHash(app.jobPost),summaryEligible:aiConfigured()&&evidenceEntries.some(e=>e.aiConsent&&e.document&&readable(e.document.mimeType)),aiCurrent:Boolean(ai&&contextCurrent&&(!newest||ai.createdAt>=newest)),manualCurrent,assessmentStatus:screeningAssessment?.status||null,percentage:screeningAssessment?.status==='REVIEWED'?review?.percentage??null:null,needsReview:['PENDING','REVIEWING','INTERVIEW_SCHEDULED'].includes(app.status)&&(screeningAssessment?.status==='SUBMITTED'||app.status==='PENDING')}};
    }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH - Company HR advances only applications owned by their company.
router.patch('/:id/status', authenticate, authorize([Role.COMPANY_HR]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    const transitions: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
      PENDING: ['REVIEWING', 'INTERVIEW_SCHEDULED', 'ACCEPTED', 'REJECTED'],
      REVIEWING: ['INTERVIEW_SCHEDULED', 'ACCEPTED', 'REJECTED'],
      INTERVIEW_SCHEDULED: ['ACCEPTED', 'REJECTED'],
      ACCEPTED: ['REJECTED']
    };
    if (!['REVIEWING', 'INTERVIEW_SCHEDULED', 'ACCEPTED', 'REJECTED'].includes(status)) throw new HttpError(400, 'Invalid application status.');
    const owned = await prisma.application.findFirst({ where: { id, jobPost: { company: { userId: req.user!.userId } } } });
    if (!owned) throw new HttpError(404, 'Application not found.');
    const application = await withStudentLock(owned.studentId, async tx => {
      const current = await tx.application.findUnique({ where: { id } });
      if (!current) throw new HttpError(404, 'Application not found.');
      if (!transitions[current.status]?.includes(status)) throw new HttpError(409, 'This application can no longer make that status change.');
      if (status !== 'REJECTED') {
        const active = await tx.application.findFirst({ where: { studentId: current.studentId, status: { in: activeStatuses } } });
        if (active) throw new HttpError(409, 'This student already has an active placement.');
      }
      const changed = await tx.application.update({ where: { id }, data: { status } });
      await notifyApplication(tx, id, 'student', 'APPLICATION_STATUS', `สถานะใบสมัคร / Application status: ${status}`);
      return changed;
    });
    res.json(application);
  } catch (error) { handleRouteError(res, error, 'Failed to update application.'); }
});

// PATCH - Student commits to ONE accepted offer (Accept Offer & Start Internship)
router.patch('/:id/commit', authenticate, authorize([Role.STUDENT]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;

    const student = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!student) {
      res.status(404).json({ error: 'Student profile not found' });
      return;
    }

    const targetApp = await prisma.application.findUnique({
      where: { id },
      include: { jobPost: { include: { company: true } } }
    });

    if (!targetApp || targetApp.studentId !== student.id) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    if (targetApp.status !== 'ACCEPTED') {
      res.status(400).json({ error: 'You can only commit to an application that has been accepted by the company.' });
      return;
    }

    // Check if student already has a COMMITTED or CANCEL_REQUESTED placement
    const existingActive = await prisma.application.findFirst({
      where: {
        studentId: student.id,
        status: { in: ['COMMITTED', 'CANCEL_REQUESTED'] }
      },
      include: { jobPost: { include: { company: true } } }
    });

    if (existingActive) {
      res.status(400).json({
        error: `You are already committed to an internship at ${existingActive.jobPost.company.companyName}. You cannot commit to another company until your current placement is cancelled and approved by the company.`
      });
      return;
    }

    // Execute in transaction: Commit this application, auto-decline/close all others
    const committedApp = await withStudentLock(student.id, async (tx) => {
      const target = await tx.application.findFirst({ where: { id, studentId: student.id }, include: { jobPost: true } });
      if (!target || target.status !== 'ACCEPTED') throw new HttpError(409, 'This offer is no longer available.');
      await tx.$queryRaw`SELECT id FROM "JobPost" WHERE id = ${target.jobPostId} FOR UPDATE`;
      const active = await tx.application.findFirst({ where: { studentId: student.id, status: { in: activeStatuses } } });
      if (active) throw new HttpError(409, 'You already have an active placement.');
      // 1. Commit target
      const updated = await tx.application.update({
        where: { id },
        data: { status: 'COMMITTED' },
        include: { jobPost: { include: { company: true } } }
      });

      await notifyApplication(tx, id, 'both', 'PLACEMENT_COMMITTED', 'ยืนยันที่ฝึกงานแล้ว / Internship placement confirmed.');
      const competing = await tx.application.findMany({ where: { studentId: student.id, id: { not: id }, status: { in: ['ACCEPTED', 'PENDING', 'REVIEWING', 'INTERVIEW_SCHEDULED'] } }, select: { id: true } });
      for (const other of competing) await notifyApplication(tx, other.id, 'company', 'APPLICATION_CLOSED', 'ผู้สมัครยืนยันที่ฝึกงานอื่นแล้ว / Candidate committed to another placement.');
      // 2. Auto-close all other applications for this student
      await tx.application.updateMany({
        where: {
          studentId: student.id,
          id: { not: id },
          status: { in: ['ACCEPTED', 'PENDING', 'REVIEWING', 'INTERVIEW_SCHEDULED'] }
        },
        data: {
          status: 'REJECTED',
          cancellationReason: 'Student confirmed and committed to another company offer'
        }
      });

      return updated;
    });

    res.json({
      message: `Successfully confirmed placement at ${committedApp.jobPost.company.companyName}!`,
      application: committedApp
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to confirm placement.');
  }
});

// PATCH - Student requests cancellation of committed internship
router.patch('/:id/request-cancel', authenticate, authorize([Role.STUDENT]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      res.status(400).json({ error: 'Please provide a clear reason for requesting cancellation.' });
      return;
    }

    const student = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!student) {
      res.status(404).json({ error: 'Student profile not found' });
      return;
    }

    const targetApp = await prisma.application.findUnique({
      where: { id }
    });

    if (!targetApp || targetApp.studentId !== student.id) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    if (targetApp.status !== 'COMMITTED') {
      res.status(400).json({ error: 'Only committed active internships can request cancellation.' });
      return;
    }

    const updated = await withStudentLock(student.id, async tx => {
      const result = await tx.application.updateMany({
        where: { id, studentId: student.id, status: 'COMMITTED' },
        data: { status: 'CANCEL_REQUESTED', cancellationReason: reason.trim() }
      });
      if (!result.count) throw new HttpError(409, 'Placement status has changed. Refresh and try again.');
      await notifyApplication(tx, id, 'company', 'CANCELLATION_REQUESTED', 'มีคำขอยกเลิกที่ฝึกงาน / Candidate requested placement cancellation.');
      return tx.application.findUnique({ where: { id } });
    });

    res.json({
      message: 'Cancellation request submitted. Waiting for company HR to review and confirm.',
      application: updated
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to request cancellation.');
  }
});

// PATCH - Company HR confirms or rejects cancellation request
router.patch('/:id/cancellation-action', authenticate, authorize([Role.COMPANY_HR]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
    const { action } = req.body; // 'APPROVE' or 'REJECT'

    if (!['APPROVE', 'REJECT'].includes(action)) {
      res.status(400).json({ error: 'Invalid action. Must be APPROVE or REJECT.' });
      return;
    }

    const company = await prisma.companyProfile.findUnique({ where: { userId } });
    if (!company) {
      res.status(404).json({ error: 'Company profile not found' });
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: { jobPost: true }
    });

    if (!application || application.jobPost.companyProfileId !== company.id) {
      res.status(403).json({ error: 'Unauthorized to review this application' });
      return;
    }

    if (application.status !== 'CANCEL_REQUESTED') {
      res.status(400).json({ error: 'Application does not have a pending cancellation request.' });
      return;
    }

    const nextStatus: ApplicationStatus = action === 'APPROVE' ? 'CANCELLED' : 'COMMITTED';
    const updated = await withStudentLock(application.studentId, async tx => {
      const result = await tx.application.updateMany({
        where: { id, status: 'CANCEL_REQUESTED', jobPost: { companyProfileId: company.id } },
        data: { status: nextStatus }
      });
      if (!result.count) throw new HttpError(409, 'Cancellation status has changed. Refresh and try again.');
      await notifyApplication(tx, id, 'student', 'CANCELLATION_REVIEWED', `ผลคำขอยกเลิก / Cancellation request: ${action}`);
      return tx.application.findUnique({ where: { id } });
    });

    res.json({
      message: action === 'APPROVE' ? 'Cancellation approved. Student has been released.' : 'Cancellation request rejected. Placement remains active.',
      application: updated
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to review cancellation.');
  }
});

export default router;
