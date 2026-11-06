import { Router, Response } from 'express';
import { Role } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { HttpError, handleRouteError, withStudentLock } from '../lib/workflow';
import { readinessView } from '../lib/readiness';
import { notifyApplication } from '../lib/notifications';

const router = Router();
router.use(authenticate);
const settings = { id:true, status:true, readinessEnabled:true, readinessStartDate:true, readinessDeadline:true, readinessVersion:true } as const;
router.get('/applications/:id/settings',authorize([Role.COMPANY_HR]),async(req:AuthRequest,res:Response)=>{
 try {
  const app=await prisma.application.findFirst({where:{id:req.params.id as string,jobPost:{company:{userId:req.user!.userId}}},select:settings});
  if(!app)throw new HttpError(404,'Application not found.');res.json(app);
 }catch(e){handleRouteError(res,e,'Failed to fetch individual readiness settings.');}
});
function dates(start:unknown,deadline:unknown) {
 if(typeof start!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(start)||typeof deadline!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(deadline))throw new HttpError(400,'Provide a start date and a confirmation deadline with a timezone.');
 const date=new Date(start+'T00:00:00+07:00'),limit=new Date(deadline);
 if(!Number.isFinite(date.getTime())||!Number.isFinite(limit.getTime())||new Date(date.getTime()+7*3600000).toISOString().slice(0,10)!==start||limit>=date)throw new HttpError(400,'The confirmation deadline must be before the start date.');
 return {readinessStartDate:date,readinessDeadline:limit};
}
router.put('/applications/:id/settings',authorize([Role.COMPANY_HR]),async(req:AuthRequest,res:Response)=>{
 try {
  const {enabled,version}=req.body;
  if(typeof enabled!=='boolean'||!Number.isInteger(version)||version<0)throw new HttpError(400,'Valid enabled and version values are required.');
  const schedule=enabled?dates(req.body.startDate,req.body.deadline):null;
  const app=await prisma.application.findFirst({where:{id:req.params.id as string,jobPost:{company:{userId:req.user!.userId}}},select:{id:true,studentId:true}});
  if(!app)throw new HttpError(404,'Application not found.');
  const result=await withStudentLock(app.studentId,async tx=>{
   await tx.$queryRaw`SELECT id FROM "Application" WHERE id=${app.id} FOR UPDATE`;
   const current=await tx.application.findUniqueOrThrow({where:{id:app.id}});
   if(!['ACCEPTED','COMMITTED'].includes(current.status))throw new HttpError(409,'Set readiness for an offered or confirmed placement only.');
   if(version!==current.readinessVersion)throw new HttpError(409,'These settings changed. Reopen the readiness settings.');
   const changed=current.readinessEnabled!==enabled||Boolean(schedule&&(current.readinessStartDate?.getTime()!==schedule.readinessStartDate.getTime()||current.readinessDeadline?.getTime()!==schedule.readinessDeadline.getTime()));
   const updated=await tx.application.update({where:{id:app.id},data:{readinessEnabled:enabled,...(schedule||{}),...(changed?{readinessVersion:{increment:1}}:{})},select:settings});
   if(changed&&enabled&&current.status==='COMMITTED')await notifyApplication(tx,app.id,'student','READINESS_SCHEDULED','HR กำหนดวันเริ่มงานและกำหนดยืนยันความพร้อมแล้ว / HR set your start date and readiness confirmation deadline.');
   return updated;
  });res.json(result);
 }catch(e){handleRouteError(res,e,'Failed to save individual readiness settings.');}
});
// Legacy job-wide writes are deliberately unavailable: schedules belong to individuals.
router.all('/jobs/:id',authorize([Role.COMPANY_HR]),(_req,res)=>{res.status(410).json({error:'Set start dates and readiness separately for each candidate in Applicants.'});});
async function confirm(req:AuthRequest,res:Response,source:'STUDENT_WEB'|'HR_EMAIL') {
 try {
  if(!Number.isInteger(req.body.version))throw new HttpError(400,'A schedule version is required.');
  const app=await prisma.application.findFirst({where:{id:req.params.id as string,...(source==='STUDENT_WEB'?{student:{userId:req.user!.userId}}:{jobPost:{company:{userId:req.user!.userId}}})},select:{id:true,studentId:true}});
  if(!app)throw new HttpError(404,'Application not found.');
  const result=await withStudentLock(app.studentId,async tx=>{
   await tx.$queryRaw`SELECT id FROM "Application" WHERE id=${app.id} FOR UPDATE`;
   const current=await tx.application.findUniqueOrThrow({where:{id:app.id},include:{readinessConfirmations:true}});
   if(current.status!=='COMMITTED'||!current.readinessEnabled||!current.readinessStartDate||!current.readinessDeadline)throw new HttpError(409,'Readiness tracking is disabled or this placement is not active.');
   if(current.readinessVersion!==req.body.version)throw new HttpError(409,'The schedule changed. Refresh before confirming.');
   if(!current.readinessConfirmations.some(c=>c.scheduleVersion===req.body.version)){
    const confirmation=await tx.readinessConfirmation.create({data:{applicationId:app.id,scheduleVersion:req.body.version,source,confirmedById:req.user!.userId}});
    current.readinessConfirmations.push(confirmation);
    await notifyApplication(tx,app.id,source==='STUDENT_WEB'?'company':'student','READINESS_CONFIRMED',source==='STUDENT_WEB'?'นักศึกษายืนยันความพร้อมผ่านเว็บแล้ว / Student confirmed readiness through the website.':'HR บันทึกว่าได้รับคำยืนยันทางอีเมลแล้ว / HR recorded readiness confirmation received by email.');
   }return readinessView(current);
  });res.json(result);
 }catch(e){handleRouteError(res,e,'Failed to confirm readiness.');}
}
router.post('/applications/:id/confirm',authorize([Role.STUDENT]),(req,res)=>confirm(req,res,'STUDENT_WEB'));
router.post('/applications/:id/confirm-email',authorize([Role.COMPANY_HR]),(req,res)=>confirm(req,res,'HR_EMAIL'));
export default router;
