import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export interface Readiness {
  version:number; startDate:string; deadline:string;
  status:'PENDING'|'OVERDUE'|'CONFIRMED_WEB'|'CONFIRMED_EMAIL'|'PAUSED';
  confirmation:{source:string;confirmedAt:string;recordedBy:string;late:boolean}|null;
}
export default function ReadinessPanel({applicationId,value,company=false,onUpdated}:{applicationId:string;value?:Readiness|null;company?:boolean;onUpdated:()=>void|Promise<void>}) {
  const {language}=useLanguage();const th=language==='th';
  const [saving,setSaving]=useState(false),[error,setError]=useState(''),[recordingEmail,setRecordingEmail]=useState(false);
  if(!value)return null;
  const date=(text:string)=>new Date(text).toLocaleString(th?'th-TH':'en-GB',{timeZone:'Asia/Bangkok',dateStyle:'medium',timeStyle:'short'});
  const labels={PENDING:th?'รอยืนยันความพร้อม':'Awaiting readiness confirmation',OVERDUE:th?'เลยกำหนด · ยังไม่ยืนยัน':'Overdue · no confirmation',CONFIRMED_WEB:th?'นักศึกษายืนยันผ่านเว็บแล้ว':'Student confirmed through website',CONFIRMED_EMAIL:th?'HR บันทึกคำยืนยันทางอีเมลแล้ว':'HR recorded email confirmation',PAUSED:th?'พักการติดตามระหว่างรอพิจารณายกเลิก':'Tracking paused during cancellation review'};
  const pending=value.status==='PENDING'||value.status==='OVERDUE';
  async function confirm(){
    setSaving(true);setError('');try{
      const response=await fetch(`${import.meta.env.VITE_API_URL||'http://localhost:4000'}/api/readiness/applications/${applicationId}/${company?'confirm-email':'confirm'}`,{method:'POST',headers:{Authorization:`Bearer ${localStorage.getItem('token')}`,'Content-Type':'application/json'},body:JSON.stringify({version:value!.version})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to confirm.');setRecordingEmail(false);await onUpdated();
    }catch(reason){setError(reason instanceof Error?reason.message:'Unable to confirm.');}finally{setSaving(false);}
  }
  return <section aria-label={th?'ความพร้อมก่อนเริ่มงาน':'Pre-start readiness'} className={`mt-4 rounded-2xl border p-4 text-sm ${value.status==='OVERDUE'?'border-amber-200 bg-amber-50':'border-emerald-100 bg-emerald-50/60'}`}>
    <h4 className="font-bold text-emerald-950">{th?'ความพร้อมก่อนเริ่มงาน':'Pre-start readiness'}</h4>
    <p className="font-semibold mt-1" role="status">{labels[value.status]}</p>
    <p className="text-xs text-slate-600 mt-2">{th?'เริ่มงาน':'Start'}: {new Date(value.startDate).toLocaleDateString(th?'th-TH':'en-GB',{timeZone:'Asia/Bangkok',dateStyle:'medium'})} · {th?'ยืนยันภายใน':'Confirm by'}: {date(value.deadline)} (UTC+7)</p>
    {value.confirmation&&<p className="text-xs text-slate-600 mt-2">{date(value.confirmation.confirmedAt)}{value.confirmation.late?` · ${th?'ยืนยันหลังครบกำหนด':'Confirmed after deadline'}`:''}</p>}
    {pending&&<>
      {company?<>
        <button type="button" onClick={()=>setRecordingEmail(!recordingEmail)} className="mt-3 border border-emerald-200 bg-white px-3 py-2 rounded-xl font-semibold text-xs">{th?'ได้รับคำยืนยันทางอีเมลแล้ว':'Record confirmation received by email'}</button>
        {recordingEmail&&<div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3"><p className="text-xs text-slate-600">{th?'บันทึกได้เมื่อได้รับอีเมลยืนยันจากนักศึกษาแล้ว ระบบจะระบุว่า HR เป็นผู้บันทึก ไม่ได้ตรวจอีเมลอัตโนมัติ':'Record this only after receiving the student’s email confirmation. The source is recorded as HR; email is not read automatically.'}</p><button type="button" disabled={saving} onClick={()=>void confirm()} className="mt-2 rounded-xl bg-emerald-800 text-white px-4 py-2 text-xs font-bold disabled:opacity-50">{saving?'…':th?'ยืนยันการบันทึก':'Confirm record'}</button></div>}
      </>:<button type="button" disabled={saving} onClick={()=>void confirm()} className="mt-3 rounded-xl bg-emerald-800 text-white px-4 py-2 text-xs font-bold disabled:opacity-50">{saving?'…':th?'ยืนยันว่าพร้อมเริ่มงานตามกำหนด':'Confirm I am ready to start as scheduled'}</button>}
      <p className="mt-2 text-xs text-slate-500">{th?'การยังไม่ตอบไม่ทำให้ถูกปฏิเสธหรือยกเลิกอัตโนมัติ หากตกลงทางอีเมล HR สามารถบันทึกคำยืนยันให้ได้':'No response does not automatically reject or cancel the placement. HR can record confirmation agreed by email.'}</p>
    </>}
    {error&&<p role="alert" className="text-red-700 text-xs mt-2">{error}</p>}
  </section>;
}
