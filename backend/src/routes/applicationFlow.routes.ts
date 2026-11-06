import { Router, Response } from 'express';
import { Prisma, Role } from '@prisma/client';
import { rateLimit } from 'express-rate-limit';
import prisma from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { HttpError, handleRouteError } from '../lib/workflow';
import { aiConfigured, cleanText, questions, Question } from '../lib/screening';
import { draftJobQuestionSet } from '../lib/portfolioSummary';
import { previewSummary, readable } from '../lib/summaryService';

const router = Router();
router.use(authenticate);
const aiLimit = rateLimit({windowMs:5*60000,limit:6,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Please wait before running another AI request.'}});
const json=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
async function ownedJob(req:AuthRequest){
 const job=await prisma.jobPost.findFirst({where:{id:req.params.jobId as string,company:{userId:req.user!.userId}}});
 if(!job)throw new HttpError(404,'Job not found.');return job;
}
router.get('/questionnaire-draft/config',authorize([Role.COMPANY_HR]),(_req,res)=>{res.json({aiConfigured:aiConfigured()});});
router.post('/questionnaire-draft',authorize([Role.COMPANY_HR]),aiLimit,async(req:AuthRequest,res:Response)=>{
 try{
  const job={title:cleanText(req.body.job?.title,200),description:cleanText(req.body.job?.description,20000),requirements:cleanText(req.body.job?.requirements,20000)};
  res.json(await draftJobQuestionSet(job,req.body.language==='th'?'Thai':'English',4,undefined,req.body.guidance));
 }catch(e){handleRouteError(res,e,'Failed to draft questions before publication.');}
});
router.get('/:jobId/application-form' ,authorize([Role.STUDENT]),async(req:AuthRequest,res:Response)=>{
 try{
  const job=await prisma.jobPost.findFirst({where:{id:req.params.jobId as string,isActive:true},include:{screeningTemplate:true}});
  if(!job)throw new HttpError(404,'This job is no longer accepting applications.');
  const template=job.screeningTemplate;
  res.json({aiConfigured:aiConfigured(),questionnaire:template?.onApply?{title:template.title,version:template.version,questions:(template.questions as unknown as Question[]).map(({expectedAnswer,...q})=>q)}:null});
 }catch(e){handleRouteError(res,e,'Failed to load application form.');}
});
router.get('/:jobId/questionnaire',authorize([Role.COMPANY_HR]),async(req:AuthRequest,res:Response)=>{
 try{const job=await ownedJob(req);res.json({template:await prisma.screeningTemplate.findUnique({where:{jobPostId:job.id}}),aiConfigured:aiConfigured()});}
 catch(e){handleRouteError(res,e,'Failed to load questionnaire settings.');}
});
router.put('/:jobId/questionnaire',authorize([Role.COMPANY_HR]),async(req:AuthRequest,res:Response)=>{
 try{
  const job=await ownedJob(req);
  if(typeof req.body.onApply!=='boolean')throw new HttpError(400,'Choose whether to show the questionnaire during application.');
  const saved=await prisma.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM "JobPost" WHERE id = ${job.id} FOR UPDATE`;
   if(req.body.enabledOnly===true){
    const old=await tx.screeningTemplate.findUnique({where:{jobPostId:job.id}});
    if(!old)throw new HttpError(400,'Save a questionnaire before enabling it.');
    return tx.screeningTemplate.update({where:{id:old.id},data:{onApply:req.body.onApply,version:{increment:1},updatedBy:req.user!.userId}});
   }
   const title=cleanText(req.body.title,160),qs=questions(req.body.questions);
   return tx.screeningTemplate.upsert({where:{jobPostId:job.id},create:{jobPostId:job.id,title,questions:json(qs),onApply:req.body.onApply,updatedBy:req.user!.userId},update:{title,questions:json(qs),onApply:req.body.onApply,version:{increment:1},updatedBy:req.user!.userId}});
  });res.json(saved);
 }catch(e){handleRouteError(res,e,'Failed to save questionnaire.');}
});
router.post('/:jobId/questionnaire-ai',authorize([Role.COMPANY_HR]),aiLimit,async(req:AuthRequest,res:Response)=>{
 try{
  const job=await ownedJob(req);
  res.json(await draftJobQuestionSet(job,req.body.language==='th'?'Thai':'English',4,undefined,req.body.guidance));
 }catch(e){handleRouteError(res,e,'Failed to draft questionnaire.');}
});
export async function applicationDocuments(userId:string,value:unknown){
 if(!Array.isArray(value)||value.length>10||value.some(id=>typeof id!=='string')||new Set(value).size!==value.length)throw new HttpError(400,'Select up to 10 uploaded files.');
 const docs=await prisma.document.findMany({where:{id:{in:value},userId,applicationId:null,type:'PORTFOLIO_EVIDENCE'}});
 if(docs.length!==value.length)throw new HttpError(400,'A file is unavailable or belongs to another application. Please upload it again.');
 return docs;
}
router.post('/:jobId/portfolio-preview',authorize([Role.STUDENT]),aiLimit,async(req:AuthRequest,res:Response)=>{
 try{
  const job=await prisma.jobPost.findFirst({where:{id:req.params.jobId as string,isActive:true}});
  if(!job)throw new HttpError(404,'Job not found.');
  if(req.body.consent!==true)throw new HttpError(400,'Consent is required before sending files to Gemini.');
  const docs=await applicationDocuments(req.user!.userId,req.body.documentIds);
  const supported=docs.filter(d=>readable(d.mimeType));
  if(!supported.length)throw new HttpError(400,'Attach a PDF or image for automatic summary.');
  res.json(await previewSummary(req.user!.userId,job,supported,req.body.language==='th'?'Thai':'English'));
 }catch(e){handleRouteError(res,e,'Portfolio preview failed. You can continue with manual HR review.');}
});
export default router;
