import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import prisma from './prisma';
import { HttpError } from './workflow';
import { aiConfigured, documentBytes, hasBrokenText } from './screening';
import { contextHash, isSummary, JobContext, PortfolioSummary, summarize } from './portfolioSummary';
const json=(v:unknown)=>JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const inflight=new Map<string,Promise<any>>();
const generationWindows=new Map<string,{count:number;until:number}>();
function reserveGeneration(userId:string){
 const now=Date.now();for(const [id,window] of generationWindows)if(window.until<=now)generationWindows.delete(id);
 const window=generationWindows.get(userId)||{count:0,until:now+5*60000};
 if(window.count>=6)throw new HttpError(429,'Automatic summary capacity reached temporarily. Existing summaries and attachments remain available.');
 window.count++;generationWindows.set(userId,window);
}
export const readable=(mime:string|null)=>!!mime&&['application/pdf','image/png','image/jpeg','image/webp'].includes(mime);
export async function fileSummary(job:JobContext,docs:{id:string;title:string;fileUrl:string;mimeType:string|null}[],language:string){
 const files=await Promise.all(docs.map(d=>documentBytes(d)));
 const reports:PortfolioSummary[]=[];let start=0;
 while(start<docs.length){let end=start,total=0;while(end<docs.length&&end-start<3&&total+files[end]!.bytes.length<=10*1024*1024){total+=files[end]!.bytes.length;end++;}if(end===start)end++;
  reports.push(await summarize(job,docs.slice(start,end).map(d=>({id:d.id,title:d.title})),files.slice(start,end),language));start=end;
 }
 if(!reports.length)throw new HttpError(400,'Attach a PDF or image to summarize.');
 const first=reports[0]!;
 const report=reports.length===1?first:{...first,summary:reports.map(r=>r.summary).join(' ').slice(0,1800),contents:reports.flatMap(r=>r.contents).slice(0,30),requirements:first.requirements.map(r=>{const rows=reports.map(v=>v.requirements.find(x=>x.id===r.id)!);const found=rows.filter(x=>x.status==='FOUND'),partial=rows.filter(x=>x.status==='PARTIAL');const used=found.length?found:partial.length?partial:rows;return {...r,status:found.length?'FOUND' as const:partial.length?'PARTIAL' as const:'NOT_FOUND' as const,detail:[...new Set(used.map(x=>x.detail))].join(' ').slice(0,1500),evidenceIds:[...new Set(used.flatMap(x=>x.evidenceIds))]};}),limitations:[...new Set(reports.flatMap(r=>r.limitations))].slice(0,5)};
 return {report,hashes:Object.fromEntries(docs.map((d,i)=>[d.id,files[i]!.sha256]))};
}
export async function previewSummary(userId:string,job:JobContext&{id:string},docs:{id:string;title:string;fileUrl:string;mimeType:string|null}[],language:string){
 const ordered=[...docs].sort((a,b)=>a.id.localeCompare(b.id));
 const hashes:Record<string,string>={_context:contextHash(job),_language:language};
 for(const d of ordered)hashes[d.id]=(await documentBytes(d)).sha256;
 const cached=await prisma.applicationPreparation.findFirst({where:{userId,jobPostId:job.id,expiresAt:{gt:new Date()},documentIds:{equals:ordered.map(d=>d.id)},hashes:{equals:json(hashes)}},orderBy:{createdAt:'desc'}});
 if(cached&&isSummary(cached.report)&&!hasBrokenText(cached.report))return {preparationId:cached.id,report:cached.report};
 const key=createHash('sha256').update(JSON.stringify([userId,job.id,hashes])).digest('hex');
 if(inflight.has(key))return inflight.get(key)!;
 reserveGeneration(userId);
 const pending=(async()=>{const {report}=await fileSummary(job,ordered,language);const saved=await prisma.applicationPreparation.create({data:{userId,jobPostId:job.id,documentIds:ordered.map(d=>d.id),hashes:json(hashes),report:json(report),contribution:'',skills:'',model:process.env.GEMINI_MODEL||'gemini-3.5-flash-lite',expiresAt:new Date(Date.now()+3600000)}});return {preparationId:saved.id,report};})();
 inflight.set(key,pending);try{return await pending;}finally{inflight.delete(key);}
}
export async function summarizeApplication(applicationId:string,createdBy:string,language:string){
 const app=await prisma.application.findUnique({where:{id:applicationId},include:{jobPost:true,evidenceEntries:{include:{document:true},orderBy:{createdAt:'asc'}}}});
 if(!app)throw new HttpError(404,'Application not found.');
 // Summarize only the latest version of each project. Never share a non-consenting version.
 const latest=[...new Map(app.evidenceEntries.map(e=>[e.projectKey,e])).values()];
 const entries=latest.filter(e=>e.aiConsent&&e.document&&readable(e.document.mimeType)).sort((a,b)=>a.id.localeCompare(b.id));
 if(!entries.length)throw new HttpError(400,'No consenting PDF/image evidence is available for automatic summary.');
 if(entries.length>10)throw new HttpError(400,'Automatic summaries support up to 10 current evidence files.');
 const fingerprint={context:contextHash(app.jobPost),language,entries:[] as {id:string;hash:string}[]};
 for(const e of entries){const f=await documentBytes(e.document!);if(f.sha256!==e.fileSha256)throw new HttpError(409,'An evidence file changed. Ask the applicant to upload a new version.');fingerprint.entries.push({id:e.id,hash:f.sha256});}
 const key=createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex');
 const old=await prisma.portfolioReview.findFirst({where:{applicationId,source:'GEMINI_DRAFT',evidenceSnapshot:{path:['fingerprint'],equals:key}},orderBy:{createdAt:'desc'}});
 if(old&&isSummary(old.report)&&!hasBrokenText(old.report))return old;
 // A summary generated during application may already cover this exact evidence set.
 const candidates=await prisma.portfolioReview.findMany({where:{applicationId,source:'GEMINI_DRAFT'},orderBy:{createdAt:'desc'},take:10});
 const current=candidates.find(r=>{if(!isSummary(r.report)||hasBrokenText(r.report)||r.report.contextHash!==fingerprint.context||r.report.language!==language)return false;const covered=new Set([...r.report.contents.flatMap(c=>c.evidenceIds),...r.report.requirements.flatMap(q=>q.evidenceIds)]);const snapshot=r.evidenceSnapshot as any;const snapIds=Array.isArray(snapshot)?snapshot.map((e:any)=>e.id):snapshot?.entries?.map((e:any)=>e.id)||[];return entries.length===snapIds.length&&entries.every(e=>snapIds.includes(e.id))&&[...covered].every(id=>snapIds.includes(id));});
 if(current)return current;
 if(!aiConfigured())throw new HttpError(503,'Automatic summaries are not configured. HR can read the attachments directly.');
 const flight='application:'+applicationId+':'+key;if(inflight.has(flight))return inflight.get(flight)!;
 reserveGeneration(createdBy);
 const pending=(async()=>{const {report}=await fileSummary(app.jobPost,entries.map(e=>({id:e.id,title:e.document!.title,fileUrl:e.document!.fileUrl,mimeType:e.document!.mimeType})),language);return prisma.portfolioReview.create({data:{applicationId,source:'GEMINI_DRAFT',model:process.env.GEMINI_MODEL||'gemini-3.5-flash-lite',createdBy,report:json(report),evidenceSnapshot:json({fingerprint:key,entries:entries.map(({document,...e})=>e)})}});})();
 inflight.set(flight,pending);try{return await pending;}finally{inflight.delete(flight);}
}
