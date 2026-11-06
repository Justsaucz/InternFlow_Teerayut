import ReadinessPanel, { type Readiness } from '../../components/ReadinessPanel';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ReadinessTasks from '../../components/ReadinessTasks';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  Briefcase, 
  Calendar, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Award,
  AlertTriangle,
  Sparkles,
  LogOut,
  Check,
  Video
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import PublicProfileModal from '../../components/modals/PublicProfileModal';
import { useLanguage } from '../../context/LanguageContext';

interface Application {
  readiness?:Readiness|null;
  id: string;
  status: string;
  coverLetter: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  documents?: { id: string; title: string; fileUrl: string; type?: string }[];
  jobPost: {
    title: string;
    location?: string;
    companyProfileId?: string;
    company: {
      id?: string;
      companyName: string;
      logoUrl: string | null;
    };
  };
}

const getStatusConfig = (isThai: boolean): Record<string, { label: string; color: string; icon: any; step: number }> => ({
  PENDING: { 
    label: isThai ? 'รอการตรวจสอบ' : 'Pending Review', 
    color: 'bg-amber-50 text-amber-700 border-amber-200', 
    icon: Clock,
    step: 1 
  },
  REVIEWING: { 
    label: isThai ? 'ฝ่ายบุคคลกำลังพิจารณา' : 'Under HR Review', 
    color: 'bg-blue-50 text-blue-700 border-blue-200', 
    icon: FileText,
    step: 2 
  },
  INTERVIEW_SCHEDULED: { 
    label: isThai ? 'นัดหมายสัมภาษณ์แล้ว' : 'Interview Scheduled', 
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-2 ring-indigo-100', 
    icon: Video,
    step: 2 
  },
  ACCEPTED: { 
    label: isThai ? 'ได้รับข้อเสนอฝึกงาน' : 'Offer Received from HR', 
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
    icon: CheckCircle2,
    step: 3 
  },
  COMMITTED: { 
    label: isThai ? 'ยืนยันสถานที่ฝึกงานแล้ว' : 'Active Placement (Confirmed)', 
    color: 'bg-primary-50 text-primary-700 border-primary-300 ring-2 ring-primary-100', 
    icon: Award,
    step: 4 
  },
  CANCEL_REQUESTED: { 
    label: isThai ? 'แจ้งขอยกเลิก (รอ HR อนุมัติ)' : 'Cancellation Pending HR Review', 
    color: 'bg-amber-50 text-amber-800 border-amber-300', 
    icon: AlertTriangle,
    step: 3 
  },
  CANCELLED: { 
    label: isThai ? 'ยกเลิกการฝึกงานแล้ว' : 'Placement Cancelled', 
    color: 'bg-slate-100 text-slate-600 border-slate-300', 
    icon: XCircle,
    step: 0 
  },
  REJECTED: { 
    label: isThai ? 'ไม่ผ่านการคัดเลือก' : 'Declined / Closed', 
    color: 'bg-rose-50 text-rose-700 border-rose-200', 
    icon: XCircle,
    step: 0 
  },
});

export default function MyApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'accepted' | 'rejected'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewingCompanyId, setViewingCompanyId] = useState<string | null>(null);
  const { t, language } = useLanguage();

  // Commitment & Cancellation Modal States
  const [commitTargetApp, setCommitTargetApp] = useState<Application | null>(null);
  const [cancelTargetApp, setCancelTargetApp] = useState<Application | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const { success, error: showError } = useToast();
  const location=useLocation();

  useEffect(() => {
    fetchApplications();
    const timer=setInterval(()=>void fetchApplications(),30000);window.addEventListener('focus',fetchApplications);
    return()=>{clearInterval(timer);window.removeEventListener('focus',fetchApplications);};
  }, []);
  useEffect(()=>{if(!loading&&location.hash.startsWith('#application-')){const id=location.hash.slice(1);requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'center'}));}},[loading,location.hash]);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/applications/my`, {
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

  const committedPlacement = applications.find(
    (app) => app.status === 'COMMITTED' || app.status === 'CANCEL_REQUESTED'
  );

  const handleConfirmCommit = async () => {
    if (!commitTargetApp) return;
    setSubmittingAction(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/applications/${commitTargetApp.id}/commit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        success(`Placement confirmed at ${commitTargetApp.jobPost.company.companyName}! You can now start logging daily entries.`);
        setCommitTargetApp(null);
        fetchApplications();
      } else {
        showError(data.error || 'Failed to confirm placement.');
      }
    } catch (err) {
      showError('Network error. Please try again.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSubmitCancellationRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTargetApp) return;
    if (!cancellationReason.trim()) {
      showError('Please provide a reason for cancellation.');
      return;
    }
    setSubmittingAction(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/applications/${cancelTargetApp.id}/request-cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: cancellationReason.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        success('Cancellation request submitted. Waiting for company HR to review.');
        setCancelTargetApp(null);
        setCancellationReason('');
        fetchApplications();
      } else {
        showError(data.error || 'Failed to submit cancellation request.');
      }
    } catch (err) {
      showError('Network error. Please try again.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const filteredApps = applications.filter((app) => {
    if (activeTab === 'active') return app.status === 'PENDING' || app.status === 'REVIEWING' || app.status === 'INTERVIEW_SCHEDULED';
    if (activeTab === 'accepted') return app.status === 'ACCEPTED' || app.status === 'COMMITTED';
    if (activeTab === 'rejected') return app.status === 'REJECTED' || app.status === 'CANCELLED';
    return true;
  });

  return (
    <div className="workspace-page max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="workspace-page-header flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
              {t.nav.myApplications}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {applications.length} {language === 'th' ? 'รายการทั้งหมด' : 'Submissions Total'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
            {t.applications.title}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {t.applications.subtitle}
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center p-1 bg-white border border-slate-200/80 rounded-2xl shadow-2xs self-start sm:self-auto">
          {[
            { id: 'all', label: `All (${applications.length})` },
            { id: 'active', label: 'In Review' },
            { id: 'accepted', label: 'Offers / Active' },
            { id: 'rejected', label: 'Closed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <ReadinessTasks applications={applications} onOpen={id=>{setActiveTab('all');requestAnimationFrame(()=>document.getElementById(`application-${id}`)?.scrollIntoView({behavior:'smooth',block:'center'}));}}/>

      {/* ── Active Placement Notification Banner ───────────────────────────── */}
      {committedPlacement && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-primary-900 via-indigo-900 to-slate-900 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0 text-primary-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-400/30">
                  {committedPlacement.status === 'CANCEL_REQUESTED' ? 'Cancellation Under Review' : 'Official Active Placement'}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-white mt-1">
                {committedPlacement.jobPost.title} • {committedPlacement.jobPost.company.companyName}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {committedPlacement.status === 'CANCEL_REQUESTED'
                  ? 'Your cancellation request has been submitted to company HR. Waiting for company confirmation.'
                  : 'You are officially placed! Your daily logbook is unlocked. Only one placement can be active at a time.'}
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/logbook"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-xl shadow-md transition-all flex-shrink-0"
          >
            Go to Daily Logbook
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* ── Applications Cards List ────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-44 rounded-3xl bg-white border border-slate-100 p-6 animate-pulse space-y-4">
              <div className="h-6 w-1/3 bg-slate-100 rounded-lg" />
              <div className="h-4 w-1/2 bg-slate-100 rounded-lg" />
              <div className="h-10 w-full bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredApps.length > 0 ? (
        <div className="space-y-4">
          {filteredApps.map((app) => {
            const statusMap = getStatusConfig(language === 'th');
            const status = statusMap[app.status] || statusMap.PENDING;
            const StatusIcon = status.icon;
            const isExpanded = expandedId === app.id;
            const companyLogo = app.jobPost.company.logoUrl;
            const isCommitted = app.status === 'COMMITTED';
            const isCancelRequested = app.status === 'CANCEL_REQUESTED';
            const isOfferWaiting = app.status === 'ACCEPTED';
            const isInterviewScheduled = app.status === 'INTERVIEW_SCHEDULED';
            const hasOtherCommitment = !!committedPlacement && committedPlacement.id !== app.id;

            return (
              <div 
                key={app.id}
                id={`application-${app.id}`}
                className={`bg-white rounded-3xl border transition-all duration-200 p-6 sm:p-7 space-y-6 shadow-xs hover:shadow-md ${
                  isCommitted 
                    ? 'border-primary-300 ring-2 ring-primary-100/70' 
                    : isCancelRequested
                    ? 'border-amber-200 bg-amber-50/20'
                    : isInterviewScheduled
                    ? 'border-indigo-300 ring-2 ring-indigo-100/70 bg-gradient-to-b from-white to-indigo-50/10'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Top Info Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setViewingCompanyId(app.jobPost.company.id || app.jobPost.companyProfileId || null)}
                      className="w-13 h-13 rounded-2xl bg-white p-1 border border-slate-200 shadow-md flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:border-primary-400 hover:scale-105 transition-all"
                      title="View Company Profile"
                    >
                      {companyLogo ? (
                        <img 
                          src={companyLogo.startsWith('http') ? companyLogo : `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${companyLogo}`} 
                          alt={app.jobPost.company.companyName} 
                          className="w-full h-full object-contain rounded-xl"
                        />
                      ) : (
                        <div className="w-full h-full rounded-xl bg-gradient-to-tr from-primary-500 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-inner">
                          {app.jobPost.company.companyName.charAt(0)}
                        </div>
                      )}
                    </button>

                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">
                        {app.jobPost.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mt-1">
                        <button
                          type="button"
                          onClick={() => setViewingCompanyId(app.jobPost.company.id || app.jobPost.companyProfileId || null)}
                          className="flex items-center gap-1 text-primary-600 hover:text-primary-700 transition-colors cursor-pointer"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          {app.jobPost.company.companyName}
                        </button>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          Applied {new Date(app.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge & Primary Action */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold border ${status.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      {status.label}
                    </span>

                    {/* Offer Decision Action: Accept Offer */}
                    {isOfferWaiting && !hasOtherCommitment && (
                      <button
                        onClick={() => setCommitTargetApp(app)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md transition-all cursor-pointer"
                        title="Accept this offer and confirm your placement"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {language === 'th' ? 'ตอบรับข้อเสนอ & ยืนยันฝึกงาน' : 'Accept Offer & Start'}
                      </button>
                    )}

                    {/* Offer on hold when student already committed elsewhere */}
                    {isOfferWaiting && hasOtherCommitment && (
                      <span className="text-[11px] font-semibold text-slate-400 italic">
                        ({language === 'th' ? `ระงับสิทธิ์ • คุณได้ยืนยันกับ ${committedPlacement?.jobPost.company.companyName} แล้ว` : `On hold • Already committed to ${committedPlacement?.jobPost.company.companyName}`})
                      </span>
                    )}

                    {/* Committed Placement Actions */}
                    {isCommitted && (
                      <button
                        onClick={() => {
                          setCancelTargetApp(app);
                          setCancellationReason('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        {language === 'th' ? 'แจ้งขอยกเลิก' : 'Request Cancellation'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Interview Scheduled Notice Box */}
                {isInterviewScheduled && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/90 border border-indigo-200 text-xs text-indigo-950 space-y-2 shadow-xs">
                    <div className="font-extrabold flex items-center gap-2 text-indigo-900 text-sm">
                      <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                        <Video className="w-3.5 h-3.5 text-indigo-700" />
                      </div>
                      {t.applications.interviewNoticeTitle}
                    </div>
                    <p className="text-indigo-900 leading-relaxed font-medium pl-8">
                      {t.applications.interviewNoticeDesc}
                    </p>
                    <div className="pt-1 flex items-center gap-2 text-[11px] font-bold text-indigo-700 pl-8">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                      {t.applications.interviewActionHint}
                    </div>
                  </div>
                )}

                {/* Cancellation Request Notice Box */}
                {isCancelRequested && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800">
                      <Clock className="w-4 h-4 text-amber-600" />
                      Cancellation Request Pending Company HR Approval
                    </div>
                    <p className="text-amber-800">
                      Reason provided: <span className="font-semibold italic">"{app.cancellationReason || 'Not specified'}"</span>
                    </p>
                    <p className="text-[11px] text-amber-700 pt-1">
                      Note: You remain registered in this placement until company HR confirms your release.
                    </p>
                  </div>
                )}

                <ReadinessPanel applicationId={app.id} value={app.readiness} onUpdated={fetchApplications}/>

                      {/* 4-Stage Progress Stepper */}
                {app.status !== 'REJECTED' && app.status !== 'CANCELLED' && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="grid grid-cols-4 gap-2 text-center relative">
                      {[
                        { stepNum: 1, label: language === 'th' ? 'ส่งใบสมัครแล้ว' : 'Submitted' },
                        { 
                          stepNum: 2, 
                          label: isInterviewScheduled 
                            ? (language === 'th' ? 'นัดสัมภาษณ์' : 'Interview') 
                            : (language === 'th' ? 'กำลังพิจารณา' : 'Under Review') 
                        },
                        { stepNum: 3, label: language === 'th' ? 'ได้รับข้อเสนอ' : 'Offer Received' },
                        { stepNum: 4, label: language === 'th' ? 'ยืนยันเข้าฝึกงาน' : 'Confirmed Working' },
                      ].map((s) => {
                        const isDone = status.step >= s.stepNum;
                        const isCurrent = status.step === s.stepNum;

                        return (
                          <div key={s.stepNum} className="flex flex-col items-center gap-1.5 relative z-10">
                            <div 
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                isDone 
                                  ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/30' 
                                  : 'bg-slate-200 text-slate-500'
                              } ${isCurrent ? 'ring-4 ring-primary-100 scale-110' : ''}`}
                            >
                              {isDone ? '✓' : s.stepNum}
                            </div>
                            <span className={`text-[11px] font-bold ${isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                              {s.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Cover Letter Dropdown */}
                {app.coverLetter && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : app.id)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {isExpanded ? 'Hide Cover Letter' : 'View Submitted Cover Letter'}
                    </button>
                    {isExpanded && (
                      <p className="mt-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed">
                        "{app.coverLetter}"
                      </p>
                    )}
                  </div>
                )}

                <Link to={`/dashboard/screening?applicationId=${app.id}`} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900"><FileText size={14}/>{language==='th'?'ดูไฟล์ ผลตรวจ และแบบทดสอบ':'View files, feedback & questionnaire'}</Link>
                {/* Attached Documents & Artifacts */}
                {app.documents && app.documents.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400">Attached Artifacts:</span>
                    {app.documents.map((doc, dIdx) => {
                      const isLink = doc.fileUrl.startsWith('http://') || doc.fileUrl.startsWith('https://');
                      const url = isLink ? doc.fileUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${doc.fileUrl}`;
                      return (
                        <a
                          key={doc.id || dIdx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          {isLink ? <ExternalLink className="w-3 h-3 text-indigo-600" /> : <FileText className="w-3 h-3 text-primary-600" />}
                          <span>{doc.title || 'Document'}</span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto">
            <Briefcase className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">No applications in this view</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Start browsing available internship opportunities to submit your first application.
            </p>
          </div>
          <Link
            to="/dashboard/jobs"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-bold text-xs rounded-xl hover:bg-primary-700 shadow-md shadow-primary-500/20 transition-all"
          >
            Explore Internships
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* ── Commitment Confirmation Modal ───────────────────────────────────── */}
      {commitTargetApp && (
        <div className="workspace-dialog fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Confirm Internship Placement
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  You are committing to join {commitTargetApp.jobPost.company.companyName} as a {commitTargetApp.jobPost.title}.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Important Program Rules:
              </div>
              <ul className="list-disc pl-4 space-y-1 text-amber-800/90 text-[11px] leading-relaxed">
                <li>You can only commit to <strong>ONE</strong> internship company at a time.</li>
                <li>Confirming this placement will <strong>automatically close</strong> your other applications and pending offers.</li>
                <li>Once working, you cannot leave or take another job until you submit a cancellation request and it is <strong>approved by the company</strong>.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCommitTargetApp(null)}
                disabled={submittingAction}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCommit}
                disabled={submittingAction}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all cursor-pointer"
              >
                {submittingAction ? 'Confirming...' : 'Yes, Confirm Placement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancellation Request Modal ──────────────────────────────────────── */}
      {cancelTargetApp && (
        <div className="workspace-dialog fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <form onSubmit={handleSubmitCancellationRequest} className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Request Internship Cancellation
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {cancelTargetApp.jobPost.company.companyName} • {cancelTargetApp.jobPost.title}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Reason for Cancellation <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Explain the reason for leaving or cancelling your placement (e.g. academic schedule conflict, health reasons, relocation)..."
                required
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none resize-none leading-relaxed"
              />
              <p className="text-[11px] text-slate-400">
                This request will be sent directly to the company HR. Your placement will only be released once the company confirms and approves.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelTargetApp(null)}
                disabled={submittingAction}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Keep Placement
              </button>
              <button
                type="submit"
                disabled={submittingAction}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-all cursor-pointer"
              >
                {submittingAction ? 'Submitting...' : 'Submit Request to Company'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Public Company Profile Modal ────────────────────────────────────── */}
      <PublicProfileModal
        isOpen={!!viewingCompanyId}
        onClose={() => setViewingCompanyId(null)}
        profileType="company"
        profileId={viewingCompanyId}
      />
    </div>
  );
}
