import { createHash } from 'node:crypto';
import { HttpError } from './workflow';
import { cleanText, geminiJson, hasBrokenText, questions, questionSchema, Question } from './screening';

export type JobContext={title:string;description:string;requirements:string};
export type Criterion={id:string;text:string};
export type PortfolioSummary={format:'PORTFOLIO_SUMMARY_V2';summary:string;contents:{title:string;detail:string;evidenceIds:string[]}[];requirements:{id:string;text:string;status:'FOUND'|'PARTIAL'|'NOT_FOUND';detail:string;evidenceIds:string[]}[];limitations:string[];contextHash:string;language:string};
export function criteria(job:JobContext):Criterion[]{
 const source=job.requirements.trim();if(!source)return [];
 let rows=source.split(/[\n;•]+/).map(s=>s.replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim()).filter(Boolean);
 if(rows.length===1&&source.includes(',')&&!/e\.g\.|for example|เช่น/i.test(source))rows=source.split(',').map(s=>s.trim()).filter(Boolean);
 if(rows.length>30)throw new HttpError(400,'Split the role requirements into at most 30 clear items before generating a summary.');
 return [...new Set(rows)].map((text,i)=>({id:`R${i+1}`,text}));
}
export function contextHash(job:JobContext){return createHash('sha256').update(JSON.stringify([job.title,job.description,job.requirements])).digest('hex');}
export function isSummary(value:any):value is PortfolioSummary{return value?.format==='PORTFOLIO_SUMMARY_V2';}
const evidenceRef={type:'ARRAY',items:{type:'STRING'}};
const summarySchema={type:'OBJECT',properties:{summary:{type:'STRING'},contents:{type:'ARRAY',items:{type:'OBJECT',properties:{title:{type:'STRING'},detail:{type:'STRING'},evidenceIds:evidenceRef},required:['title','detail','evidenceIds']}},requirements:{type:'ARRAY',items:{type:'OBJECT',properties:{id:{type:'STRING'},status:{type:'STRING',enum:['FOUND','PARTIAL','NOT_FOUND']},detail:{type:'STRING'},evidenceIds:evidenceRef},required:['id','status','detail','evidenceIds']}},limitations:{type:'ARRAY',items:{type:'STRING'}}},required:['summary','contents','requirements','limitations']};
export function validateSummary(value:any,ids:Set<string>,required:Criterion[],job:JobContext,language:string):PortfolioSummary{
 if(hasBrokenText(value))throw new HttpError(502,'The AI summary contains unreadable characters. Please generate a fresh summary.');
 if(!value||!Array.isArray(value.contents)||value.contents.length>30||!Array.isArray(value.requirements)||value.requirements.length!==required.length||!Array.isArray(value.limitations))throw new HttpError(502,'The summary did not cover the supplied job requirements.');
 const refs=(list:any,needed=false)=>{if(!Array.isArray(list)||list.length>10||list.some((id:any)=>typeof id!=='string'||!ids.has(id))||(needed&&!list.length))throw new HttpError(502,'The summary references an unavailable file.');return [...new Set(list)] as string[];};
 const seen=new Set<string>();
 const requirements=required.map(r=>{
  const rows=value.requirements.filter((v:any)=>v.id===r.id);if(rows.length!==1||seen.has(r.id))throw new HttpError(502,'The summary changed or omitted a job requirement.');seen.add(r.id);const row=rows[0];
  if(!['FOUND','PARTIAL','NOT_FOUND'].includes(row.status))throw new HttpError(502,'Invalid requirement summary.');
  const evidenceIds=refs(row.evidenceIds,row.status!=='NOT_FOUND');
  return {id:r.id,text:r.text,status:row.status,detail:cleanText(row.detail,1500),evidenceIds};
 });
 return {format:'PORTFOLIO_SUMMARY_V2',summary:cleanText(value.summary,1800),contents:value.contents.map((c:any)=>({title:cleanText(c.title,180),detail:cleanText(c.detail,1500),evidenceIds:refs(c.evidenceIds,true)})),requirements,limitations:value.limitations.slice(0,5).map((s:any)=>cleanText(s,800)),contextHash:contextHash(job),language};
}
export async function summarize(job:JobContext,evidence:{id:string;title:string}[],files:{bytes:Buffer;mimeType:string}[],language:string):Promise<PortfolioSummary>{
 const required=criteria(job);
 const result=await geminiJson(`You are a document summarizer, not a recruiter or skill assessor. Return only (1) a short factual inventory of projects, artifacts, tools and activities visibly present in the attached files and (2) a comparison against EVERY supplied role requirement by its exact ID. FOUND means the file explicitly contains relevant material, not that the candidate is competent. PARTIAL means only part of that requirement is documented; state the undocumented part. NOT_FOUND means no relevant material was located in the reviewed files, never that the candidate lacks the skill. Cite only supplied evidence IDs. Distinguish a written claim from a visible artifact. Do not generate scores, match percentages, skill levels, recommendations, hiring suitability, interview questions, follow-up tasks, accept/reject decisions, invented requirements or generic advice. Exclude personal identifiers and grades from the summary. If the file is unreadable, say so; do not reconstruct its contents from its filename. Keep bullets concise and job-related. Answer in the requested language.`,{language,job:{title:job.title,description:job.description},requirements:required,evidence},summarySchema,files);
 return validateSummary(result,new Set(evidence.map(e=>e.id)),required,job,language);
}
export function remapSummary(report:PortfolioSummary,map:Record<string,string>):PortfolioSummary{
 return {...report,contents:report.contents.map(c=>({...c,evidenceIds:c.evidenceIds.map(id=>map[id]!)})),requirements:report.requirements.map(r=>({...r,evidenceIds:r.evidenceIds.map(id=>map[id]!)}))};
}
export function questionContext(job:JobContext){
 const requirements=criteria(job);const description=job.description.split(/[\n•]+/).map(s=>s.trim()).filter(Boolean).slice(0,30).map((text,i)=>({id:`D${i+1}`,text}));
 const anchors=[...requirements,...description];if(!anchors.length)throw new HttpError(400,'Add the actual job responsibilities or requirements before drafting questions.');
 return {job:{title:job.title,description:job.description,requirements:job.requirements},anchors};
}
export function validateAnchoredQuestions(raw:any,anchors:Criterion[],count:number,allowSingleType=false):Question[]{
 if(!Array.isArray(raw)||raw.length!==count)throw new HttpError(502,'AI returned the wrong number of job questions.');
 const qs=questions(raw);
 if(!allowSingleType&&count>=2&&(!qs.some(q=>q.type==='TEXT')||!qs.some(q=>q.type==='TASK')))throw new HttpError(502,'The draft must include an explanation and a practical task, not only multiple-choice questions.');
 return qs.map((q,i)=>{const original=raw[i];const anchor=anchors.find(a=>a.id===original.contextId);if(!anchor||(original.contextQuote!=null&&original.contextQuote!==anchor.text))throw new HttpError(502,'A drafted question was not grounded in the actual job description.');return {...q,contextId:anchor.id,contextQuote:anchor.text};});
}
export type QuestionDraftResult={questions:Question[];requestedCount:number;omittedCount:number;notice:string|null};
type JsonRequester=typeof geminiJson;
const draftSystem=`Draft short, job-related internship assessment questions. Use the complete job and positive source anchors. A role naming a tool supports its normal beginner concepts and standard features; the job does not need to list every feature individually. For example, assess the advertised skills through a small explanation, calculation, debugging exercise or work sample, rather than recognition of the job title or copying its listing. Do not require unrelated technologies, a different profession, advanced production architecture or unpaid commercial work. Use fictional examples. Multiple-choice distractors must be plausible mistakes in the same work activity. Return the exact allowed contextId; the server attaches its source quote. By default include TEXT and TASK among drafts of two or more questions, and at most one CHOICE for four questions. If hrGuidance explicitly requests a different question format or composition, follow that preference when it remains job-related. Treat hrGuidance as HR preferences about focus, difficulty, scenario and format, never permission to invent role requirements, bypass evidence grounding or evaluate applicants. Expected answers for TEXT/TASK must state practical scoring criteria and accept equivalent correct approaches. Use the requested language. This is an editable draft for HR, not a hiring decision.`;
const auditSystem=`Check whether each draft is a usable, job-related INTERN assessment. Inspect prompt, all options and expected answer against the referenced source AND the full job. Accept basic standard concepts and features of a tool/skill named in the job even if each feature is not spelled out. Short or informal job listings do not invalidate a simple relevant question. A fictional example's customer/product names do not change the skill being tested. Reject only a concrete defect: unrelated skill/domain, unsupported specialist prerequisite, wrong/ambiguous answer, implausible cross-domain options, excessive seniority, or mere job-title/listing recognition. Do not reject solely because a relevant intern question is simple, the listing is brief, or the scenario adds small fictional details. Set relevant=false only with a specific actionable reason describing what must change. Return exactly one check per supplied question ID. Consider hrGuidance when checking requested focus and format, but never allow it to replace the actual job context or bypass these checks. A requested all-choice or all-explanation format is allowed. Do not approve by default and do not evaluate applicants.`;
const auditSchema={type:'OBJECT',properties:{checks:{type:'ARRAY',items:{type:'OBJECT',properties:{id:{type:'STRING'},relevant:{type:'BOOLEAN'},reason:{type:'STRING'}},required:['id','relevant','reason']}}},required:['checks']};

export async function draftJobQuestionSet(job:JobContext,language:string,count=4,ask:JsonRequester=geminiJson,guidance:unknown=''):Promise<QuestionDraftResult>{
 if(!Number.isInteger(count)||count<1||count>8)throw new HttpError(400,'Request 1–8 questions.');
 const hrGuidance=cleanText(guidance??'',2000,false);
 const context={...questionContext(job),...(hrGuidance?{hrGuidance}:{})};
 const item=questionSchema.properties.questions.items as any;
 const properties={...item.properties,contextId:{type:'STRING',enum:context.anchors.map(a=>a.id)}};
 const schema={type:'OBJECT',properties:{questions:{type:'ARRAY',items:{type:'OBJECT',properties,required:[...item.required,'contextId']}}},required:['questions']};
 let result=await ask(draftSystem,{...context,language,count},schema);
 let initial:Question[];
 try{initial=validateAnchoredQuestions(result.questions,context.anchors,count,!!hrGuidance);}
 catch(error){
  if(!(error instanceof HttpError)||error.status<400||error.status>=600)throw error;
  // Repair malformed count/type/source output once; provider/auth failures are not retried here.
  result=await ask(draftSystem,{...context,language,count,repairReason:error.message,instruction:'Correct the returned count, source IDs and question format. Honor hrGuidance when supplied; otherwise use the default type mix.'},schema);
  initial=validateAnchoredQuestions(result.questions,context.anchors,count,!!hrGuidance);
 }
 const approved=new Map<string,Question>();
 let pending=initial;
 for(let round=0;round<2&&pending.length;round++){
  let audit:any;
  try{audit=await ask(auditSystem,{...context,questions:pending.map(q=>({id:q.id,prompt:q.prompt,type:q.type,options:q.options,expectedAnswer:q.expectedAnswer,contextId:q.contextId,contextQuote:q.contextQuote}))},auditSchema);}
  catch(error){if(!approved.size)throw error;break;}
  const rejected:{question:Question;reason:string}[]=[];
  for(const q of pending){
   const checks=Array.isArray(audit?.checks)?audit.checks.filter((c:any)=>c.id===q.id):[];
   if(checks.length===1&&checks[0].relevant===true)approved.set(q.id,q);
   else rejected.push({question:q,reason:checks.length===1&&typeof checks[0].reason==='string'?checks[0].reason.slice(0,1800):'The review was incomplete. Return a clear question with a correct, job-related rubric.'});
  }
  if(!rejected.length||round===1)break;
  const repairSchema={type:'OBJECT',properties:{questions:{type:'ARRAY',items:{type:'OBJECT',properties:{...properties,replacesId:{type:'STRING',enum:rejected.map(r=>r.question.id)}},required:[...item.required,'contextId','replacesId']}}},required:['questions']};
  let repaired:any;
  try{repaired=await ask(draftSystem+' Rewrite ONLY the rejected questions using the specific review reasons. Keep each replacesId, original type and contextId. Do not rewrite or return approved questions. Correct technical inaccuracies and unsupported prerequisites. Return exactly one replacement for each rejected question.',{...context,language,count:rejected.length,rejected:rejected.map(({question,reason})=>({replacesId:question.id,originalType:question.type,contextId:question.contextId,source:question.contextQuote,prompt:question.prompt,options:question.options,expectedAnswer:question.expectedAnswer,reason}))},repairSchema);}
  catch(error){if(!approved.size)throw error;break;}
  const replacementRows=Array.isArray(repaired?.questions)?repaired.questions:[];
  pending=[];
  for(const {question} of rejected){
   const matching=replacementRows.filter((q:any)=>q.replacesId===question.id);
   if(matching.length!==1)continue;
   try{const replacement=validateAnchoredQuestions(matching,context.anchors,1,!!hrGuidance)[0]!;
    if(replacement.type!==question.type||replacement.contextId!==question.contextId)continue;
    pending.push({...replacement,id:question.id});
   }catch{/* Keep approved questions; invalid repairs are never silently accepted. */}
  }
 }
 const accepted=initial.filter(q=>approved.has(q.id)).map(q=>approved.get(q.id)!);
 if(!accepted.length)throw new HttpError(502,language==='Thai'?'AI ยังสร้างคำถามที่ตรวจผ่านสำหรับงานนี้ไม่ได้หลังปรับให้อัตโนมัติแล้ว แบบเดิมยังอยู่ กรุณาเพิ่มรายละเอียดหน้าที่งานหรือเขียนคำถามเอง':'AI could not produce a checked draft for this role after automatic revision. Your existing questions are unchanged. Add clearer duties or write questions manually.');
 const omittedCount=count-accepted.length;
 return {questions:accepted,requestedCount:count,omittedCount,notice:omittedCount?(language==='Thai'?`ได้ร่างที่ตรวจแล้ว ${accepted.length} จาก ${count} ข้อ อีก ${omittedCount} ข้อยังต้องปรับจึงไม่ได้นำมาใช้ คุณแก้ไขหรือเพิ่มคำถามต่อได้`:`Prepared ${accepted.length} checked questions out of ${count}. ${omittedCount} still needed revision and were omitted. You can edit these or add questions.`):null};
}

// Compatibility for callers that only need the question array.
export async function draftJobQuestions(job:JobContext,language:string,count=4,guidance?:string){return (await draftJobQuestionSet(job,language,count,undefined,guidance)).questions;}
