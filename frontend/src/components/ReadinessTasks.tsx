import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CalendarClock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { Readiness } from './ReadinessPanel';
type Entry={id:string;jobPost:{title:string;company?:{companyName:string}};readiness?:Readiness|null};
export default function ReadinessTasks({applications,onOpen}:{applications?:Entry[];onOpen?:(id:string)=>void}){
 const {language}=useLanguage();const th=language==='th';const [loaded,setLoaded]=useState<Entry[]>([]);
 useEffect(()=>{
  if(applications)return;
  const controller=new AbortController();
  const refresh=async()=>{try{const r=await fetch(`${import.meta.env.VITE_API_URL||'http://localhost:4000'}/api/applications/my`,{signal:controller.signal,headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}});if(r.ok){const data=await r.json();if(!controller.signal.aborted&&Array.isArray(data))setLoaded(data);}}catch{/* Keep the rest of the dashboard usable. */}};
  void refresh();const timer=setInterval(()=>void refresh(),30000);window.addEventListener('focus',refresh);return()=>{controller.abort();clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[applications]);
 const tasks=(applications||loaded).filter(a=>a.readiness&&['PENDING','OVERDUE'].includes(a.readiness.status));if(!tasks.length)return null;
 return <section className="readiness-tasks" aria-label={th?'งานที่ต้องยืนยันก่อนเริ่มฝึกงาน':'Action required before your internship'}>
  <div className="readiness-tasks-title"><AlertTriangle size={23} aria-hidden="true"/><div><h3>{th?'ต้องดำเนินการ: ยืนยันความพร้อมก่อนเริ่มงาน':'Action required: confirm your readiness'}</h3><p>{th?'บริษัทกำหนดวันเริ่มงานให้คุณแล้ว กรุณายืนยันภายในกำหนด หรือแจ้ง HR หากตกลงกันทางอีเมล':'Your company has set your start date. Confirm by the deadline, or contact HR if you agreed by email.'}</p></div></div>
  {tasks.map(a=><div key={a.id} className="readiness-task-row"><div><strong>{a.jobPost.title}</strong><p><CalendarClock size={14} aria-hidden="true"/>{th?'ยืนยันภายใน':'Confirm by'} {new Date(a.readiness!.deadline).toLocaleString(th?'th-TH':'en-GB',{timeZone:'Asia/Bangkok',dateStyle:'medium',timeStyle:'short'})}{a.readiness!.status==='OVERDUE'&&<b>{th?' · เลยกำหนดแล้ว':' · Overdue'}</b>}</p></div>{onOpen?<button type="button" onClick={()=>onOpen(a.id)}>{th?'ไปยืนยันความพร้อม':'Confirm readiness'}<ArrowRight size={15}/></button>:<Link to={`/dashboard/applications#application-${a.id}`}>{th?'ไปยืนยันความพร้อม':'Confirm readiness'}<ArrowRight size={15}/></Link>}</div>)}
 </section>;
}
