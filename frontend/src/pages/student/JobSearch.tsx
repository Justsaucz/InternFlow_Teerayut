import { lazy, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { matchesJob } from '../../utils/jobFilters';
import { AdsDemoBadge } from '../../components/SponsoredJobsDemo';
import { getDemoSponsoredJobs } from '../../utils/sponsoredDemo';
import { 
  Briefcase, 
  MapPin, 
  Building2, 
  Search, 
  DollarSign, 
  Send, 
  Users, 
  Clock,
  Mail,
  Phone,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
const ApplicationFlow=lazy(()=>import('../../components/ApplicationFlow'));
import PublicProfileModal from '../../components/modals/PublicProfileModal';
import { useLanguage } from '../../context/LanguageContext';

interface Job {
  id: string;
  companyProfileId?: string;
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
  createdAt: string;
  company: {
    id?: string;
    companyName: string;
    logoUrl: string | null;
    address: string | null;
    industry: string | null;
    website: string | null;
  };
}

export default function JobSearch() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const [searchTerm, updateSearchTerm] = useState(() => params.get('q') || '');
  const queryTerm = params.get('q') || '';
  useEffect(() => { updateSearchTerm(queryTerm); }, [queryTerm]);
  const setSearchTerm = (value: string) => {
    updateSearchTerm(value);
    setParams(current => { current.set('q', value); return current; }, { replace: true });
  };
  const [filterType, setFilterType] = useState<'all' | 'remote' | 'onsite'>(() => params.get('workType') === 'REMOTE' ? 'remote' : params.get('workType') === 'ONSITE' ? 'onsite' : 'all');
  const { t, language } = useLanguage();

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [viewingCompanyId, setViewingCompanyId] = useState<string | null>(null);
  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (error) {
      console.error('Failed to fetch jobs', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => matchesJob(job, searchTerm, params.get('category') || 'ALL',
    filterType === 'all' ? params.get('workType') || 'ALL' : filterType.toUpperCase()));

  const demoSponsoredIds = new Set(getDemoSponsoredJobs(jobs).map(job => job.id));
  const selectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <div className="workspace-page max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* ── Header & Search Controls ───────────────────────────────────────── */}
      <div className="workspace-page-header flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
              {t.nav.findInternships}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {jobs.length} {language === 'th' ? 'ตำแหน่งที่เปิดรับ' : 'Opportunities Open'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
            {t.jobs.title}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {t.jobs.subtitle}
          </p>
        </div>

        {/* Search Bar & Filter Chips */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t.jobs.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto justify-center">
            <button
              onClick={() => { setFilterType('all'); setParams(current => { current.delete('workType'); current.delete('category'); return current; }, { replace: true }); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'th' ? `ทั้งหมด (${jobs.length})` : `All (${jobs.length})`}
            </button>
            <button
              onClick={() => setFilterType('remote')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'remote' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.common.modalities.remote}
            </button>
            <button
              onClick={() => setFilterType('onsite')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'onsite' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.common.modalities.onSite}
            </button>
          </div>
        </div>
      </div>


      {/* ── Job Cards Grid ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200 animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-200"></div>
                <div className="w-20 h-6 rounded-full bg-slate-100"></div>
              </div>
              <div className="h-5 w-3/4 bg-slate-200 rounded"></div>
              <div className="h-4 w-1/2 bg-slate-100 rounded"></div>
              <div className="h-16 w-full bg-slate-50 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.length > 0 ? (
            filteredJobs.map(job => (
              <div 
                key={job.id} 
                className="bg-white rounded-3xl shadow-sm border border-slate-200/80 hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden flex flex-col justify-between group"
              >
                <div className="p-6 sm:p-7 space-y-4">
                  {/* Top Row: Company Avatar & Tag */}
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setViewingCompanyId(job.companyProfileId || job.company.id || null)}
                      className="w-13 h-13 rounded-2xl bg-white p-1 border border-slate-200 shadow-md flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:border-primary-400 hover:scale-105 transition-all"
                      title="View Company Profile"
                    >
                      {job.company.logoUrl ? (
                        <img 
                          src={job.company.logoUrl.startsWith('http') ? job.company.logoUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${job.company.logoUrl}`} 
                          alt={job.company.companyName} 
                          className="w-full h-full object-contain rounded-xl"
                        />
                      ) : (
                        <div className="w-full h-full rounded-xl bg-gradient-to-tr from-primary-500 to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-inner">
                          {job.company.companyName.charAt(0)}
                        </div>
                      )}
                    </button>
                    <div className="flex flex-col items-end gap-1.5">
                      {demoSponsoredIds.has(job.id) && <AdsDemoBadge />}
                      {job.isRemote ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          🌐 Remote
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          📍 On-site
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Company Name */}
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 line-clamp-1 group-hover:text-primary-600 transition-colors">
                      {job.title}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setViewingCompanyId(job.companyProfileId || job.company.id || null)}
                      className="text-xs font-bold text-slate-500 hover:text-primary-600 flex items-center gap-1.5 mt-1 transition-colors cursor-pointer text-left"
                    >
                      <Building2 className="w-3.5 h-3.5 text-primary-500" />
                      {job.company.companyName}
                    </button>
                  </div>

                  {/* Key Info Chips */}
                  <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-600 font-medium">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {job.location}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100">
                      <Users className="w-3 h-3 text-slate-400" />
                      {job.positions} Slot{job.positions > 1 ? 's' : ''}
                    </span>
                    {job.allowance && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50/70 text-emerald-800 border border-emerald-100 font-semibold">
                        <DollarSign className="w-3 h-3 text-emerald-600" />
                        {job.allowance}
                      </span>
                    )}
                    {job.workingHours && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50/70 text-indigo-800 border border-indigo-100 font-semibold">
                        <Clock className="w-3 h-3 text-indigo-600" />
                        {job.workingHours}
                      </span>
                    )}
                  </div>

                  {/* Contact Channels Badge (If available) */}
                  {(job.contactEmail || job.contactPhone || job.contactLine || job.applicationLink) && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 space-y-1">
                      <p className="font-bold text-[10px] uppercase text-slate-400">Employer Contact Channels:</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {job.contactEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" /> {job.contactEmail}
                          </span>
                        )}
                        {job.contactPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" /> {job.contactPhone}
                          </span>
                        )}
                        {job.contactLine && (
                          <span className="flex items-center gap-1 font-semibold text-emerald-700">
                            <MessageSquare className="w-3 h-3 text-emerald-600" /> LINE: {job.contactLine}
                          </span>
                        )}
                        {job.applicationLink && (
                          <a 
                            href={job.applicationLink} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary-600 font-bold hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" /> Career Portal
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Job Description Preview */}
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 bg-slate-50/60 p-3.5 rounded-2xl border border-slate-100">
                    {job.description}
                  </p>
                </div>

                {/* Footer Action */}
                <div className="p-6 pt-0">
                  <button 
                    onClick={() => setSelectedJobId(job.id)}
                    className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-bold text-sm py-3 rounded-2xl hover:from-primary-700 hover:to-indigo-700 shadow-md shadow-primary-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                  >
                    Apply for Position
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-16 bg-white rounded-3xl border border-slate-200 border-dashed">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-900">No internships found</h4>
              <p className="text-xs text-slate-500 mt-1">Try modifying your search or filter options.</p>
            </div>
          )}
        </div>
      )}

      {selectedJob && <Suspense fallback={<div role="status" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center text-white">Loading…</div>}><ApplicationFlow key={selectedJob.id} job={selectedJob} onClose={()=>setSelectedJobId(null)}/></Suspense>}

      {/* ── Public Company Profile Modal ────────────────────────────────────── */}
      <PublicProfileModal
        isOpen={!!viewingCompanyId}
        onClose={() => setViewingCompanyId(null)}
        profileType="company"
        profileId={viewingCompanyId}
        onSelectJob={(jobId) => {
          setViewingCompanyId(null);
          setSelectedJobId(jobId);
        }}
      />
    </div>
  );
}
