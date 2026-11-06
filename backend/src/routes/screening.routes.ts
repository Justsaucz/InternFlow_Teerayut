import { Router, Response } from 'express';
import { Prisma, Role } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import prisma from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { HttpError, handleRouteError } from '../lib/workflow';
import { notifyApplication } from '../lib/notifications';
import { aiConfigured, cleanText, documentBytes, hasBrokenText, questions, safeLink, validateReview, Question } from '../lib/screening';

import applicationFlow from './applicationFlow.routes';
import { draftJobQuestionSet, isSummary, contextHash } from '../lib/portfolioSummary';
import { summarizeApplication, readable } from '../lib/summaryService';
const router = Router();
router.use('/jobs',applicationFlow);
router.use(authenticate, authorize([Role.STUDENT, Role.COMPANY_HR]));
const aiLimit = rateLimit({ windowMs: 5 * 60000, limit: 6, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Please wait before running another AI request.' } });
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
async function access(req: AuthRequest, hrOnly = false) {
  if (hrOnly && req.user!.role !== Role.COMPANY_HR) throw new HttpError(403, 'Only company HR can perform this action.');
  const app = await prisma.application.findFirst({ where: { id: req.params.applicationId as string,
    ...(req.user!.role === Role.STUDENT ? { student: { userId: req.user!.userId } } : { jobPost: { company: { userId: req.user!.userId } } }) },
    include: { jobPost: true, student: { select: { id: true, userId: true } } } });
  if (!app) throw new HttpError(404, 'Application not found.');
  return app;
}
router.get('/applications', async (req: AuthRequest, res: Response) => {
  try {
    const applications = await prisma.application.findMany({ where: req.user!.role === Role.STUDENT ? { student: { userId: req.user!.userId } } : { jobPost: { company: { userId: req.user!.userId } } },
      select: { id: true, status: true, jobPost: { select: { title: true, company: { select: { companyName: true } } } }, student: { select: { user: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' } });
    res.json(applications);
  } catch (error) { handleRouteError(res, error, 'Failed to load screening applications.'); }
});
router.get('/:applicationId', async (req: AuthRequest, res: Response) => {
  try {
    const app = await access(req);const hr = req.user!.role === Role.COMPANY_HR;
    const [evidence, assessment, template, reviews] = await Promise.all([
      prisma.evidenceEntry.findMany({ where: { applicationId: app.id }, include: { document: { select: { id: true, title: true, fileUrl: true, mimeType: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.screeningAssessment.findUnique({ where: { applicationId: app.id } }),
      hr ? prisma.screeningTemplate.findUnique({ where: { jobPostId: app.jobPostId } }) : null,
      prisma.portfolioReview.findMany({ where: { applicationId: app.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);
    const safeAssessment = assessment ? { ...assessment,
      questions: hr ? assessment.questions : (assessment.questions as unknown as Question[]).map(({ expectedAnswer, ...q }) => q),
      review: assessment.status === 'REVIEWED' ? assessment.review : null,
    } : null;
    res.json({ application: { id: app.id, jobPostId:app.jobPostId, contextHash:contextHash(app.jobPost), status: app.status, title: app.jobPost.title, requirements: app.jobPost.requirements }, evidence, summaryEligible:evidence.some(e=>e.aiConsent&&e.document&&readable(e.document.mimeType)), assessment: safeAssessment, template, automaticSummary:reviews.find(r=>r.source==='GEMINI_DRAFT'&&isSummary(r.report)&&!hasBrokenText(r.report))?.report||null, reviews:hr?reviews:reviews.filter(r=>r.source==='MANUAL'), aiConfigured: aiConfigured() });
  } catch (error) { handleRouteError(res, error, 'Failed to load screening workspace.'); }
});
router.get('/:applicationId/files/:documentId',async(req:AuthRequest,res:Response)=>{
  try{
    const app=await access(req);const doc=await prisma.document.findFirst({where:{id:req.params.documentId as string,applicationId:app.id,type:'PORTFOLIO_EVIDENCE'}});
    if(!doc)throw new HttpError(404,'Evidence file not found.');
    const file=await documentBytes(doc,false);res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Disposition',`attachment; filename="evidence-${doc.id.replace(/[^a-zA-Z0-9-]/g,'')}"; filename*=UTF-8''${encodeURIComponent(doc.title)}`);res.type(file.mimeType||'application/octet-stream').send(file.bytes);
  }catch(error){handleRouteError(res,error,'Failed to download evidence.');}
});
router.post('/:applicationId/evidence', authorize([Role.STUDENT]), async (req: AuthRequest, res: Response) => {
  try {
    const app = await access(req);
    if (['REJECTED','CANCELLED'].includes(app.status)) throw new HttpError(409, 'This application is closed. Existing evidence remains available.');
    const { title, summary, contribution, skills, evidenceDate, linkUrl, documentId, previousId, aiConsent } = req.body;
    if (!Array.isArray(skills) || skills.length < 1 || skills.length > 15) throw new HttpError(400, 'Add 1–15 skill labels.');
    const skillList = [...new Set(skills.map(s => cleanText(s,80)))];
    if (typeof evidenceDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(evidenceDate)) throw new HttpError(400, 'Enter a valid evidence date.');
    const date = new Date(evidenceDate + 'T00:00:00Z');
    const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok'}).format(new Date());
    if (isNaN(date.getTime()) || date.toISOString().slice(0,10) !== evidenceDate || evidenceDate > today) throw new HttpError(400, 'Evidence date must be today or earlier.');
    let doc = null, fileSha256 = null;
    if (documentId) {
      doc = await prisma.document.findFirst({ where: { id: cleanText(documentId,100), userId: req.user!.userId, applicationId: app.id, type: 'PORTFOLIO_EVIDENCE' } });
      if (!doc) throw new HttpError(400, 'Select an evidence file uploaded for this application.');
      if (doc.mimeType && ['application/pdf','image/png','image/jpeg','image/webp'].includes(doc.mimeType)) fileSha256 = (await documentBytes(doc)).sha256;
    }
    const data = { title: cleanText(title,160), summary: cleanText(summary,6000), contribution: cleanText(contribution,3000), skills: skillList,
      evidenceDate: date, linkUrl: safeLink(linkUrl), documentId: doc?.id || null, fileSha256, aiConsent: aiConsent === true };
    const entry = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Application" WHERE id = ${app.id} FOR UPDATE`;
      const current = await tx.application.findUnique({ where: { id: app.id } });
      if (!current || ['REJECTED','CANCELLED'].includes(current.status)) throw new HttpError(409, 'This application is now closed.');
      const old = previousId ? await tx.evidenceEntry.findFirst({ where: { id: cleanText(previousId,100), applicationId: app.id } }) : null;
      if (previousId && !old) throw new HttpError(400, 'Previous evidence version not found.');
      if (old && await tx.evidenceEntry.findFirst({ where: { previousId: old.id } })) throw new HttpError(409, 'A newer version exists. Refresh and edit the latest version.');
      const created = await tx.evidenceEntry.create({ data: { ...data, applicationId: app.id, createdBy: req.user!.userId, projectKey: old?.projectKey || randomUUID(), previousId: old?.id || null, version: old ? old.version+1 : 1 } });
      await notifyApplication(tx,app.id,'company','EVIDENCE_UPDATED','ผู้สมัครเพิ่มหลักฐานผลงาน / Candidate added portfolio evidence.');
      return created;
    });
    res.status(201).json(entry);
  } catch (error) { handleRouteError(res, error, 'Failed to add portfolio evidence.'); }
});
router.post('/:applicationId/portfolio-review', async (req: AuthRequest, res: Response) => {
  try {
    const app = await access(req,true);
    const entries = await prisma.evidenceEntry.findMany({ where: { applicationId: app.id }, orderBy: { createdAt: 'desc' } });
    if (!entries.length) throw new HttpError(400, 'Portfolio evidence is required before a review.');
    const report = validateReview(req.body.report,new Set(entries.map(e=>e.id)));
    const review = await prisma.$transaction(async tx => {
      const item = await tx.portfolioReview.create({ data: { applicationId: app.id, source: 'MANUAL', createdBy: req.user!.userId, report: json(report), evidenceSnapshot: json(entries), model: null } });
      await notifyApplication(tx,app.id,'student','PORTFOLIO_REVIEWED','HR ส่งข้อเสนอแนะผลงานแล้ว / HR published portfolio feedback.');return item;
    });res.status(201).json(review);
  } catch (error) { handleRouteError(res, error, 'Failed to save portfolio review.'); }
});
const summaryReadLimit=rateLimit({windowMs:5*60000,limit:60,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Please wait before loading more automatic summaries.'}});
router.post('/:applicationId/portfolio-summary',summaryReadLimit,async(req:AuthRequest,res:Response)=>{
 try{const app=await access(req);res.json(await summarizeApplication(app.id,req.user!.userId,req.body.language==='th'?'Thai':'English'));}
 catch(e){handleRouteError(res,e,'Automatic portfolio summary could not be completed. HR can read the attachments directly.');}
});
// Preserve older API clients without generating the former evaluative report.
router.post('/:applicationId/portfolio-ai',aiLimit,async(req:AuthRequest,res:Response)=>{
 try{const app=await access(req,true);if(req.body.consent!==true)throw new HttpError(400,'Confirm consent.');
 const selected=await prisma.evidenceEntry.findMany({where:{id:{in:Array.isArray(req.body.evidenceIds)?req.body.evidenceIds:[]},applicationId:app.id}});
 if(!selected.length||selected.some(e=>!e.aiConsent))throw new HttpError(403,'Only evidence with student consent may be summarized.');
 res.status(201).json(await summarizeApplication(app.id,req.user!.userId,req.body.language==='th'?'Thai':'English'));}
 catch(e){handleRouteError(res,e,'Automatic portfolio summary failed.');}
});
router.post('/:applicationId/questions-ai',aiLimit,async(req:AuthRequest,res:Response)=>{
 try{const app=await access(req,true);const count=Number(req.body.count||4);if(!Number.isInteger(count)||count<1||count>8)throw new HttpError(400,'Request 1–8 questions.');res.json({...await draftJobQuestionSet(app.jobPost,req.body.language==='th'?'Thai':'English',count,undefined,req.body.guidance),source:'GEMINI_DRAFT'});}
 catch(e){handleRouteError(res,e,'Failed to draft job-context questions.');}
});
router.put('/:applicationId/template',async(req:AuthRequest,res:Response)=>{
  try{
    const app=await access(req,true);const qs=questions(req.body.questions);const title=cleanText(req.body.title,160);
    const template=await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "JobPost" WHERE id = ${app.jobPostId} FOR UPDATE`;
      return tx.screeningTemplate.upsert({where:{jobPostId:app.jobPostId},create:{jobPostId:app.jobPostId,title,questions:json(qs),updatedBy:req.user!.userId},update:{title,questions:json(qs),version:{increment:1},updatedBy:req.user!.userId}});
    });
    res.json(template);
  }catch(error){handleRouteError(res,error,'Failed to save assessment template.');}
});
router.post('/:applicationId/assign',async(req:AuthRequest,res:Response)=>{
  try{
    const app=await access(req,true);
    if(!['PENDING','REVIEWING','INTERVIEW_SCHEDULED'].includes(app.status))throw new HttpError(409,'Assign assessments while this application is in screening.');
    const dueAt=new Date(req.body.dueAt);if(!req.body.dueAt||isNaN(dueAt.getTime())||dueAt.getTime()<=Date.now())throw new HttpError(400,'Choose a future deadline.');
    const template=await prisma.screeningTemplate.findUnique({where:{jobPostId:app.jobPostId}});
    if(!template)throw new HttpError(400,'Save and approve a question template first.');
    const assessment=await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "Application" WHERE id = ${app.id} FOR UPDATE`;
      const current=await tx.application.findUnique({where:{id:app.id}});
      if(!current||!['PENDING','REVIEWING','INTERVIEW_SCHEDULED'].includes(current.status))throw new HttpError(409,'This application is no longer in screening.');
      const created=await tx.screeningAssessment.create({data:{applicationId:app.id,title:template.title,questions:template.questions as Prisma.InputJsonValue,templateVersion:template.version,dueAt,status:'ASSIGNED',assignedBy:req.user!.userId}});
      await notifyApplication(tx,app.id,'student','ASSESSMENT_ASSIGNED','มีแบบทดสอบจาก HR พร้อมวันกำหนดส่ง / HR assigned an assessment with a deadline.');return created;
    });res.status(201).json(assessment);
  }catch(error){handleRouteError(res,error,'Failed to assign assessment.');}
});
router.post('/:applicationId/answers',authorize([Role.STUDENT]),async(req:AuthRequest,res:Response)=>{
  try{
    const app=await access(req);const a=await prisma.screeningAssessment.findUnique({where:{applicationId:app.id}});
    if(!a||a.status!=='ASSIGNED'||a.dueAt<new Date())throw new HttpError(409,'This assessment is not open for submissions.');
    const qs=a.questions as unknown as Question[];const supplied=req.body.answers;
    if(!supplied||typeof supplied!=='object'||Array.isArray(supplied)||Object.keys(supplied).length!==qs.length)throw new HttpError(400,'Answer every question.');
    const answers:Record<string,string>={};for(const q of qs){answers[q.id]=cleanText(supplied[q.id],6000);if(q.type==='CHOICE'&&!q.options.includes(answers[q.id]))throw new HttpError(400,'Choose an available option.');}
    await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "Application" WHERE id = ${app.id} FOR UPDATE`;
      const current=await tx.application.findUnique({where:{id:app.id}});
      if(!current||!['PENDING','REVIEWING','INTERVIEW_SCHEDULED'].includes(current.status))throw new HttpError(409,'This application is no longer in screening.');
      const result=await tx.screeningAssessment.updateMany({where:{id:a.id,status:'ASSIGNED',dueAt:{gt:new Date()}},data:{answers:json(answers),status:'SUBMITTED',submittedAt:new Date()}});
      if(!result.count)throw new HttpError(409,'This assessment was submitted or has expired.');
      await notifyApplication(tx,app.id,'company','ASSESSMENT_SUBMITTED','ผู้สมัครส่งแบบทดสอบแล้ว / Candidate submitted the assessment.');
    });res.json({message:'Assessment submitted. HR will review your answers.'});
  }catch(error){handleRouteError(res,error,'Failed to submit assessment.');}
});
router.post('/:applicationId/assessment-review',async(req:AuthRequest,res:Response)=>{
  try{
    const app=await access(req,true);const a=await prisma.screeningAssessment.findUnique({where:{applicationId:app.id}});
    if(!a||a.status!=='SUBMITTED')throw new HttpError(409,'Only a submitted assessment can be reviewed once.');
    const qs=a.questions as unknown as Question[];const scores=req.body.scores;
    if(!scores||typeof scores!=='object'||Array.isArray(scores)||Object.keys(scores).length!==qs.length)throw new HttpError(400,'Score every question.');
    let total=0;const max=qs.reduce((sum,q)=>sum+q.points,0);const clean:Record<string,number>={};
    for(const q of qs){const score=scores[q.id];if(typeof score!=='number'||!Number.isFinite(score)||score<0||score>q.points)throw new HttpError(400,'Scores must be within each question maximum.');clean[q.id]=score;total+=score;}
    const feedback=cleanText(req.body.feedback,4000);
    await prisma.$transaction(async tx=>{
      const updated=await tx.screeningAssessment.updateMany({where:{id:a.id,status:'SUBMITTED'},data:{status:'REVIEWED',review:json({scores:clean,feedback,total,max,percentage:Math.round(total/max*10000)/100,reviewedBy:req.user!.userId}),reviewedAt:new Date()}});
      if(!updated.count)throw new HttpError(409,'This assessment has already been reviewed.');
      await notifyApplication(tx,app.id,'student','ASSESSMENT_REVIEWED','HR ส่งผลและข้อเสนอแนะการทดสอบแล้ว / HR published assessment feedback.');
    });res.json({message:'Assessment review published.'});
  }catch(error){handleRouteError(res,error,'Failed to review assessment.');}
});
export default router;
