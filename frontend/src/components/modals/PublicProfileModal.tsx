import { useEffect, useState } from 'react';
import { 
  X, 
  Building2, 
  GraduationCap, 
  MapPin, 
  Globe, 
  Sparkles, 
  Briefcase, 
  DollarSign, 
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface StudentData {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  studentId?: string;
  university?: string | null;
  faculty: string;
  major: string;
  year: number;
  gpa?: number | null;
  skills: string[];
  bio: string | null;
}

interface JobOpening {
  id: string;
  title: string;
  description: string;
  requirements: string;
  location: string;
  isRemote: boolean;
  positions: number;
  allowance?: string | null;
  workingHours?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactLine?: string | null;
  applicationLink?: string | null;
}

interface CompanyData {
  id: string;
  userId: string;
  companyName: string;
  industry: string;
  website: string | null;
  description: string | null;
  logoUrl: string | null;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  hrRepresentative: string;
  activeJobs: JobOpening[];
}

interface PublicProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileType: 'student' | 'company';
  profileId: string | null;
  onSelectJob?: (jobId: string) => void;
}

export default function PublicProfileModal({
  isOpen,
  onClose,
  profileType,
  profileId,
  onSelectJob
}: PublicProfileModalProps) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);

  useEffect(() => {
    if (isOpen && profileId) {
      fetchProfileData();
    } else {
      setStudentData(null);
      setCompanyData(null);
      setError(null);
    }
  }, [isOpen, profileId, profileType]);

  const fetchProfileData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/profile/${profileType}/${profileId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!res.ok) {
        throw new Error('Profile not found');
      }

      const data = await res.json();
      if (profileType === 'student') setStudentData(data);
      else if (profileType === 'company') setCompanyData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="workspace-dialog fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-100 flex flex-col relative my-8 animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-sm transition-all shadow-md cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-400">Loading Profile Details...</p>
          </div>
        ) : error ? (
          <div className="py-24 px-6 text-center space-y-3">
            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
              <X className="w-8 h-8" />
            </div>
            <h4 className="text-base font-extrabold text-slate-800">Profile Not Available</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">{error}</p>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Close Window
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            {/* ── STUDENT PROFILE VIEW ─────────────────────────────────────── */}
            {profileType === 'student' && studentData && (
              <div>
                {/* Header Banner */}
                <div className="h-36 bg-gradient-to-r from-sky-600 via-primary-600 to-indigo-700 relative">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-60"></div>
                  
                  {/* Avatar */}
                  <div className="absolute left-7 -bottom-10 z-10">
                    <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-xl border-4 border-white overflow-hidden flex items-center justify-center">
                      {studentData.avatarUrl ? (
                        <img 
                          src={studentData.avatarUrl.startsWith('http') ? studentData.avatarUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${studentData.avatarUrl}`}
                          alt={studentData.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <div className="w-full h-full rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-inner">
                          {studentData.name ? studentData.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profile Header Info */}
                <div className="px-7 pt-12 pb-5 border-b border-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-extrabold text-slate-900 font-heading">{studentData.name}</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {language === 'th' ? 'นักศึกษาฝึกงาน' : 'Student Intern'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                        {studentData.university ? `${studentData.university} • ` : ''}{language === 'th' ? `ชั้นปีที่ ${studentData.year}` : `Year ${studentData.year}`} • {studentData.faculty || 'Student'}
                      </p>
                    </div>

                    {studentData.gpa && (
                      <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-right">
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                          {language === 'th' ? 'เกรดเฉลี่ยสะสม' : 'Cumulative GPA'}
                        </span>
                        <span className="text-sm font-black text-amber-800">{Number(studentData.gpa).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-7 space-y-6">
                  {/* Academic Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {studentData.university && (
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 col-span-2 sm:col-span-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {language === 'th' ? 'สถาบันการศึกษา' : 'University'}
                        </span>
                        <p className="text-xs font-extrabold text-slate-800 mt-0.5">{studentData.university}</p>
                      </div>
                    )}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {language === 'th' ? 'คณะ' : 'Faculty'}
                      </span>
                      <p className="text-xs font-extrabold text-slate-800 mt-0.5">{studentData.faculty || 'Engineering'}</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {language === 'th' ? 'สาขาวิชา' : 'Major'}
                      </span>
                      <p className="text-xs font-extrabold text-slate-800 mt-0.5">{studentData.major || 'Computer Engineering'}</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {language === 'th' ? 'ช่องทางติดต่อ' : 'Contact'}
                      </span>
                      <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{studentData.email}</p>
                    </div>
                  </div>

                  {/* Bio */}
                  {studentData.bio && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                        {language === 'th' ? 'เกี่ยวกับตัวฉันและเป้าหมายอาชีพ' : 'About & Career Goals'}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                        {studentData.bio}
                      </p>
                    </div>
                  )}

                  {/* Skills */}
                  {studentData.skills && studentData.skills.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        {language === 'th' ? 'ทักษะและความเชี่ยวชาญ' : 'Skills & Competencies'}
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {studentData.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-100"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── COMPANY PROFILE VIEW ─────────────────────────────────────── */}
            {profileType === 'company' && companyData && (
              <div>
                {/* Header Banner */}
                <div className="h-36 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 relative">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-60"></div>
                  
                  {/* Logo */}
                  <div className="absolute left-7 -bottom-10 z-10">
                    <div className="w-20 h-20 rounded-2xl bg-white p-1.5 shadow-xl border-4 border-white overflow-hidden flex items-center justify-center">
                      {companyData.logoUrl ? (
                        <img 
                          src={companyData.logoUrl.startsWith('http') ? companyData.logoUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${companyData.logoUrl}`}
                          alt={companyData.companyName}
                          className="w-full h-full object-contain rounded-xl"
                        />
                      ) : (
                        <div className="w-full h-full rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-white text-2xl font-black shadow-inner">
                          {companyData.companyName ? companyData.companyName.charAt(0).toUpperCase() : 'C'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Header Info */}
                <div className="px-7 pt-12 pb-5 border-b border-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-extrabold text-slate-900 font-heading">{companyData.companyName}</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {language === 'th' ? 'สถานประกอบการ' : 'Corporate Employer'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                        {companyData.industry || 'Technology'} • {companyData.address || 'Bangkok, Thailand'}
                      </p>
                    </div>

                    {companyData.website && (
                      <a
                        href={companyData.website.startsWith('http') ? companyData.website : `https://${companyData.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5 text-emerald-600" />
                        {language === 'th' ? 'เว็บไซต์ทางการ' : 'Visit Website'}
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-7 space-y-6">
                  {/* Contact Channels Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {language === 'th' ? 'ผู้แทนฝ่ายบุคคล' : 'HR Representative'}
                      </span>
                      <p className="text-xs font-extrabold text-slate-800 mt-0.5">{companyData.hrRepresentative || 'HR Department'}</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {language === 'th' ? 'อีเมลติดต่อ' : 'Email Contact'}
                      </span>
                      <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{companyData.contactEmail || 'N/A'}</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {language === 'th' ? 'เบอร์โทรศัพท์' : 'Phone'}
                      </span>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{companyData.contactPhone || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Company Description */}
                  {companyData.description && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        {language === 'th' ? 'ภาพรวมและวัฒนธรรมองค์กร' : 'Company Overview'}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                        {companyData.description}
                      </p>
                    </div>
                  )}

                  {/* Active Job Openings */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                        {language === 'th' ? `ตำแหน่งงานที่เปิดรับ (${companyData.activeJobs?.length || 0})` : `Active Openings (${companyData.activeJobs?.length || 0})`}
                      </h4>
                    </div>

                    {companyData.activeJobs && companyData.activeJobs.length > 0 ? (
                      <div className="space-y-2.5">
                        {companyData.activeJobs.map((job) => (
                          <div 
                            key={job.id} 
                            className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-emerald-200 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-extrabold text-slate-900 text-sm font-heading">{job.title}</h5>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                                  {job.isRemote ? (language === 'th' ? 'ทำงานทางไกล' : 'Remote') : (language === 'th' ? 'ที่สำนักงาน' : 'On-site')}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2.5 mt-1 text-[11px] text-slate-500 font-medium">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {job.location}
                                </span>
                                {job.allowance && (
                                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                                    <DollarSign className="w-3 h-3" />
                                    {job.allowance}
                                  </span>
                                )}
                              </div>
                            </div>

                            {onSelectJob && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onSelectJob(job.id);
                                }}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors cursor-pointer shrink-0"
                              >
                                {language === 'th' ? 'สมัครตอนนี้' : 'Apply Now'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-2">
                        {language === 'th' ? 'ยังไม่มีตำแหน่งงานเปิดรับสมัครในขณะนี้' : 'No active internship openings right now.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
