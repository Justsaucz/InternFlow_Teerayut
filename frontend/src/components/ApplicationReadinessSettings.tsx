import { useEffect,useState,type FormEvent } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
const api=import.meta.env.VITE_API_URL||'http://localhost:4000';
const bangkokInput=(text:string)=>new Date(new Date(text).getTime()+7*3600000).toISOString().slice(0,16);
export default function ApplicationReadinessSettings({application,onClose}:{application:{id:string;studentName:string;jobTitle:string};onClose:()=>void}){
  const {language}=useLanguage();const th=language==='th';
  const [enabled,setEnabled]=useState(false),[start,setStart]=useState(''),[deadline,setDeadline]=useState(''),[version,setVersion]=useState(0),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
  useEffect(()=>{let active=true;void(async()=>{try{const response=await fetch(`${api}/api/readiness/applications/${application.id}/settings`,{headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}});const data=await response.json();if(!response.ok)throw Error(data.error);if(active){setEnabled(data.readinessEnabled);setVersion(data.readinessVersion);setStart(data.readinessStartDate?bangkokInput(data.readinessStartDate).slice(0,10):'');setDeadline(data.readinessDeadline?bangkokInput(data.readinessDeadline):'');}}catch(reason){if(active)setError(reason instanceof Error?reason.message:'Unable to load settings.');}finally{if(active)setLoading(false);}})();return()=>{active=false;};},[application.id]);
  async function save(event:FormEvent){event.preventDefault();setSaving(true);setError('');try{
    if(enabled&&(!start||!deadline))throw Error(th?'กรุณาระบุวันเริ่มงานและกำหนดยืนยัน':'Enter the start date and confirmation deadline.');
    const response=await fetch(`${api}/api/readiness/applications/${application.id}/settings`,{method:'PUT',headers:{Authorization:`Bearer ${localStorage.getItem('token')}`,'Content-Type':'application/json'},body:JSON.stringify({enabled,version,startDate:start,deadline:enabled?new Date(deadline+':00+07:00').toISOString():null})});const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to save settings.');onClose();
  }catch(reason){setError(reason instanceof Error?reason.message:'Unable to save settings.');}finally{setSaving(false);}}
  return <div className="workspace-dialog fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm p-4 flex items-center justify-center"><section role="dialog" aria-modal="true" aria-labelledby="readiness-title" className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-auto">
    <header className="bg-emerald-950 text-white p-6 flex justify-between gap-4"><div><h2 id="readiness-title" className="text-lg font-bold">{th?'ติดตามความพร้อมก่อนเริ่มงาน':'Pre-start readiness tracking'}</h2><p className="text-sm mt-1">{application.studentName} · {application.jobTitle}</p></div><button type="button" aria-label={th?'ปิด':'Close'} disabled={saving} onClick={onClose}><X size={20}/></button></header>
    <form onSubmit={save} className="p-6 space-y-4">
      {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading?<p role="status">{th?'กำลังโหลด…':'Loading…'}</p>:<>
        <label className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm font-semibold"><input type="checkbox" checked={enabled} onChange={event=>setEnabled(event.target.checked)}/>{th?'เปิดติดตามความพร้อมสำหรับผู้สมัครคนนี้ (ไม่บังคับ)':'Enable readiness tracking for this candidate (optional)'}</label>
        <p className="text-xs leading-5 text-slate-600">{th?'นักศึกษายืนยันผ่านเว็บได้ หรือ HR บันทึกคำยืนยันที่ได้รับทางอีเมล ระบบแจ้งเตือนในเว็บก่อนกำหนด 3 วันและเมื่อเลยกำหนด โดยไม่ยกเลิกที่ฝึกงานอัตโนมัติ':'Students can confirm on the website, or HR can record confirmation received by email. In-app reminders appear 3 days before the deadline and when overdue. Placements are never cancelled automatically.'}</p>
        {enabled&&<>
          <label className="block text-sm font-semibold">{th?'วันเริ่มงาน':'Start date'}<input required type="date" value={start} onChange={event=>setStart(event.target.value)} className="block mt-2 w-full border border-slate-200 rounded-xl p-3"/></label>
          <label className="block text-sm font-semibold">{th?'กำหนดยืนยันความพร้อม (เวลาไทย UTC+7)':'Confirmation deadline (Bangkok UTC+7)'}<input required type="datetime-local" value={deadline} onChange={event=>setDeadline(event.target.value)} className="block mt-2 w-full border border-slate-200 rounded-xl p-3"/></label>
          <p className="text-xs text-amber-800">{th?'กำหนดยืนยันต้องอยู่ก่อนวันเริ่มงาน หากเปลี่ยนวันหรือเปิดใหม่ นักศึกษาต้องยืนยันรอบใหม่ และเก็บประวัติรอบเดิมไว้':'The deadline must precede the start date. Changing the schedule or re-enabling tracking requires a new confirmation; earlier records are retained.'}</p>
        </>}
        <div className="flex justify-end gap-3 pt-2"><button type="button" disabled={saving} onClick={onClose} className="border border-slate-200 rounded-xl px-4 py-2 text-sm">{th?'ยกเลิก':'Cancel'}</button><button type="submit" disabled={saving} className="bg-emerald-800 text-white font-bold rounded-xl px-4 py-2 text-sm disabled:opacity-50">{saving?'…':th?'บันทึก':'Save settings'}</button></div>
      </>}
    </form>
  </section></div>;
}
