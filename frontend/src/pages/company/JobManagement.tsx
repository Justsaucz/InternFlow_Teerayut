import { lazy, Suspense, useEffect, useState } from 'react';
const JobQuestionnaire=lazy(()=>import('../../components/JobQuestionnaire'));
import type { QuestionnaireDraft } from '../../components/JobQuestionnaire';
import { 
  Plus, 
  Users, 
  MapPin, 
  Briefcase, 
  Clock, 
  DollarSign, 
  Pencil, 
  Trash2, 
  X
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { useLanguage } from '../../context/LanguageContext';

interface Job {
  readinessEnabled?:boolean;
  screeningTemplate?:{onApply:boolean}|null;
  id: string;
  title: string;
  description: string;
  requirements: string;
  location: string;
  isRemote: boolean;
  positions: number;
  allowance: string | null;
  workingHours: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactLine: string | null;
  applicationLink: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    applications: number;
  };
}

export default function JobManagement() {
  const [requireQuestionnaire,setRequireQuestionnaire]=useState(false);
  const [creatingQuestionnaire,setCreatingQuestionnaire]=useState(false);
  const [questionnaireDraft,setQuestionnaireDraft]=useState<QuestionnaireDraft|undefined>();
  const [questionnaireJob,setQuestionnaireJob]=useState<Job|null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const { success, error: showError } = useToast();
  const { t, language } = useLanguage();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    location: '',
    isRemote: false,
    positions: 1,
    allowance: '',
    workingHours: '',
    contactEmail: '',
    contactPhone: '',
    contactLine: '',
    applicationLink: '',
    isActive: true
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs/company`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (error) {
      console.error(error);
      showError('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingJobId(null);
    setRequireQuestionnaire(false);setQuestionnaireDraft(undefined);
    setFormData({
      title: '',
      description: '',
      requirements: '',
      location: '',
      isRemote: false,
      positions: 1,
      allowance: '',
      workingHours: 'Mon - Fri, 09:00 - 18:00',
      contactEmail: '',
      contactPhone: '',
      contactLine: '',
      applicationLink: '',
      isActive: true
    });
    setShowModal(true);
  };

  const handleOpenEdit = (job: Job) => {
    setEditingJobId(job.id);setRequireQuestionnaire(false);
    setFormData({
      title: job.title || '',
      description: job.description || '',
      requirements: job.requirements || '',
      location: job.location || '',
      isRemote: job.isRemote || false,
      positions: job.positions || 1,
      allowance: job.allowance || '',
      workingHours: job.workingHours || '',
      contactEmail: job.contactEmail || '',
      contactPhone: job.contactPhone || '',
      contactLine: job.contactLine || '',
      applicationLink: job.applicationLink || '',
      isActive: job.isActive
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!editingJobId&&requireQuestionnaire){setShowModal(false);setCreatingQuestionnaire(true);return;}
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = editingJobId 
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs/${editingJobId}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs`;
      
      const method = editingJobId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        success(editingJobId ? 'Job posting updated successfully!' : 'Job posted successfully!');
        setShowModal(false);
        setEditingJobId(null);
        fetchJobs();
      } else {
        const err = await res.json();
        showError(err.error || 'Failed to save job posting');
      }
    } catch (error) {
      showError('Network error. Please try again.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const publishWithQuestionnaire = async (questionnaire: QuestionnaireDraft) => {
    const response=await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs`,{method:'POST',headers:{Authorization:`Bearer ${localStorage.getItem('token')}`,'Content-Type':'application/json'},body:JSON.stringify({...formData,questionnaire})});
    const value=await response.json();if(!response.ok)throw Error(value.error||'Unable to publish the job and questionnaire.');
    setCreatingQuestionnaire(false);setQuestionnaireDraft(undefined);setRequireQuestionnaire(false);setEditingJobId(null);
    success(language==='th'?'เผยแพร่ประกาศพร้อมแบบทดสอบแล้ว':'Job and questionnaire published together.');void fetchJobs();
  };

  const saveAndEditQuestionnaire = async () => {
    if(!editingJobId)return;setSaving(true);
    try{
      const response=await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs/${editingJobId}`,{method:'PUT',headers:{Authorization:`Bearer ${localStorage.getItem('token')}`,'Content-Type':'application/json'},body:JSON.stringify(formData)});
      const value=await response.json();if(!response.ok)throw Error(value.error||'Unable to save job details.');
      setShowModal(false);setQuestionnaireJob(value);void fetchJobs();
    }catch(error){showError(error instanceof Error?error.message:'Unable to save job details.');}finally{setSaving(false);}
  };

  const handleDeleteJob = async (jobId: string) => {
    setDeletingId(jobId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        success('Job posting deleted successfully');
        setJobToDelete(null);
        fetchJobs();
      } else {
        const err = await res.json();
        showError(err.error || 'Failed to delete job');
      }
    } catch (error) {
      showError('Network error deleting job');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="workspace-page space-y-8 animate-in fade-in duration-200">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="workspace-page-header flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-white p-7 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
              {t.nav.jobPostings}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {jobs.length} {language === 'th' ? 'ตำแหน่งที่เปิดรับ' : 'Positions Posted'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
            {language === 'th' ? 'จัดการตำแหน่งรับสมัครฝึกงาน' : 'Internship Job Postings'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {language === 'th' ? 'สร้าง แก้ไข และจัดการประกาศรับสมัครฝึกงาน พร้อมกำหนดเบี้ยเลี้ยงและเวลาทำงาน' : 'Create, edit, and manage internship opportunities with working hours, stipend, and contact details.'}
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs px-5 py-3 rounded-2xl hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {t.dashboard.postNewJob}
        </button>
      </div>

      {/* ── Job Postings List ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="workspace-jobs-table min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Role & Requirements</th>
                  <th className="px-6 py-4">Schedule & Location</th>
                  <th className="px-6 py-4">Allowance & Contacts</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Applicants</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {jobs.length > 0 ? (
                  jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Role & Title */}
                      <td className="px-6 py-4.5">
                        <div className="font-black text-slate-900 text-sm">{job.title}</div>
                        <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{job.description}</div>
                        {job.requirements && (
                          <div className="text-[10px] text-slate-400 mt-1 truncate max-w-xs font-mono">
                            Req: {job.requirements}
                          </div>
                        )}
                      </td>

                      {/* Schedule & Location */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <div className="flex items-center text-slate-700 font-semibold gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {job.isRemote ? '🌐 Remote / WFH' : `📍 ${job.location}`}
                        </div>
                        {job.workingHours && (
                          <div className="flex items-center text-slate-500 text-[11px] mt-1 gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {job.workingHours}
                          </div>
                        )}
                        <div className="flex items-center text-slate-500 text-[11px] mt-0.5 gap-1.5">
                          <Briefcase className="w-3 h-3 text-slate-400" />
                          {job.positions} Position{job.positions > 1 ? 's' : ''}
                        </div>
                      </td>

                      {/* Allowance & Contacts */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <div className="font-bold text-emerald-700 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          {job.allowance || 'Unpaid / Experience'}
                        </div>
                        {(job.contactEmail || job.contactPhone || job.contactLine) && (
                          <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                            {job.contactEmail && <p>✉ {job.contactEmail}</p>}
                            {job.contactPhone && <p>📞 {job.contactPhone}</p>}
                            {job.contactLine && <p className="text-emerald-600 font-semibold">LINE: {job.contactLine}</p>}
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex text-[11px] font-bold rounded-full border ${
                          job.isActive 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {job.isActive ? 'Active & Open' : 'Closed'}
                        </span>
                      </td>

                      {/* Applicants Count */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <div className="inline-flex items-center font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-xl">
                          <Users className="w-3.5 h-3.5 mr-1.5 text-primary-600" />
                          {job._count?.applications || 0} Candidates
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-6 py-4.5 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(job)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 font-bold text-xs transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => setJobToDelete(job)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
                          title="Delete Job"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                      <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-700">No internship positions posted yet.</p>
                      <p className="text-xs text-slate-400 mt-0.5">Click "Post New Internship" to create your first opening.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {creatingQuestionnaire&&<Suspense fallback={<div role="status">Loading…</div>}><JobQuestionnaire job={formData} draft={questionnaireDraft} onBack={setQuestionnaireDraft} onPublish={publishWithQuestionnaire} onClose={()=>{setCreatingQuestionnaire(false);setShowModal(true);}}/></Suspense>}
      {questionnaireJob&&<Suspense fallback={<div role="status" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center text-white">Loading…</div>}><JobQuestionnaire key={questionnaireJob.id} job={questionnaireJob} onClose={()=>{setQuestionnaireJob(null);if(editingJobId)setShowModal(true);void fetchJobs();}}/></Suspense>}
      {/* ── Create / Edit Job Modal ────────────────────────────────────────── */}
      {showModal && (
        <div className="workspace-dialog fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="px-7 py-5 bg-gradient-to-r from-slate-900 to-slate-950 text-white flex justify-between items-center sticky top-0 z-10">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400">
                  {editingJobId ? 'Update Position' : 'New Internship Opening'}
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  {editingJobId ? 'Edit Job Posting' : 'Post New Internship'}
                </h3>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-7 space-y-4">
              {/* Row 1: Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Job Position Title *
                </label>
                <input 
                  required 
                  type="text" 
                  placeholder="e.g., Full Stack Software Engineer Intern"
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                />
              </div>

              {/* Row 2: Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Role Description & Responsibilities *
                </label>
                <textarea 
                  required 
                  rows={3} 
                  placeholder="Describe day-to-day responsibilities, learning outcomes, and team structure..."
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                />
              </div>

              {/* Row 3: Requirements */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Candidate Requirements & Tech Skills *
                </label>
                <textarea 
                  required 
                  rows={3} 
                  placeholder="e.g., Knowledge of React, Node.js, Git, Docker, and willingness to learn..."
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500" 
                  value={formData.requirements} 
                  onChange={e => setFormData({...formData, requirements: e.target.value})} 
                />
              </div>

              {/* Row 4: Location & Positions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Office Location / City *
                  </label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g., Silom, Bangkok or Sathorn"
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500" 
                    value={formData.location} 
                    onChange={e => setFormData({...formData, location: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Positions Available *
                  </label>
                  <input 
                    required 
                    type="number" 
                    min="1" 
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500" 
                    value={formData.positions} 
                    onChange={e => setFormData({...formData, positions: parseInt(e.target.value) || 1})} 
                  />
                </div>
              </div>

              {/* Row 5: Allowance & Working Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Allowance / Compensation
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="e.g., 500 THB/day or 15,000 THB/month"
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" 
                      value={formData.allowance} 
                      onChange={e => setFormData({...formData, allowance: e.target.value})} 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Working Hours & Schedule
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="e.g., Mon - Fri, 09:00 - 18:00"
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" 
                      value={formData.workingHours} 
                      onChange={e => setFormData({...formData, workingHours: e.target.value})} 
                    />
                  </div>
                </div>
              </div>

              {/* Row 6: Contact Channels */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  HR & Mentor Contact Channels (Optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <input 
                      type="email" 
                      placeholder="Email: hr@company.com"
                      className="w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-primary-500" 
                      value={formData.contactEmail} 
                      onChange={e => setFormData({...formData, contactEmail: e.target.value})} 
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Phone: 02-123-4567"
                      className="w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-primary-500" 
                      value={formData.contactPhone} 
                      onChange={e => setFormData({...formData, contactPhone: e.target.value})} 
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="LINE ID / @Official"
                      className="w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-primary-500" 
                      value={formData.contactLine} 
                      onChange={e => setFormData({...formData, contactLine: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <input 
                    type="url" 
                    placeholder="External Career Page / Website: https://company.com/career"
                    className="w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-primary-500" 
                    value={formData.applicationLink} 
                    onChange={e => setFormData({...formData, applicationLink: e.target.value})} 
                  />
                </div>
              </div>

              {/* Row 7: Checkboxes */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500" 
                    checked={formData.isRemote} 
                    onChange={e => setFormData({...formData, isRemote: e.target.checked})} 
                  />
                  <span>Remote Work / Work From Home Available</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500" 
                    checked={formData.isActive} 
                    onChange={e => setFormData({...formData, isActive: e.target.checked})} 
                  />
                  <span>Active Position (Visible on Job Board)</span>
                </label>
              </div>

              {!editingJobId&&<section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-2"><label className="flex items-start gap-3 text-sm font-semibold"><input type="checkbox" checked={requireQuestionnaire} onChange={e=>setRequireQuestionnaire(e.target.checked)} className="mt-1"/><span>{language==='th'?'ให้ผู้สมัครทำแบบทดสอบก่อนส่งใบสมัคร':'Require a questionnaire when applying'}</span></label><p className="text-xs leading-5 text-slate-600">{language==='th'?'หากเปิด จะไปตั้งคำถามในขั้นถัดไป ประกาศจะยังไม่เปิดรับจนกว่าจะบันทึกคำถามและเผยแพร่พร้อมกัน หากไม่ใช้ สามารถเผยแพร่ได้เลย':'When enabled, write or draft questions in the next step. The job stays unpublished until both are saved together. Otherwise, publish without a questionnaire.'}</p></section>}

              {editingJobId&&<section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3"><p className="text-sm font-semibold">{language==='th'?'แบบทดสอบของประกาศนี้':'Questionnaire for this listing'}</p><p className="text-xs text-slate-600 leading-5">{language==='th'?'บันทึกรายละเอียดงานล่าสุดก่อนแก้คำถาม เพื่อให้ AI อ้างอิงบริบทที่ถูกต้อง แบบทดสอบที่ผู้สมัครส่งแล้วจะเก็บตามรุ่นเดิม':'Save the latest job details before editing questions so AI uses the correct context. Already submitted assessments retain their original version.'}</p><button type="button" disabled={saving} onClick={event=>{if(event.currentTarget.form?.reportValidity())void saveAndEditQuestionnaire();}} className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-900">{language==='th'?'บันทึกและแก้ไขแบบทดสอบ':'Save details & edit questionnaire'}</button></section>}

              {/* Submit Buttons */}
              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex-1 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:from-primary-700 hover:to-indigo-700 shadow-md shadow-primary-500/20 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingJobId ? 'Update Job Posting' : requireQuestionnaire ? (language==='th'?'ถัดไป: ตั้งแบบทดสอบ':'Next: questionnaire') : 'Publish Job Opening'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ──────────────────────────────────────── */}
      {jobToDelete && (
        <div className="workspace-dialog fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Job Posting</h3>
                <p className="text-xs text-slate-500 mt-0.5">This action will remove the position permanently.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
              <p className="font-extrabold text-slate-900 text-sm">{jobToDelete.title}</p>
              <p className="text-slate-500">
                📍 {jobToDelete.location} • {jobToDelete._count?.applications || 0} candidate(s)
              </p>
              {jobToDelete._count?.applications > 0 && (
                <p className="text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-semibold pt-1">
                  ⚠️ Note: {jobToDelete._count.applications} candidate application(s) linked to this post will also be safely removed.
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setJobToDelete(null)}
                disabled={deletingId !== null}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteJob(jobToDelete.id)}
                disabled={deletingId !== null}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deletingId === jobToDelete.id ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
