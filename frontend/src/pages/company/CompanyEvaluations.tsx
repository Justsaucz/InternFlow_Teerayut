import LogbookFileLink from '../../components/LogbookFileLink';
import { useEffect, useState } from 'react';
import { 
  Users, 
  CheckCircle2, 
  X,
  Calendar,
  Laptop,
  Building,
  RefreshCw,
  ExternalLink,
  Link as LinkIcon,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Building2,
  Check
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { useLanguage } from '../../context/LanguageContext';
import { 
  parsePinPoints, 
  parseAttachmentLinks, 
  type DailyLog, 
  type GroupedWeek 
} from '../../utils/logbookUtils';
import PublicProfileModal from '../../components/modals/PublicProfileModal';

interface StudentInfo {
  id: string;
  studentId: string;
  faculty: string;
  major: string;
  university?: string | null;
  year: number;
  avatarUrl?: string | null;
  user: { id?: string; name: string; email: string; avatarUrl?: string | null };
  dailyLogs?: DailyLog[];
  weeklyLogs?: any[];
}

interface ActiveIntern {
  applicationId: string;
  status: string;
  jobTitle: string;
  student: StudentInfo;
  totalHours: number;
  approvedHours: number;
  targetHours: number;
  evaluation: any;
}

export default function CompanyEvaluations() {
  const { t, formatDate, language } = useLanguage();
  const [interns, setInterns] = useState<ActiveIntern[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntern, setSelectedIntern] = useState<ActiveIntern | null>(null);
  const [selectedForLogs, setSelectedForLogs] = useState<ActiveIntern | null>(null);
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [groupedWeeks, setGroupedWeeks] = useState<GroupedWeek[]>([]);
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({});
  const [logsLoading, setLogsLoading] = useState(false);
  const { success, error: showError } = useToast();

  // Final Evaluation Rubric State
  const [workQuality, setWorkQuality] = useState<number | ''>('');
  const [punctuality, setPunctuality] = useState<number | ''>('');
  const [teamwork, setTeamwork] = useState<number | ''>('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Batch Week Sign-off State
  const [batchWeekNumber, setBatchWeekNumber] = useState<number | null>(null);
  const [batchRating, setBatchRating] = useState<number>(0);
  const [batchFeedback, setBatchFeedback] = useState<string>('');
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // Single Daily Log Sign-off State
  const [approvingLogId, setApprovingLogId] = useState<string | null>(null);
  const [singleRating, setSingleRating] = useState<number>(0);
  const [singleFeedback, setSingleFeedback] = useState<string>('');
  const [singleSubmitting, setSingleSubmitting] = useState(false);

  useEffect(() => {
    fetchInterns();
  }, []);

  const fetchInterns = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/evaluations/company`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInterns(data);
      }
    } catch (error) {
      console.error(error);
      showError(t.toasts.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  const openEvaluationModal = (intern: ActiveIntern) => {
    setSelectedIntern(intern);
    if (intern.evaluation) {
      setWorkQuality(intern.evaluation.workQualityScore ?? '');
      setPunctuality(intern.evaluation.punctualityScore ?? '');
      setTeamwork(intern.evaluation.teamworkScore ?? '');
      setFeedback(intern.evaluation.feedback || '');
    } else {
      setWorkQuality('');
      setPunctuality('');
      setTeamwork('');
      setFeedback('');
    }
  };

  const openLogsModal = async (intern: ActiveIntern) => {
    setSelectedForLogs(intern);
    setLogsLoading(true);
    setGroupedWeeks([]);
    setBatchWeekNumber(null);
    setApprovingLogId(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/logbook/student/${intern.student.id}?applicationId=${intern.applicationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const weeks: GroupedWeek[] = data.groupedWeeks || [];
        setGroupedWeeks(weeks);

        // Auto expand all weeks by default
        const initExpanded: Record<number, boolean> = {};
        weeks.forEach((w) => {
          initExpanded[w.weekNumber] = true;
        });
        setExpandedWeeks(initExpanded);
      }
    } catch (error) {
      console.error(error);
      showError('Failed to fetch student daily logs');
    } finally {
      setLogsLoading(false);
    }
  };

  const toggleWeekExpansion = (weekNum: number) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [weekNum]: !prev[weekNum]
    }));
  };

  // Batch Sign-off all logs for a given week
  const handleBatchApproveWeek = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForLogs || batchWeekNumber === null) return;

    setBatchSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/logbook/batch-approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: selectedForLogs.student.id,
          applicationId: selectedForLogs.applicationId,
          weekNumber: batchWeekNumber,
          mentorRating: batchRating || null,
          mentorFeedback: batchFeedback
        })
      });

      if (res.ok) {
        success(t.toasts.weekApproved);
        setBatchWeekNumber(null);
        setBatchFeedback('');
        openLogsModal(selectedForLogs);
        fetchInterns();
      } else {
        const err = await res.json();
        showError(err.error || t.toasts.loadFailed);
      }
    } catch (error) {
      showError(t.toasts.loadFailed);
    } finally {
      setBatchSubmitting(false);
    }
  };

  // Single Daily Log Approval
  const handleApproveSingleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingLogId) return;

    setSingleSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/logbook/${approvingLogId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mentorRating: singleRating || null,
          mentorFeedback: singleFeedback
        })
      });

      if (res.ok) {
        success(t.toasts.dayApproved);
        setApprovingLogId(null);
        setSingleFeedback('');
        if (selectedForLogs) {
          openLogsModal(selectedForLogs);
        }
        fetchInterns();
      } else {
        const err = await res.json();
        showError(err.error || t.toasts.loadFailed);
      }
    } catch (error) {
      showError(t.toasts.loadFailed);
    } finally {
      setSingleSubmitting(false);
    }
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntern) return;
    if (!workQuality || !punctuality || !teamwork || !feedback.trim()) {
      showError(language === 'th' ? 'กรุณาเลือกคะแนนทุกหัวข้อและเขียนความคิดเห็น' : 'Select every score and enter feedback.');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/evaluations/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: selectedIntern.student.id,
          applicationId: selectedIntern.applicationId,
          workQualityScore: workQuality,
          punctualityScore: punctuality,
          teamworkScore: teamwork,
          feedback
        })
      });

      if (res.ok) {
        success(t.toasts.evalSubmitted);
        setSelectedIntern(null);
        fetchInterns();
      } else {
        const err = await res.json();
        showError(err.error || t.toasts.loadFailed);
      }
    } catch (error) {
      console.error(error);
      showError(t.toasts.loadFailed);
    } finally {
      setSubmitting(false);
    }
  };

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

  const isFileAttachment = (url: string, title: string) => {
    return title.startsWith('[File]') || url.includes('/uploads/') || /\.(pdf|png|jpg|jpeg|doc|docx|zip)$/i.test(url);
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
    <div className="workspace-page space-y-8 animate-in fade-in duration-200">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="workspace-page-header flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-white p-7 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-100">
              {t.evaluations.tag}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {interns.length} {t.evaluations.activeInternsCount}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t.evaluations.title}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {t.evaluations.subtitle}
          </p>
        </div>
      </div>

      {/* ── Interns Table ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">{t.evaluations.studentCandidate}</th>
                  <th className="px-6 py-4">{t.evaluations.positionTitle}</th>
                  <th className="px-6 py-4">{t.evaluations.hoursLoggedAndSigned}</th>
                  <th className="px-6 py-4">{t.evaluations.rubricStatus}</th>
                  <th className="px-6 py-4 text-right">{t.evaluations.supervisionActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {interns.length > 0 ? (
                  interns.map((intern) => {
                    const isEvaluated = !!intern.evaluation;
                    const logCount = intern.student.dailyLogs?.length || intern.student.weeklyLogs?.length || 0;

                    return (
                      <tr key={intern.applicationId} className="hover:bg-slate-50/60 transition-colors">
                        {/* Student Name & Avatar */}
                        <td className="px-6 py-4.5">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setViewingStudentId(intern.student.id || intern.student.user.id || null)}
                              className="w-10 h-10 rounded-xl bg-white p-0.5 border border-slate-200 shadow-2xs flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:border-primary-400 hover:scale-105 transition-all"
                              title="View Student Profile"
                            >
                              {intern.student.avatarUrl || intern.student.user.avatarUrl ? (
                                <img
                                  src={(intern.student.avatarUrl || intern.student.user.avatarUrl)!.startsWith('http') ? (intern.student.avatarUrl || intern.student.user.avatarUrl)! : `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${intern.student.avatarUrl || intern.student.user.avatarUrl}`}
                                  alt={intern.student.user.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <div className="w-full h-full rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-inner">
                                  {intern.student.user.name ? intern.student.user.name.charAt(0).toUpperCase() : 'S'}
                                </div>
                              )}
                            </button>

                            <div>
                              <button
                                type="button"
                                onClick={() => setViewingStudentId(intern.student.id || intern.student.user.id || null)}
                                className="font-black text-slate-900 text-sm hover:text-primary-600 transition-colors text-left cursor-pointer block"
                              >
                                {intern.student.user.name}
                              </button>
                              <div className="text-slate-500 text-xs font-semibold">
                                ID: {intern.student.studentId} • {t.logbook.academicYear} {intern.student.year}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {intern.student.university ? `${intern.student.university} • ` : ''}{intern.student.faculty} ({intern.student.major})
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Position */}
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          <span className="font-bold text-slate-800 text-xs block">
                            {intern.jobTitle}
                          </span>
                          {intern.status === 'COMMITTED' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {t.common.status.committed}
                            </span>
                          )}
                          {intern.status === 'CANCEL_REQUESTED' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md mt-1 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              {t.common.status.cancelRequested}
                            </span>
                          )}
                          {intern.status === 'ACCEPTED' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md mt-1 border border-indigo-200">
                              {t.common.status.offerExtended}
                            </span>
                          )}
                        </td>

                        {/* Hours */}
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-black text-slate-900 text-sm">
                              {intern.totalHours} {t.common.hrs}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              {intern.approvedHours} {t.common.hrs} {t.common.status.approved}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {logCount} {t.evaluations.entriesSubmitted}
                          </span>
                        </td>

                        {/* Rubric Status */}
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          {isEvaluated ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {t.evaluations.rubricSubmitted}
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                              {t.evaluations.pendingEvaluation}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4.5 whitespace-nowrap text-right space-x-2">
                          <button
                            id="review-logbook-btn"
                            onClick={() => openLogsModal(intern)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                          >
                            {t.evaluations.reviewLogbook} ({logCount})
                          </button>
                          <button
                            onClick={() => openEvaluationModal(intern)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                          >
                            {isEvaluated ? t.evaluations.editRubric : t.evaluations.evaluate}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-700">{t.evaluations.noActiveInterns}</p>
                      <p className="text-xs text-slate-400">{t.evaluations.noActiveInternsDesc}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Logbook Review Drawer Modal (Grouped by Week with Batch Sign-off) ── */}
      {selectedForLogs && (
        <div className="workspace-dialog fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-7 py-5 bg-gradient-to-r from-slate-900 to-slate-950 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400">
                  {t.evaluations.drawerTag}
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  {selectedForLogs.student.user.name} ({selectedForLogs.student.studentId})
                </h3>
              </div>
              <button 
                onClick={() => { setSelectedForLogs(null); setBatchWeekNumber(null); setApprovingLogId(null); }}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-7 space-y-6 max-h-[80vh] overflow-y-auto">
              {logsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : groupedWeeks.length > 0 ? (
                <div className="space-y-6">
                  {groupedWeeks.map((week) => {
                    const isExpanded = expandedWeeks[week.weekNumber] ?? true;
                    const isFullyApproved = week.mentorApproved;

                    return (
                      <div key={week.weekNumber} className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                        {/* Week Header with Batch Sign-off Button */}
                        <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary-600 text-white font-black text-sm flex items-center justify-center">
                              W{week.weekNumber}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-sm text-slate-900">
                                  {t.logbook.weekPrefix} {week.weekNumber} ({formatDate(week.startDate, { month: 'short', day: 'numeric' })} - {formatDate(week.endDate, { month: 'short', day: 'numeric', year: 'numeric' })})
                                </span>
                                {week.hasBackdated && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    {t.logbook.hasBackdated}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {week.days.length} {t.evaluations.entriesSubmitted} • {week.totalHours} {t.common.hrs} ({week.approvedHours} {t.common.hrs} {t.common.status.approved})
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-center">
                            {isFullyApproved ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
                                <CheckCircle2 className="w-4 h-4" />
                                {t.evaluations.weekApproved} {week.mentorRating ? `(${language === 'th' ? 'เฉลี่ยรายวัน' : 'Daily average'} ${week.mentorRating}/5)` : ''}
                              </span>
                            ) : (
                              <button
                                id="batch-signoff-week-btn"
                                onClick={() => {
                                  setBatchWeekNumber(week.weekNumber);
                                  setBatchRating(0);
                                  setBatchFeedback('');
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                              >
                                <Check className="w-4 h-4" />
                                {t.evaluations.batchSignOffWeek} {week.weekNumber}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => toggleWeekExpansion(week.weekNumber)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        {/* Batch Sign-off Inline Form */}
                        {batchWeekNumber === week.weekNumber && (
                          <form onSubmit={handleBatchApproveWeek} className="p-5 bg-emerald-50/90 border-b border-emerald-200 space-y-3 animate-in fade-in">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                {t.evaluations.batchSignOffFormTitle} ({t.logbook.weekPrefix} {week.weekNumber})
                              </span>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setBatchRating(star)}
                                    className={`p-1 text-sm font-bold cursor-pointer ${
                                      batchRating >= star ? 'text-amber-500' : 'text-slate-300'
                                    }`}
                                  >
                                    ★
                                  </button>
                                ))}
                                <span className="text-xs font-bold text-emerald-900 ml-1">({batchRating || (language === 'th' ? 'ยังไม่ให้คะแนน' : 'Not rated')} / 5)</span>
                              </div>
                            </div>

                            <textarea
                              rows={2}
                              required
                              placeholder={t.evaluations.batchFeedbackPlaceholder}
                              className="w-full border border-emerald-300 bg-white rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500"
                              value={batchFeedback}
                              onChange={(e) => setBatchFeedback(e.target.value)}
                            ></textarea>

                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setBatchWeekNumber(null)}
                                className="px-3 py-1.5 border border-emerald-300 bg-white text-emerald-800 text-xs font-bold rounded-lg cursor-pointer"
                              >
                                {t.common.cancel}
                              </button>
                              <button
                                type="submit"
                                disabled={batchSubmitting}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                              >
                                {batchSubmitting ? t.common.saving : `${t.evaluations.confirmBatchSignoffBtn} (${t.logbook.weekPrefix} ${week.weekNumber})`}
                              </button>
                            </div>
                          </form>
                        )}

                        {/* Week Feedback banner if present */}
                        {week.mentorFeedback && (
                          <div className="px-5 py-2.5 bg-emerald-50/50 border-b border-emerald-100 text-xs text-emerald-900 flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-bold">
                              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                              {t.logbook.mentorReview} <span className="font-normal italic">"{week.mentorFeedback}"</span>
                            </span>
                            {week.mentorRating && (
                              <span className="font-black text-amber-600">({week.mentorRating} ★)</span>
                            )}
                          </div>
                        )}

                        {/* Daily Logs in this week */}
                        {isExpanded && (
                          <div className="p-5 space-y-4 bg-slate-50/40">
                            {week.days.map((log) => {
                              const modalityInfo = getModalityBadge(log.workModality);
                              const ModalityIcon = modalityInfo.icon;
                              const actualItems = parsePinPoints(log.tasksDone);
                              const linkItems = parseAttachmentLinks(log.attachmentUrl);

                              return (
                                <div key={log.id} className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                                  {/* Day Row Header */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-primary-600" />
                                        {formatLogDate(log.logDate)}
                                      </span>

                                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${modalityInfo.color}`}>
                                        <ModalityIcon className="w-3 h-3" />
                                        {modalityInfo.label}
                                      </span>

                                      {log.isBackdated && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                          ⏱️ {t.logbook.backdatedBadge}
                                        </span>
                                      )}

                                      {log.supervisorName && (
                                        <span className="text-slate-400 text-[11px]">
                                          • {t.logbook.supervisorNameLabel}: <strong className="text-slate-700">{log.supervisorName}</strong>
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800">
                                        {log.hoursWorked} {t.common.hours}
                                      </span>

                                      {log.mentorApproved ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                                          <CheckCircle2 className="w-3 h-3" />
                                          {t.common.status.approved}
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setApprovingLogId(log.id);
                                            setSingleRating(0);
                                            setSingleFeedback('');
                                          }}
                                          className="text-[11px] font-bold px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                                        >
                                          {t.evaluations.signOffDay}
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Tasks Done */}
                                  <div className="space-y-1 text-xs">
                                    <p className="font-bold text-[10px] text-primary-700 uppercase tracking-wider">
                                      ✅ {t.logbook.actualTasksCompleted}
                                    </p>
                                    <ul className="space-y-1 text-slate-700">
                                      {actualItems.map((item, idx) => (
                                        <li key={idx} className="flex items-start gap-1.5">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                          <span className="leading-relaxed">{item}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  {/* Problems & Solutions AND Key Learnings */}
                                  {(log.problemsAndSolutions || log.learnings) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                                      {log.problemsAndSolutions && (
                                        <div className="bg-amber-50/60 border border-amber-100 p-2.5 rounded-xl">
                                          <p className="font-bold text-[10px] text-amber-900 mb-0.5 flex items-center gap-1">
                                            ⚠️ {t.logbook.problemsAndSolutions}
                                          </p>
                                          <p className="text-amber-800 whitespace-pre-line leading-relaxed">
                                            {log.problemsAndSolutions}
                                          </p>
                                        </div>
                                      )}
                                      {log.learnings && (
                                        <div className="bg-indigo-50/60 border border-indigo-100 p-2.5 rounded-xl">
                                          <p className="font-bold text-[10px] text-indigo-900 mb-0.5 flex items-center gap-1">
                                            💡 {t.logbook.keyLearnings}
                                          </p>
                                          <p className="text-indigo-800 whitespace-pre-line leading-relaxed">
                                            {log.learnings}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Attached Artifacts */}
                                  {linkItems.length > 0 && (
                                    <div className="text-xs pt-1">
                                      <p className="font-bold text-[10px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                                        <LinkIcon className="w-3 h-3 text-primary-500" />
                                        {t.logbook.attachedArtifacts} ({linkItems.length}):
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {linkItems.map((link, idx) => {
                                          const isFile = isFileAttachment(link.url, link.title);
                                          return (
                                            <LogbookFileLink key={idx} href={link.url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-50 hover:bg-primary-100 border border-primary-200 text-xs font-bold text-primary-700 transition-all"
                                            >
                                              {isFile ? <FileText className="w-3.5 h-3.5 text-indigo-600" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                              {link.title || t.logbook.viewArtifact}
                                            </LogbookFileLink>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Single Day Inline Sign-off Form */}
                                  {approvingLogId === log.id && (
                                    <form onSubmit={handleApproveSingleLog} className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2 mt-2">
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-emerald-900">{t.evaluations.signOffDayTitle} ({formatLogDate(log.logDate)})</span>
                                        <div className="flex items-center gap-1">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                              key={star}
                                              type="button"
                                              onClick={() => setSingleRating(star)}
                                              className={`text-xs cursor-pointer ${singleRating >= star ? 'text-amber-500' : 'text-slate-300'}`}
                                            >
                                              ★
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <input
                                        type="text"
                                        required
                                        placeholder={t.evaluations.singleFeedbackPlaceholder}
                                        className="w-full border border-emerald-300 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500"
                                        value={singleFeedback}
                                        onChange={(e) => setSingleFeedback(e.target.value)}
                                      />
                                      <div className="flex justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setApprovingLogId(null)}
                                          className="px-2.5 py-1 border border-slate-200 text-xs rounded-lg bg-white"
                                        >
                                          {t.common.cancel}
                                        </button>
                                        <button
                                          type="submit"
                                          disabled={singleSubmitting}
                                          className="px-3 py-1 bg-emerald-600 text-white font-bold text-xs rounded-lg"
                                        >
                                          {singleSubmitting ? t.common.saving : t.common.confirm}
                                        </button>
                                      </div>
                                    </form>
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
                <div className="text-center py-12 text-slate-400 text-xs">
                  {t.evaluations.noDailyLogsSubmitted}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Final Evaluation Rubric Modal ──────────────────────────────────── */}
      {selectedIntern && (
        <div className="workspace-dialog fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-7 py-5 bg-gradient-to-r from-slate-900 to-slate-950 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400">
                  {t.evaluations.rubricModalTag}
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  {selectedIntern.student.user.name}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedIntern(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEvaluation} className="p-7 space-y-5">
              {/* Score 1: Work Quality */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {t.evaluations.workQualityLabel}
                  </label>
                  <span className="text-xs font-black text-primary-600 whitespace-nowrap shrink-0">{workQuality} / 5</span>
                </div>
                <select required aria-label={t.evaluations.workQualityLabel} className="w-full border border-slate-200 rounded-xl p-3" value={workQuality} onChange={(e) => setWorkQuality(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">{language === 'th' ? 'เลือกคะแนน' : 'Select a score'}</option>
                    {[1,2,3,4,5].map(score => <option key={score} value={score}>{score} / 5</option>)}
                  </select>
              </div>

              {/* Score 2: Punctuality */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {t.evaluations.punctualityLabel}
                  </label>
                  <span className="text-xs font-black text-primary-600 whitespace-nowrap shrink-0">{punctuality} / 5</span>
                </div>
                <select required aria-label={t.evaluations.punctualityLabel} className="w-full border border-slate-200 rounded-xl p-3" value={punctuality} onChange={(e) => setPunctuality(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">{language === 'th' ? 'เลือกคะแนน' : 'Select a score'}</option>
                    {[1,2,3,4,5].map(score => <option key={score} value={score}>{score} / 5</option>)}
                  </select>
              </div>

              {/* Score 3: Teamwork */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {t.evaluations.teamworkLabel}
                  </label>
                  <span className="text-xs font-black text-primary-600 whitespace-nowrap shrink-0">{teamwork} / 5</span>
                </div>
                <select required aria-label={t.evaluations.teamworkLabel} className="w-full border border-slate-200 rounded-xl p-3" value={teamwork} onChange={(e) => setTeamwork(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">{language === 'th' ? 'เลือกคะแนน' : 'Select a score'}</option>
                    {[1,2,3,4,5].map(score => <option key={score} value={score}>{score} / 5</option>)}
                  </select>
              </div>

              {/* Qualitative Feedback */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t.evaluations.mentorRemarksLabel}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={t.evaluations.mentorRemarksPlaceholder}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                ></textarea>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedIntern(null)}
                  className="flex-1 py-3 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-bold text-xs rounded-xl hover:from-primary-700 hover:to-indigo-700 shadow-md shadow-primary-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? t.common.saving : t.evaluations.submitEvaluationBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Student Profile Modal ───────────────────────────────────────────── */}
      <PublicProfileModal
        isOpen={!!viewingStudentId}
        onClose={() => setViewingStudentId(null)}
        profileType="student"
        profileId={viewingStudentId}
      />
    </div>
  );
}

