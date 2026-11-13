import LogbookFileLink from '../../components/LogbookFileLink';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Building2, 
  ExternalLink, 
  X, 
  Printer,
  Pencil,
  Trash2,
  Laptop,
  Building,
  RefreshCw,
  Link as LinkIcon,
  Upload,
  FileText,
  Lock,
  Briefcase,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { useLanguage } from '../../context/LanguageContext';
import { 
  parsePinPoints, 
  parseAttachmentLinks,
  type AttachmentLink,
  type DailyLog,
  type GroupedWeek 
} from '../../utils/logbookUtils';

interface LogbookData {
  student: any;
  logs: DailyLog[];
  groupedWeeks: GroupedWeek[];
  totalHours: number;
  approvedHours: number;
  targetHours: number;
  activePlacement: any;
}

export default function StudentLogbook() {
  const navigate = useNavigate();
  const { t, formatDate, language } = useLanguage();
  const [data, setData] = useState<LogbookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({});
  const { success, error: showError } = useToast();

  // Form State for Daily Log
  const [editingId, setEditingId] = useState<string | null>(null);
  const [logDate, setLogDate] = useState<string>(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()));
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [hoursWorked, setHoursWorked] = useState<number>(8.0);
  const [workModality, setWorkModality] = useState<'ON_SITE' | 'REMOTE' | 'HYBRID'>('ON_SITE');
  const [supervisorName, setSupervisorName] = useState<string>('');
  const [actualDeliverables, setActualDeliverables] = useState<string[]>(['']);
  const [problemsAndSolutions, setProblemsAndSolutions] = useState<string>('');
  const [learnings, setLearnings] = useState<string>('');
  const [attachmentLinks, setAttachmentLinks] = useState<AttachmentLink[]>([]);

  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const isSelectedDateBackdated = logDate < todayStr;

  useEffect(() => {
    fetchLogbook();
  }, []);

  const fetchLogbook = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/logbook/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
        
        // Auto-expand latest weeks by default
        const initialExpanded: Record<number, boolean> = {};
        if (result.groupedWeeks && result.groupedWeeks.length > 0) {
          result.groupedWeeks.forEach((w: GroupedWeek) => {
            initialExpanded[w.weekNumber] = true;
          });
          setWeekNumber(result.groupedWeeks[0].weekNumber);
        }
        setExpandedWeeks(initialExpanded);
      }
    } catch (error) {
      console.error(error);
      showError(t.toasts.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    if (!data?.activePlacement) {
      showError(t.logbook.noPlacementDesc);
      return;
    }

    setEditingId(null);
    setLogDate(todayStr);
    
    // Estimate current week number
    const currentLatestWeek = data?.groupedWeeks && data.groupedWeeks.length > 0 
      ? data.groupedWeeks[0].weekNumber 
      : 1;
    setWeekNumber(currentLatestWeek);
    
    setHoursWorked(8.0);
    setWorkModality('ON_SITE');
    setSupervisorName('');
    setActualDeliverables(['']);
    setProblemsAndSolutions('');
    setLearnings('');
    setAttachmentLinks([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (log: DailyLog) => {
    setEditingId(log.id);
    const dateFormatted = log.logDate ? new Date(log.logDate).toISOString().split('T')[0] : todayStr;
    setLogDate(dateFormatted);
    setWeekNumber(log.weekNumber || 1);
    setHoursWorked(log.hoursWorked || 8.0);
    setWorkModality(log.workModality || 'ON_SITE');
    setSupervisorName(log.supervisorName || '');
    
    const parsedActual = parsePinPoints(log.tasksDone);
    setActualDeliverables(parsedActual.length > 0 ? parsedActual : ['']);

    setProblemsAndSolutions(log.problemsAndSolutions || '');
    setLearnings(log.learnings || '');

    const parsedLinks = parseAttachmentLinks(log.attachmentUrl);
    setAttachmentLinks(parsedLinks);

    setIsModalOpen(true);
  };

  const handleDeleteLog = async (logId: string) => {
    if (!window.confirm(t.logbook.confirmDelete)) return;
    setDeletingId(logId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/logbook/${logId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        success(t.toasts.logDeleted);
        fetchLogbook();
      } else {
        const err = await res.json();
        showError(err.error || t.toasts.loadFailed);
      }
    } catch (error) {
      showError(t.toasts.loadFailed);
    } finally {
      setDeletingId(null);
    }
  };

  // Deliverables Handlers
  const handleAddDeliverable = () => {
    setActualDeliverables([...actualDeliverables, '']);
  };
  const handleDeliverableChange = (index: number, val: string) => {
    const updated = [...actualDeliverables];
    updated[index] = val;
    setActualDeliverables(updated);
  };
  const handleRemoveDeliverable = (index: number) => {
    if (actualDeliverables.length === 1) {
      setActualDeliverables(['']);
    } else {
      setActualDeliverables(actualDeliverables.filter((_, i) => i !== index));
    }
  };

  // Attachment Links Handlers
  const handleAddAttachmentLink = () => {
    setAttachmentLinks([...attachmentLinks, { title: '', url: '' }]);
  };
  const handleAttachmentChange = (index: number, field: 'title' | 'url', val: string) => {
    const updated = [...attachmentLinks];
    updated[index] = { ...updated[index], [field]: val };
    setAttachmentLinks(updated);
  };
  const handleRemoveAttachmentLink = (index: number) => {
    setAttachmentLinks(attachmentLinks.filter((_, i) => i !== index));
  };

  // Direct File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError(language === 'th' ? 'ขนาดไฟล์ต้องไม่เกิน 5MB' : 'File size must be under 5MB');
      return;
    }

    setUploadingFile(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'REPORT');
      formData.append('applicationId', activePlacement?.id || '');

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/upload/logbook`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const result = await res.json();
        const fileUrl = result.document?.fileUrl || result.url;
        const newAttachment: AttachmentLink = {
          title: `[File] ${file.name}`,
          url: fileUrl
        };
        setAttachmentLinks(previous => [...previous, newAttachment]);
        success(language === 'th' ? `อัปโหลด ${file.name} สำเร็จ!` : `Uploaded ${file.name} successfully!`);
      } else {
        const err = await res.json();
        showError(err.error || t.toasts.loadFailed);
      }
    } catch (error) {
      showError(t.toasts.loadFailed);
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleCreateOrUpdateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadingFile || submitting) return;
    setSubmitting(true);

    const validActual = actualDeliverables.map((s) => s.trim()).filter((s) => s.length > 0);
    const validLinks = attachmentLinks.filter((l) => l.url.trim().length > 0);

    if (validActual.length === 0) {
      showError(t.toasts.fillTaskError);
      setSubmitting(false);
      return;
    }

    if (!logDate) {
      showError(t.toasts.dateRequiredError);
      setSubmitting(false);
      return;
    }

    if (logDate > todayStr) {
      showError(t.toasts.futureDateError);
      setSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/logbook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          id: editingId || undefined,
          logDate,
          weekNumber,
          workModality,
          supervisorName,
          tasksDone: JSON.stringify(validActual),
          problemsAndSolutions,
          learnings,
          hoursWorked: Number(hoursWorked),
          attachmentUrl: validLinks.length > 0 ? JSON.stringify(validLinks) : null
        })
      });

      if (res.ok) {
        success(editingId ? t.toasts.logUpdated : t.toasts.logSaved);
        setIsModalOpen(false);
        setEditingId(null);
        fetchLogbook();
      } else {
        const err = await res.json();
        showError(err.error || t.toasts.loadFailed);
      }
    } catch (error) {
      showError(t.toasts.loadFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleWeekExpansion = (weekNum: number) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [weekNum]: !prev[weekNum]
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const logs = data?.logs || [];
  const groupedWeeks = data?.groupedWeeks || [];
  const totalHours = data?.totalHours || 0;
  const approvedHours = data?.approvedHours || 0;
  const activePlacement = data?.activePlacement;
  const evaluation = activePlacement?.evaluation;

  const getModalityBadge = (modality: string) => {
    switch (modality) {
      case 'REMOTE':
        return { label: t.common.modalities.remote, icon: Laptop, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'HYBRID':
        return { label: t.common.modalities.hybrid, icon: RefreshCw, color: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: t.common.modalities.onSite, icon: Building, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
  };

  const isFileAttachment = (link: AttachmentLink) => {
    return link.title.startsWith('[File]') || 
           link.url.includes('/uploads/') || 
           /\.(pdf|png|jpg|jpeg|doc|docx|zip)$/i.test(link.url);
  };

  const formatLogDate = (dateStr: string) => {
    return formatDate(dateStr, {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="workspace-page max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="workspace-page-header flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-100">
              {t.logbook.operationalJournal}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t.logbook.title}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {t.logbook.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {evaluation && (
            <button
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-bold text-xs shadow-2xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              {t.logbook.viewOfficialReport}
            </button>
          )}

          <button
            id="add-daily-log-btn"
            onClick={handleOpenCreate}
            disabled={!activePlacement}
            title={!activePlacement ? t.logbook.noPlacementTitle : t.logbook.addDailyLog}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activePlacement
                ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-md shadow-primary-500/20 hover:from-primary-700 hover:to-indigo-700 cursor-pointer'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
            }`}
          >
            {!activePlacement ? <Lock className="w-4 h-4 text-slate-400" /> : <Plus className="w-4 h-4" />}
            {t.logbook.addDailyLog}
          </button>
        </div>
      </div>

      {/* ── Progress & Placement Overview Cards ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Hours & Verification Overview */}
        <div className="md:col-span-2 bg-white rounded-3xl p-7 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.logbook.totalLoggedHours}</p>
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">
                {totalHours} <span className="text-base text-slate-400 font-bold">{t.common.hours}</span>
              </h3>
            </div>
            <div className="text-right">
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-xs inline-flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {approvedHours} {t.logbook.hoursApproved}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 text-xs font-bold text-slate-600 pt-3 border-t border-slate-100">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">{t.logbook.totalLogged}</span>
              <span className="text-base font-extrabold text-slate-900">{totalHours} {t.common.hrs}</span>
            </div>
            <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100">
              <span className="text-emerald-700/80 block text-[10px] uppercase font-semibold">{t.logbook.approved}</span>
              <span className="text-base font-extrabold text-emerald-800">{approvedHours} {t.common.hrs}</span>
            </div>
            <div className="bg-indigo-50/70 p-3 rounded-2xl border border-indigo-100">
              <span className="text-indigo-700/80 block text-[10px] uppercase font-semibold">{t.logbook.dailyEntries}</span>
              <span className="text-base font-extrabold text-indigo-800">{logs.length} {t.common.days}</span>
            </div>
            <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-100">
              <span className="text-purple-700/80 block text-[10px] uppercase font-semibold">{t.logbook.activeWeeks}</span>
              <span className="text-base font-extrabold text-purple-800">{groupedWeeks.length} {t.common.weeks}</span>
            </div>
          </div>
        </div>

        {/* Company & Role Card */}
        <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{t.logbook.placementOrg}</p>
            {activePlacement ? (
              <div>
                <h4 className="text-base font-extrabold text-slate-900">
                  {activePlacement.jobPost?.title}
                </h4>
                <p className="text-xs font-bold text-primary-600 flex items-center gap-1 mt-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {activePlacement.jobPost?.company?.companyName}
                </p>
              </div>
            ) : (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200/80 rounded-xl p-3 my-2 flex items-center gap-2">
                <Lock className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <span>{t.logbook.noPlacementTitle}</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {t.logbook.standardReq}
          </div>
        </div>
      </div>

      {/* ── Active Placement Required Banner ─────────────────────────────────── */}
      {!activePlacement && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-200 rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0 text-amber-700 shadow-2xs">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-amber-950">
                {t.logbook.noPlacementTitle}
              </h4>
              <p className="text-xs sm:text-sm text-amber-800/90 mt-1 leading-relaxed">
                {t.logbook.noPlacementDesc}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap">
            <button
              onClick={() => navigate('/dashboard/applications')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              {t.nav.myApplications}
            </button>
            <button
              onClick={() => navigate('/dashboard/jobs')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Briefcase className="w-4 h-4" />
              {t.logbook.browseOpenings}
            </button>
          </div>
        </div>
      )}

      {/* ── Daily Logs Grouped by Week ──────────────────────────────────────── */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              {t.logbook.groupedWeeksTitle}
            </h3>
            <p className="text-xs text-slate-500">
              {t.logbook.groupedWeeksSubtitle}
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            {groupedWeeks.length} {t.logbook.weeksRecorded}
          </span>
        </div>

        {groupedWeeks.length > 0 ? (
          <div className="space-y-6">
            {groupedWeeks.map((week) => {
              const isExpanded = expandedWeeks[week.weekNumber] ?? true;

              return (
                <div 
                  key={week.weekNumber} 
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden transition-all"
                >
                  {/* Week Header Bar */}
                  <div 
                    onClick={() => toggleWeekExpansion(week.weekNumber)}
                    className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-primary-600 text-white font-black text-base flex items-center justify-center shadow-xs">
                        W{week.weekNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-extrabold text-slate-900">
                            {t.logbook.weekPrefix} {week.weekNumber}
                          </h4>
                          <span className="text-xs text-slate-500 font-medium">
                            • {formatDate(week.startDate, { month: 'short', day: 'numeric' })} - {formatDate(week.endDate, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          {week.hasBackdated && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              {t.logbook.hasBackdated}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {week.days.length} {t.logbook.dailyEntries}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className="text-xs font-black px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-800 shadow-2xs">
                        {week.totalHours} {t.common.hrs}
                      </span>
                      {week.mentorApproved ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t.common.status.approved} {week.mentorRating ? `(${language === 'th' ? 'เฉลี่ยรายวัน' : 'Daily average'} ${week.mentorRating}/5)` : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          {week.approvedHours > 0 ? `${week.approvedHours}/${week.totalHours} ${t.common.hrs} ${t.common.status.approved}` : t.logbook.pendingReview}
                        </span>
                      )}
                      <button 
                        type="button"
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Week Mentor Feedback Banner if exists */}
                  {week.mentorFeedback && (
                    <div className="px-6 py-3 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-900">
                      <span className="flex items-center gap-1.5 font-bold">
                        <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                        {t.logbook.mentorReview} <span className="font-normal italic">"{week.mentorFeedback}"</span>
                      </span>
                      {week.mentorRating && (
                        <span className="font-black text-amber-600">
                          {language === 'th' ? 'เฉลี่ยคะแนนรายวัน' : 'Average daily rating'} ({week.mentorRating}/5)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Daily Log Entries List */}
                  {isExpanded && (
                    <div className="p-5 sm:p-6 space-y-4 bg-slate-50/30">
                      {week.days.map((log) => {
                        const modalityInfo = getModalityBadge(log.workModality);
                        const ModalityIcon = modalityInfo.icon;
                        const actualItems = parsePinPoints(log.tasksDone);
                        const linkItems = parseAttachmentLinks(log.attachmentUrl);

                        return (
                          <div 
                            key={log.id} 
                            className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all space-y-4"
                          >
                            {/* Day Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-primary-600" />
                                    {formatLogDate(log.logDate)}
                                  </span>

                                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${modalityInfo.color}`}>
                                    <ModalityIcon className="w-3 h-3" />
                                    {modalityInfo.label}
                                  </span>

                                  {log.isBackdated && (
                                    <span 
                                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs"
                                    >
                                      ⏱️ {t.logbook.backdatedBadge}
                                    </span>
                                  )}
                                </div>

                                {log.supervisorName && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    {t.logbook.supervisorNameLabel}: <strong className="text-slate-700">{log.supervisorName}</strong>
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-800">
                                  {log.hoursWorked} {t.common.hours}
                                </span>

                                {log.mentorApproved ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    {t.common.status.approved}
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                                    {t.logbook.pendingReview} ⏳
                                  </span>
                                )}

                                {activePlacement && !log.mentorApproved && (
                                  <button
                                    onClick={() => handleOpenEdit(log)}
                                    className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                                    title={t.logbook.modalEditTitle}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                )}

                                {activePlacement && !log.mentorApproved && (
                                  <button
                                    onClick={() => handleDeleteLog(log.id)}
                                    disabled={deletingId === log.id}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                    title={t.common.delete}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Actual Tasks / Deliverables (Pin Points) */}
                            <div className="space-y-2 text-xs">
                              <p className="font-bold text-[10px] uppercase tracking-wider text-primary-700 flex items-center gap-1">
                                ✅ {t.logbook.actualTasksCompleted}
                              </p>
                              <ul className="space-y-1.5 text-slate-700">
                                {actualItems.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                    <span className="leading-relaxed">{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Problems & Learnings */}
                            {(log.problemsAndSolutions || log.learnings) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                {log.problemsAndSolutions && (
                                  <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-100">
                                    <p className="font-bold text-[10px] uppercase tracking-wider text-amber-800 mb-1 flex items-center gap-1">
                                      ⚠️ {t.logbook.problemsAndSolutions}
                                    </p>
                                    <p className="text-amber-900 leading-relaxed whitespace-pre-line">
                                      {log.problemsAndSolutions}
                                    </p>
                                  </div>
                                )}
                                {log.learnings && (
                                  <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100">
                                    <p className="font-bold text-[10px] uppercase tracking-wider text-indigo-800 mb-1 flex items-center gap-1">
                                      💡 {t.logbook.keyLearnings}
                                    </p>
                                    <p className="text-indigo-900 leading-relaxed whitespace-pre-line">
                                      {log.learnings}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Attached Artifacts */}
                            {linkItems.length > 0 && (
                              <div className="space-y-2 text-xs pt-1">
                                <p className="font-bold text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                  <LinkIcon className="w-3 h-3 text-primary-500" />
                                  {t.logbook.attachedArtifacts} ({linkItems.length})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {linkItems.map((link, idx) => {
                                    const isFile = isFileAttachment(link);
                                    return (
                                      <LogbookFileLink key={idx} href={link.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-50 hover:bg-primary-100 border border-primary-200 text-xs font-bold text-primary-700 shadow-2xs transition-all"
                                      >
                                        {isFile ? <FileText className="w-3.5 h-3.5 text-indigo-600" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                        {link.title || t.logbook.viewArtifact}
                                      </LogbookFileLink>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Individual Day Mentor Feedback */}
                            {(log.mentorFeedback || log.mentorRating) && (
                              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                                <span className="font-bold text-slate-700">{t.logbook.mentorReview} </span>
                                <span className="italic text-slate-600">"{log.mentorFeedback}"</span>
                                {log.mentorRating && (
                                  <span className="ml-2 font-black text-amber-600">({log.mentorRating} ★)</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 border border-slate-200 border-dashed rounded-3xl space-y-3 bg-white">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-900">{t.logbook.noDailyLogsTitle}</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {t.logbook.noDailyLogsDesc}
            </p>
          </div>
        )}
      </div>

      {/* ── Add / Edit Daily Log Modal ─────────────────────────────────────── */}
      {isModalOpen && (
        <div className="workspace-dialog fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-7 py-5 bg-gradient-to-r from-slate-900 to-slate-950 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400">
                  {t.logbook.modalTag}
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  {editingId ? t.logbook.modalEditTitle : t.logbook.modalCreateTitle}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateLog} className="p-7 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Row 1: Work Date & Backdated Warning Badge */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-primary-600" />
                    {t.logbook.workDateLabel} *
                  </label>
                  {isSelectedDateBackdated && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      ⏱️ {t.logbook.backdatedBadge}
                    </span>
                  )}
                </div>

                <input
                  type="date"
                  required
                  max={todayStr}
                  className="w-full border border-slate-200 bg-white rounded-xl p-3 text-sm font-semibold focus:ring-2 focus:ring-primary-500"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                />

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>* {t.logbook.cannotSelectFuture}</span>
                  {isSelectedDateBackdated && (
                    <span className="text-amber-700 font-medium">{t.logbook.backdatedSystemAlert}</span>
                  )}
                </div>
              </div>

              {/* Row 2: Week Number & Daily Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {t.logbook.weekNumberLabel}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    required
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 font-semibold"
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(Number(e.target.value))}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">{t.logbook.weekNumberHint}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {t.logbook.hoursWorkedLabel} *
                  </label>
                  <div className="space-y-1.5">
                    <input
                      type="number"
                      min={1}
                      max={12}
                      step={0.5}
                      required
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 font-black text-primary-700"
                      value={hoursWorked}
                      onChange={(e) => setHoursWorked(Number(e.target.value))}
                    />
                    <div className="log-hours-presets flex gap-1.5">
                      {[4, 6, 8, 10].map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setHoursWorked(h)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                            hoursWorked === h
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {h} {t.common.hrs} {h === 8 ? '(Default)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Work Modality & Supervisor Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {t.logbook.workModalityLabel}
                  </label>
                  <div className="log-modality-options grid grid-cols-3 gap-2">
                    {[
                      { id: 'ON_SITE', label: t.common.modalities.onSite },
                      { id: 'REMOTE', label: t.common.modalities.remote },
                      { id: 'HYBRID', label: t.common.modalities.hybrid }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setWorkModality(item.id as any)}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all truncate ${
                          workModality === item.id
                            ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                        title={item.label}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {t.logbook.supervisorNameLabel}
                  </label>
                  <input
                    type="text"
                    placeholder={t.logbook.supervisorNamePlaceholder}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500"
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 4: Tasks Completed (Pin Points) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {t.logbook.tasksDoneLabel} *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddDeliverable}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t.logbook.addTaskBtn}
                  </button>
                </div>

                <div className="space-y-2">
                  {actualDeliverables.map((task, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary-600 w-5">{idx + 1}.</span>
                      <input
                        type="text"
                        required={idx === 0}
                        placeholder={t.logbook.taskPlaceholder}
                        className="flex-1 border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-500"
                        value={task}
                        onChange={(e) => handleDeliverableChange(idx, e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveDeliverable(idx)}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                        title={t.common.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 5: Problems & Solutions */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {t.logbook.problemsLabel}
                </label>
                <textarea
                  rows={2}
                  placeholder={t.logbook.problemsPlaceholder}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500"
                  value={problemsAndSolutions}
                  onChange={(e) => setProblemsAndSolutions(e.target.value)}
                ></textarea>
              </div>

              {/* Row 6: Key Learnings */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {t.logbook.learningsLabel} *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder={t.logbook.learningsPlaceholder}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500"
                  value={learnings}
                  onChange={(e) => setLearnings(e.target.value)}
                ></textarea>
              </div>

              {/* Row 7: Attachments */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-primary-600" />
                    {t.logbook.attachmentBoxTitle}
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 cursor-pointer transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingFile ? t.logbook.uploading : t.logbook.uploadFileBtn}
                      <input 
                        type="file" 
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip" 
                        className="hidden" 
                        disabled={uploadingFile} 
                        onChange={handleFileUpload} 
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleAddAttachmentLink}
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t.logbook.addLinkBtn}
                    </button>
                  </div>
                </div>

                {attachmentLinks.length > 0 ? (
                  <div className="space-y-2">
                    {attachmentLinks.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={t.logbook.linkLabelPlaceholder}
                          className="w-1/3 border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-primary-500"
                          value={link.title}
                          onChange={(e) => handleAttachmentChange(idx, 'title', e.target.value)}
                        />
                        <input
                          type={link.url.startsWith('/uploads/') ? 'text' : 'url'}
                          readOnly={link.url.startsWith('/uploads/')}
                          placeholder={t.logbook.linkUrlPlaceholder}
                          className="flex-1 border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-primary-500"
                          value={link.url}
                          onChange={(e) => handleAttachmentChange(idx, 'url', e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachmentLink(idx)}
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                          title={t.common.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    {t.logbook.attachmentHint}
                  </p>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-5 py-3 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingFile}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-bold text-xs rounded-xl hover:from-primary-700 hover:to-indigo-700 shadow-md shadow-primary-500/20 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? t.common.saving : editingId ? t.logbook.updateDailyLogBtn : t.logbook.saveDailyLogBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Official Report Modal ─────────────────────────────────────────── */}
      {showReportModal && (
        <div className="workspace-dialog fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 my-8 print:shadow-none print:border-none print:m-0">
            {/* Action Bar (Hidden in Print) */}
            <div className="px-7 py-4 bg-slate-900 text-white flex justify-between items-center print:hidden">
              <span className="text-xs font-bold">{t.logbook.reportHeader}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {t.logbook.printReport}
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-slate-400 hover:text-white text-sm font-bold ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="internflow-report p-5 sm:p-10 space-y-8 bg-white text-slate-900 font-sans">
              <div className="border-b-2 border-slate-900 pb-6 text-center space-y-1">
                <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900">
                  InternFlow Performance Report
                </h1>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  {data?.student?.university ? `${data?.student?.university} • ` : ''}{t.logbook.facultyOf} {data?.student?.faculty || 'General Studies'} • {t.logbook.departmentOf} {data?.student?.major || 'General'}
                </p>
                <h2 className="text-lg font-extrabold text-primary-700 pt-2">
                  {t.logbook.reportTitle}
                </h2>
              </div>

              {/* Student & Company Data */}
              <div className="grid grid-cols-2 gap-6 text-xs bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div className="space-y-1.5">
                  <p><span className="font-bold text-slate-500">{t.logbook.studentName}</span> <span className="font-extrabold">{data?.student?.user?.name}</span></p>
                  <p><span className="font-bold text-slate-500">{t.logbook.university}</span> {data?.student?.university || 'Not specified'}</p>
                  <p><span className="font-bold text-slate-500">{t.logbook.studentId}</span> {data?.student?.studentId || 'N/A'}</p>
                  <p><span className="font-bold text-slate-500">{t.logbook.academicYear}</span> {data?.student?.year}</p>
                </div>
                <div className="space-y-1.5">
                  <p><span className="font-bold text-slate-500">{t.logbook.hostOrg}</span> <span className="font-extrabold">{activePlacement?.jobPost?.company?.companyName}</span></p>
                  <p><span className="font-bold text-slate-500">{t.logbook.positionTitle}</span> {activePlacement?.jobPost?.title}</p>
                  <p><span className="font-bold text-slate-500">{t.logbook.totalHoursCompleted}</span> <span className="font-extrabold text-emerald-700">{approvedHours} {t.common.hours}</span></p>
                </div>
              </div>

              {/* Verification Summary */}
              <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs">
                <p className="font-bold text-emerald-900 uppercase text-[10px]">{t.logbook.mentorSignoffs}</p>
                <p className="text-base font-black text-emerald-800 mt-0.5">
                  {approvedHours} {t.common.hours} {t.common.status.approved} ({groupedWeeks.length} {t.common.weeks}, {logs.length} {t.logbook.dailyEntries})
                </p>
              </div>

              {/* Evaluation Rubric Results */}
              {evaluation && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                    {t.logbook.evaluationRubricTitle}
                  </h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{t.logbook.workQuality}</p>
                      <p className="text-xl font-black text-primary-600 mt-1">{evaluation.workQualityScore} / 5</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{t.logbook.punctuality}</p>
                      <p className="text-xl font-black text-primary-600 mt-1">{evaluation.punctualityScore} / 5</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{t.logbook.teamwork}</p>
                      <p className="text-xl font-black text-primary-600 mt-1">{evaluation.teamworkScore} / 5</p>
                    </div>
                  </div>
                  {evaluation.feedback && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <p className="font-bold text-slate-600 mb-1">{t.logbook.mentorRemarks}</p>
                      <p className="italic text-slate-700">"{evaluation.feedback}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-12 pt-8 text-center text-xs">
                <div className="border-t border-slate-300 pt-3">
                  <p className="font-bold text-slate-800">{t.logbook.mentorSignature}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{t.logbook.authorizedRep}</p>
                </div>
                <div className="border-t border-slate-300 pt-3">
                  <p className="font-bold text-slate-800">{t.logbook.studentSignature}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{t.logbook.acknowledgedAccepted}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
