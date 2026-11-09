import ReadinessPanel, { type Readiness } from '../../components/ReadinessPanel';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
const ScreeningWorkspace=lazy(()=>import('../ScreeningWorkspace'));
const ApplicationReadinessSettings=lazy(()=>import('../../components/ApplicationReadinessSettings'));
import { CheckCircle, XCircle, Eye, Building, Mail, Briefcase, Calendar, FileText, ExternalLink, Clock, AlertTriangle, UserCheck, Video } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import PublicProfileModal from '../../components/modals/PublicProfileModal';
import { useLanguage } from '../../context/LanguageContext';

interface ScreeningSummary {evidenceCount:number;aiSummary:string|null;aiContents:{title:string;detail:string}[];aiMissingRequirements:{id:string;text:string;detail:string;status:string}[];summaryEligible:boolean;summaryKey:string;aiCurrent:boolean;manualCurrent:boolean;assessmentStatus:string|null;percentage:number|null;needsReview:boolean}
interface Application {
  readiness?:Readiness|null;
  screeningSummary?:ScreeningSummary;
  id: string;
  status: string;
  coverLetter?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  jobPost: { id:string;title: string };
  documents: { id: string; title: string; fileUrl: string; type?: string }[];
  student: {
    id: string;
    studentId: string;
    major: string;
    faculty: string;
    university?: string | null;
    avatarUrl?: string | null;
    userId?: string;
    user: { id?: string; name: string; email: string; avatarUrl?: string | null };
  };
}

const getStatusConfig = (isThai: boolean): Record<string, { label: string; color: string }> => ({
  PENDING: { label: isThai ? 'รอการตรวจสอบ' : 'Pending Review', color: 'bg-yellow-100 text-yellow-800' },
  REVIEWING: { label: isThai ? 'กำลังพิจารณา' : 'Under Review', color: 'bg-blue-100 text-blue-800' },
  INTERVIEW_SCHEDULED: { label: isThai ? 'นัดสัมภาษณ์แล้ว' : 'Interview Scheduled', color: 'bg-indigo-100 text-indigo-800' },
  ACCEPTED: { label: isThai ? 'ส่งข้อเสนอแล้ว' : 'Offer Extended', color: 'bg-amber-100 text-amber-800' },
  COMMITTED: { label: isThai ? 'นักศึกษาในสังกัด' : 'Active Intern', color: 'bg-emerald-100 text-emerald-800' },
  CANCEL_REQUESTED: { label: isThai ? 'ขอยกเลิกการฝึกงาน' : 'Cancellation Requested', color: 'bg-rose-100 text-rose-800' },
  CANCELLED: { label: isThai ? 'ยกเลิก / ปลดประจำการ' : 'Cancelled / Released', color: 'bg-gray-100 text-gray-700' },
  REJECTED: { label: isThai ? 'ปฏิเสธแล้ว' : 'Rejected', color: 'bg-red-100 text-red-800' },
});

export default function CompanyApplicants() {
  const reviewPanel=useRef<HTMLDivElement>(null);
  const [screeningId,setScreeningId]=useState<string|null>(null);
  const [readinessApplication,setReadinessApplication]=useState<Application|null>(null);
  useEffect(()=>{if(screeningId)reviewPanel.current?.scrollTo({top:0});},[screeningId]);
  const [filter,setFilter]=useState('all');
  const [search,setSearch]=useState('');
  const [jobFilter,setJobFilter]=useState('all');
  const summaryAttempt=useRef(new Set<string>());const [summarizing,setSummarizing]=useState<string[]>([]);const [summaryErrors,setSummaryErrors]=useState<Record<string,string>>({});
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const { success, error: showError } = useToast();
  const { language } = useLanguage();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/applications/company`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{
    const queue=applications.filter(app=>app.screeningSummary?.summaryEligible&&!app.screeningSummary.aiCurrent&&!summaryAttempt.current.has(app.id+app.screeningSummary.summaryKey+language));
    if(!queue.length)return;
    for(const app of queue)summaryAttempt.current.add(app.id+app.screeningSummary!.summaryKey+language);
    void (async()=>{for(let index=0;index<queue.length;index+=2){await Promise.all(queue.slice(index,index+2).map(async app=>{
      setSummarizing(old=>[...old,app.id]);
      try{const response=await fetch(`${import.meta.env.VITE_API_URL||'http://localhost:4000'}/api/screening/${app.id}/portfolio-summary`,{method:'POST',headers:{Authorization:`Bearer ${localStorage.getItem('token')}`,'Content-Type':'application/json'},body:JSON.stringify({language})});const value=await response.json();if(!response.ok)throw Error(value.error||'Automatic summary unavailable.');}
      catch(e){setSummaryErrors(old=>({...old,[app.id]:e instanceof Error?e.message:'Automatic summary unavailable.'}));}
      finally{setSummarizing(old=>old.filter(id=>id!==app.id));}
    }));}await fetchApplications();})();
  },[applications,language]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/applications/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok) {
        const label = status === 'ACCEPTED' 
          ? (language === 'th' ? 'ส่งข้อเสนอฝึกงานแล้ว' : 'offered') 
          : status === 'REJECTED' 
          ? (language === 'th' ? 'ปฏิเสธใบสมัครแล้ว' : 'rejected') 
          : status === 'INTERVIEW_SCHEDULED'
          ? (language === 'th' ? 'เข้าสู่ขั้นตอนสัมภาษณ์แล้ว' : 'advanced to interview stage')
          : (language === 'th' ? 'อัปเดตสถานะแล้ว' : 'updated');
        success(language === 'th' ? `ดำเนินการสำเร็จ: ${label}` : `Application ${label} successfully!`);
        fetchApplications();
      } else {
        showError(data.error || 'Failed to update application status.');
      }
    } catch (error) {
      showError('Network error. Please try again.');
      console.error(error);
    }
  };

  const handleCancellationAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/applications/${id}/cancellation-action`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok) {
        success(data.message || 'Updated successfully');
        fetchApplications();
      } else {
        showError(data.error || 'Failed to process cancellation action');
      }
    } catch (error) {
      showError('Network error. Please try again.');
      console.error(error);
    }
  };

  const statusMap = getStatusConfig(language === 'th');
  const tr=(thai:string,en:string)=>language==='th'?thai:en;
  const visible=applications.filter(app=>(jobFilter==='all'||app.jobPost.id===jobFilter)&&(!search||`${app.student.user.name} ${app.student.user.email} ${app.jobPost.title}`.toLowerCase().includes(search.toLowerCase()))&&(filter==='all'||(filter==='review'&&app.screeningSummary?.needsReview)||(filter==='answers'&&app.screeningSummary?.assessmentStatus==='SUBMITTED')||(filter==='reviewed'&&app.screeningSummary?.assessmentStatus==='REVIEWED')||(filter==='readiness'&&['PENDING','OVERDUE'].includes(app.readiness?.status||''))));
  const selectedIndex=visible.findIndex(app=>app.id===screeningId);
  useEffect(()=>{if(!screeningId)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;};},[screeningId]);

  return (
    <div className="workspace-page space-y-6">
      <div className="workspace-page-header">
        <h2 className="text-2xl font-bold text-slate-900 font-heading">
          {language === 'th' ? 'ผู้สมัครและนักศึกษาฝึกงานในความดูแล' : 'Applicants & Active Interns'}
        </h2>
        <p className="text-slate-500 mt-1 text-sm">
          {language === 'th' ? 'ตรวจสอบประวัติผู้สมัคร นัดหมายสัมภาษณ์ ส่งข้อเสนอฝึกงาน และติดตามนักศึกษาที่ยืนยันสิทธิ์' : 'Review candidate applications, schedule interviews, extend internship offers, and manage intern placements.'}
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap gap-2">{[['all',tr('ทั้งหมด','All'),applications.length],['review',tr('รอตรวจ','Needs review'),applications.filter(a=>a.screeningSummary?.needsReview).length],['answers',tr('แบบทดสอบรอให้คะแนน','Answers to score'),applications.filter(a=>a.screeningSummary?.assessmentStatus==='SUBMITTED').length],['reviewed',tr('ให้คะแนนแล้ว','Scored'),applications.filter(a=>a.screeningSummary?.assessmentStatus==='REVIEWED').length],['readiness',tr('รอยืนยันความพร้อม','Readiness pending'),applications.filter(a=>['PENDING','OVERDUE'].includes(a.readiness?.status||'')).length]].map(([value,label,count])=><button key={value} onClick={()=>setFilter(String(value))} aria-pressed={filter===value} className={`rounded-xl px-3 py-2 text-xs font-bold border ${filter===value?'bg-emerald-800 text-white border-emerald-800':'border-slate-200 text-slate-600'}`}>{label} <span className="ml-2">{count}</span></button>)}</div>
        <div className="grid sm:grid-cols-2 gap-3"><input aria-label="Search applicants" placeholder={tr('ค้นหาชื่อ อีเมล หรือตำแหน่ง','Search name, email or role')} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm min-w-0" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Filter by role" value={jobFilter} onChange={e=>setJobFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm min-w-0"><option value="all">{tr('ทุกตำแหน่ง','All roles')}</option>{Array.from(new Map(applications.map(a=>[a.jobPost.id,a.jobPost])).values()).map(j=><option key={j.id} value={j.id}>{j.title}</option>)}</select></div>
        <p className="text-xs text-slate-500">{tr('ดูว่า Portfolio มีอะไร และ Requirement ไหนยังไม่พบ ก่อนเปิดอ่านไฟล์และคำตอบ HR เป็นผู้พิจารณาเอง','Scan portfolio contents and undocumented requirements before opening files and answers. HR makes the decision.')}</p>
      </section>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : visible.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {visible.map((app) => {
            const status = statusMap[app.status] || { label: app.status, color: 'bg-gray-100 text-gray-800' };

            return (
              <div key={app.id} data-application-id={app.id} className="bg-white min-w-0 p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setViewingStudentId(app.student.userId || app.student.id)}
                      className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary-400 transition-all"
                      title="View Student Profile"
                    >
                      {app.student.user.avatarUrl ? (
                        <img 
                          src={app.student.user.avatarUrl.startsWith('http') ? app.student.user.avatarUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${app.student.user.avatarUrl}`} 
                          alt={app.student.user.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        app.student.user.name.charAt(0)
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={() => setViewingStudentId(app.student.userId || app.student.id)}
                          className="text-lg font-bold text-gray-900 hover:text-primary-600 transition-colors text-left cursor-pointer break-words min-w-0"
                        >
                          {app.student.user.name}
                        </button>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      
                      <div className="mt-1 text-sm text-gray-500 space-y-1 min-w-0 break-words">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <Briefcase className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-700 min-w-0 flex-1 break-words">{app.jobPost.title}</span>
                          <span>•</span>
                          <span>{app.student.major}, {app.student.faculty}</span>
                        </div>
                        {app.student.university && (
                          <div className="text-xs text-gray-400">
                            {app.student.university}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs min-w-0">
                          <span className="flex items-center gap-1 min-w-0 break-all">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            {app.student.user.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            Applied {new Date(app.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {app.coverLetter && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-xl text-xs text-gray-600 max-w-xl">
                          <span className="font-semibold text-gray-700">Cover Letter: </span>
                          "{app.coverLetter}"
                        </div>
                      )}

                      {app.screeningSummary&&<section className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 max-w-2xl">
                        <div className="flex flex-wrap gap-2 text-[11px] font-semibold"><span className="rounded-full bg-white border border-slate-200 px-2.5 py-1">{tr('หลักฐาน','Evidence')}: {app.screeningSummary.evidenceCount}</span><span className="rounded-full bg-white border border-slate-200 px-2.5 py-1">{app.screeningSummary.manualCurrent?tr('มีความคิดเห็นจาก HR','HR comments available'):tr('ความคิดเห็น HR: ไม่บังคับ','HR comments: optional')}</span><span className="rounded-full bg-white border border-slate-200 px-2.5 py-1">{app.screeningSummary.assessmentStatus==='SUBMITTED'?tr('แบบทดสอบ: รอให้คะแนน','Questionnaire: ready to score'):app.screeningSummary.assessmentStatus==='REVIEWED'?`${tr('คะแนน','Score')}: ${app.screeningSummary.percentage}%`:app.screeningSummary.assessmentStatus==='ASSIGNED'?tr('แบบทดสอบ: รอคำตอบ','Questionnaire: awaiting answers'):tr('ยังไม่มีแบบทดสอบ','No assigned questionnaire')}</span></div>
                        {summarizing.includes(app.id)&&<p role="status" className="text-xs text-emerald-800 mt-3">{tr('กำลังสรุปไฟล์อัตโนมัติ…','Summarizing files automatically…')}</p>}
                        {app.screeningSummary.aiSummary?<><p className="text-[10px] uppercase tracking-wide text-emerald-800 font-bold mt-3">{tr('สรุปเนื้อหา Portfolio','Portfolio contents')}{!app.screeningSummary.aiCurrent&&` · ${tr('กำลังอัปเดตตามไฟล์ล่าสุด','Updating for the latest files')}`}</p><p className="text-xs text-slate-600 leading-5 mt-1 line-clamp-3">{app.screeningSummary.aiSummary}</p><div className="mt-3 text-xs"><strong className="text-amber-900">{tr('Requirement ที่ยังไม่พบ / พบไม่ครบ','Requirements not found / partly documented')}</strong>{app.screeningSummary.aiMissingRequirements.length?<ul className="list-disc pl-4 mt-1 space-y-1 text-slate-600">{app.screeningSummary.aiMissingRequirements.slice(0,4).map(q=><li key={q.id}>{q.text}</li>)}</ul>:<p className="text-slate-500 mt-1">{tr('ไม่มีรายการที่ยังไม่พบในสรุปนี้','No undocumented requirements in this summary.')}</p>}</div></>:!summarizing.includes(app.id)&&<p className="text-xs text-slate-500 mt-3">{summaryErrors[app.id]||tr('ยังไม่มีสรุปอัตโนมัติ เปิดอ่านไฟล์แนบได้ตามปกติ','No automatic summary yet. Attachments remain available for reading.')}</p>}
                        <button onClick={()=>setScreeningId(app.id)} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white"><Eye size={14}/>{tr('ตรวจหลักฐานและคำตอบ','Review evidence & answers')}</button>
                      </section>}
                      {['ACCEPTED','COMMITTED'].includes(app.status)&&<button type="button" onClick={()=>setReadinessApplication(app)} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-900"><Calendar size={15}/>{language==='th'?'ตั้งวันเริ่มงาน / ความพร้อมรายคน':'Set individual start date / readiness'}</button>}
                      <ReadinessPanel applicationId={app.id} value={app.readiness} company onUpdated={fetchApplications}/>

                      {/* Cancellation Request Notice Box */}
                      {app.status === 'CANCEL_REQUESTED' && (
                        <div className="mt-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1 max-w-xl">
                          <div className="font-bold flex items-center gap-1.5 text-amber-800">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            Student requested to cancel this internship:
                          </div>
                          <p className="italic text-slate-700 bg-white/80 p-2 rounded-lg border border-amber-100">
                            "{app.cancellationReason || 'No reason specified'}"
                          </p>
                          <p className="text-[11px] text-amber-700">
                            Action required: Choose to approve their release or decline the cancellation request.
                          </p>
                        </div>
                      )}

                      {/* Documents / Pin-Point Attachments */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {app.documents?.map((doc, idx) => {
                          const isLink = doc.fileUrl.startsWith('http://') || doc.fileUrl.startsWith('https://');
                          const docUrl = isLink ? doc.fileUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${doc.fileUrl}`;
                          return (
                            <a 
                              key={doc.id || idx}
                              href={docUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1 transition-colors"
                            >
                              {isLink ? <ExternalLink className="w-3 h-3 text-indigo-600" /> : <FileText className="w-3 h-3 text-indigo-600" />}
                              <span>{doc.title || 'Attachment'}</span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Actions Right Side */}
                  <div className="flex items-center gap-2 flex-wrap self-start">
                    {app.status === 'PENDING' && (
                      <button onClick={() => updateStatus(app.id, 'REVIEWING')} className="px-3 py-1.5 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors flex items-center cursor-pointer">
                        <Eye className="w-3.5 h-3.5 mr-1" /> {language === 'th' ? 'เริ่มตรวจสอบ' : 'Review'}
                      </button>
                    )}
                    {(app.status === 'PENDING' || app.status === 'REVIEWING') && (
                      <>
                        <button 
                          onClick={() => updateStatus(app.id, 'INTERVIEW_SCHEDULED')} 
                          className="px-3 py-1.5 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors flex items-center cursor-pointer shadow-xs"
                          title={language === 'th' ? 'นัดหมายสัมภาษณ์นักศึกษา' : 'Schedule Interview'}
                        >
                          <Video className="w-3.5 h-3.5 mr-1 text-indigo-600" /> {language === 'th' ? 'เข้าสู่รอบสัมภาษณ์' : 'Advance to Interview'}
                        </button>
                        <button onClick={() => updateStatus(app.id, 'ACCEPTED')} className="px-3 py-1.5 border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 rounded-xl text-xs font-bold transition-colors flex items-center cursor-pointer">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> {language === 'th' ? 'ให้ข้อเสนอ' : 'Extend Offer'}
                        </button>
                        <button onClick={() => updateStatus(app.id, 'REJECTED')} className="px-3 py-1.5 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors flex items-center cursor-pointer">
                          <XCircle className="w-3.5 h-3.5 mr-1" /> {language === 'th' ? 'ปฏิเสธ' : 'Reject'}
                        </button>
                      </>
                    )}
                    {app.status === 'INTERVIEW_SCHEDULED' && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200">
                          <Video className="w-3.5 h-3.5 text-indigo-600" />
                          {language === 'th' ? 'อยู่ในขั้นตอนสัมภาษณ์' : 'Interview in Progress'}
                        </span>
                        <button 
                          onClick={() => updateStatus(app.id, 'ACCEPTED')} 
                          className="px-3 py-1.5 border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors flex items-center cursor-pointer shadow-xs"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          {language === 'th' ? 'ผ่านสัมภาษณ์ / ให้ข้อเสนอ' : 'Pass & Extend Offer'}
                        </button>
                        <button 
                          onClick={() => updateStatus(app.id, 'REJECTED')} 
                          className="px-3 py-1.5 border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-bold transition-colors flex items-center cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          {language === 'th' ? 'ไม่ผ่านสัมภาษณ์' : 'Reject'}
                        </button>
                      </div>
                    )}
                    {app.status === 'ACCEPTED' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200">
                        <Clock className="w-3.5 h-3.5" /> {language === 'th' ? 'ส่งข้อเสนอแล้ว (รอนักศึกษายืนยัน)' : 'Offer Extended (Awaiting Student)'}
                      </span>
                    )}
                    {app.status === 'COMMITTED' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                        <UserCheck className="w-3.5 h-3.5" /> {language === 'th' ? 'ยืนยันสถานที่ฝึกงานแล้ว' : 'Placement confirmed'}
                      </span>
                    )}
                    {app.status === 'CANCEL_REQUESTED' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCancellationAction(app.id, 'APPROVE')}
                          className="px-3 py-1.5 border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors flex items-center cursor-pointer shadow-xs"
                          title="Approve cancellation and release student"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve Release
                        </button>
                        <button
                          onClick={() => handleCancellationAction(app.id, 'REJECT')}
                          className="px-3 py-1.5 border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-bold transition-colors flex items-center cursor-pointer"
                          title="Decline cancellation request"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Decline
                        </button>
                      </div>
                    )}
                    {app.status === 'CANCELLED' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200">
                        <XCircle className="w-3.5 h-3.5" /> Placement Cancelled
                      </span>
                    )}
                    {app.status === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5" /> {language === 'th' ? 'ปฏิเสธแล้ว' : 'Rejected'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{tr('ไม่มีผู้สมัครในรายการนี้','No applicants in this view')}</h3>
          <p className="mt-1 text-sm text-gray-500">Applicants will appear here once students apply to your jobs.</p>
        </div>
      )}

      {screeningId&&<div className="workspace-dialog fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm p-2 sm:p-5 flex items-center justify-center"><div ref={reviewPanel} role="dialog" aria-modal="true" aria-label={tr('ตรวจผู้สมัคร','Review applicant')} className="w-full max-w-6xl max-h-[94dvh] rounded-2xl overflow-y-auto bg-slate-50 shadow-2xl"><header className="sticky top-0 z-20 bg-emerald-950 px-4 sm:px-6 py-4 text-white flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="font-bold text-sm">{applications.find(a=>a.id===screeningId)?.student.user.name}</p><p className="text-xs text-emerald-100 mt-1">{applications.find(a=>a.id===screeningId)?.jobPost.title}</p></div><div className="flex gap-2"><button disabled={selectedIndex<=0} onClick={()=>setScreeningId(visible[selectedIndex-1]?.id||null)} className="rounded-lg bg-white/10 px-3 py-2 text-xs disabled:opacity-30">{tr('ก่อนหน้า','Previous')}</button><button disabled={selectedIndex<0||selectedIndex>=visible.length-1} onClick={()=>setScreeningId(visible[selectedIndex+1]?.id||null)} className="rounded-lg bg-white/10 px-3 py-2 text-xs disabled:opacity-30">{tr('ถัดไป','Next')}</button><button onClick={()=>{setScreeningId(null);void fetchApplications();}} className="rounded-lg bg-white text-emerald-950 px-3 py-2 text-xs font-bold">{tr('ปิด','Close')}</button></div></header><div className="p-3 sm:p-6"><Suspense fallback={<p className="p-6 text-sm">Loading…</p>}><ScreeningWorkspace applicationId={screeningId}/></Suspense></div></div></div>}
      {/* ── Student Profile Modal ───────────────────────────────────────────── */}
      {readinessApplication&&<Suspense fallback={<div role="status">Loading…</div>}><ApplicationReadinessSettings application={{id:readinessApplication.id,studentName:readinessApplication.student.user.name,jobTitle:readinessApplication.jobPost.title}} onClose={()=>{setReadinessApplication(null);void fetchApplications();}}/></Suspense>}
      <PublicProfileModal
        isOpen={!!viewingStudentId}
        onClose={() => setViewingStudentId(null)}
        profileType="student"
        profileId={viewingStudentId}
      />
    </div>
  );
}
