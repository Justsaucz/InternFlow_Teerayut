import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, CheckCircle2, Clock, Users, ArrowRight, Building2, BookOpen, GraduationCap, FileCheck2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import SponsoredJobsDemo from '../components/SponsoredJobsDemo';
import ReadinessTasks from '../components/ReadinessTasks';

interface UserData {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'COMPANY_HR';
}

interface StatItem {
  label: string;
  value: number;
}

export default function Dashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, formatDate, language } = useLanguage();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      fetchDashboardStats();
    }
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || []);
        setRecent(data.recent || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTranslatedStatLabel = (originalLabel: string, role?: string, index?: number): string => {
    if (role === 'STUDENT') {
      if (originalLabel.includes('Sent') || originalLabel.includes('Applied') || index === 0) {
        return t.dashboard.studentStats.applied;
      }
      if (originalLabel.includes('Review') || index === 1) {
        return t.dashboard.studentStats.review;
      }
      if (originalLabel.includes('Approved') || originalLabel.includes('Offer') || index === 2) {
        return t.dashboard.studentStats.approved;
      }
    } else {
      if (originalLabel.includes('Job') || originalLabel.includes('Active') || index === 0) {
        return t.dashboard.companyStats.jobs;
      }
      if (originalLabel.includes('Applicant') || index === 1) {
        return t.dashboard.companyStats.applicants;
      }
      if (originalLabel.includes('Candidate') || originalLabel.includes('Accepted') || index === 2) {
        return t.dashboard.companyStats.evaluations;
      }
    }
    return originalLabel;
  };

  if (!user) return <div className="p-8 text-slate-500">{t.common.loading}</div>;

  const isStudent = user.role === 'STUDENT';
  const shortcuts = isStudent ? [
    { to:'/dashboard/jobs', label:t.dashboard.findInternships, icon:Briefcase },
    { to:'/dashboard/profile', label:t.dashboard.transcriptAndProfile, icon:GraduationCap },
    { to:'/dashboard/logbook', label:t.dashboard.weeklyCwieLogbook, icon:BookOpen },
  ] : [
    { to:'/dashboard/jobs/manage', label:t.dashboard.postNewJob, icon:Briefcase },
    { to:'/dashboard/applicants', label:t.dashboard.reviewApplicants, icon:Users },
  ];
  const defaultLabels = isStudent
    ? [t.dashboard.studentStats.applied,t.dashboard.studentStats.review,t.dashboard.studentStats.approved]
    : [t.dashboard.companyStats.jobs,t.dashboard.companyStats.applicants,t.dashboard.companyStats.evaluations];

  return (
    <div className="workspace-page dashboard-page">
      <section className="dashboard-overview">
        <div>
          <span className="dashboard-eyebrow">{isStudent ? <GraduationCap size={14}/> : <Building2 size={14}/>} {isStudent ? t.nav.studentRole : t.nav.companyRole} / {t.nav.workspace}</span>
          <h2>{t.dashboard.welcome}, {user.name}.</h2>
          <p>{isStudent ? t.dashboard.studentSubtitle : t.dashboard.companySubtitle}</p>
        </div>
        <Link className="dashboard-overview-action" to={isStudent ? '/dashboard/jobs' : '/dashboard/jobs/manage'}>
          {isStudent ? t.dashboard.findInternships : t.dashboard.postNewJob}<ArrowRight size={15}/>
        </Link>
      </section>

      {isStudent && <ReadinessTasks />}

      <section className="dashboard-metrics" aria-label={t.dashboard.keyMetrics}>
        {loading ? [0,1,2].map(i => <div key={i} className="dashboard-skeleton"/>) :
          (stats.length ? stats : defaultLabels.map(label => ({label,value:0}))).map((stat,idx) => (
            <StatCard key={idx} title={getTranslatedStatLabel(stat.label,user.role,idx)} value={stat.value} index={idx}/>
          ))}
      </section>

      {isStudent && <SponsoredJobsDemo />}

      <div className="dashboard-columns">
        <section className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div><h3>{t.dashboard.recentActivity}</h3><p>{language === 'th' ? 'สถานะล่าสุดของใบสมัครและที่ฝึกงานของคุณ' : 'Recent updates to your applications and placements'}</p></div>
            <span>{recent.length}</span>
          </div>
          {loading ? <div className="dashboard-empty">{t.common.loading}</div> : recent.length ? (
            <div className="dashboard-activity">
              {recent.map((item:any,i:number) => (
                <div key={item.id || i} className="dashboard-activity-row">
                  <span className="dashboard-activity-monogram">{item.jobPost?.title?.charAt(0) || item.student?.user?.name?.charAt(0) || '•'}</span>
                  <div className="dashboard-activity-copy">
                    <strong>{item.jobPost?.title || item.student?.user?.name || (language === 'th' ? 'อัปเดตใบสมัคร' : 'Application update')}</strong>
                    <p>{item.jobPost?.company?.companyName || item.student?.user?.email || (language === 'th' ? 'อัปเดตแล้ว' : 'Updated')}</p>
                  </div>
                  <time dateTime={item.createdAt}>{formatDate(item.createdAt,{month:'short',day:'numeric'})}</time>
                </div>
              ))}
            </div>
          ) : <div className="dashboard-empty"><FileCheck2/><strong>{t.dashboard.noActivity}</strong><p>{t.dashboard.noActivityDesc}</p></div>}
        </section>
        <section className="dashboard-panel">
          <div className="dashboard-panel-heading"><div><h3>{t.dashboard.quickActions}</h3><p>{t.dashboard.quickActionsDesc}</p></div></div>
          <div className="dashboard-quicklinks">
            {shortcuts.map(({to,label,icon:Icon}) => <Link key={to} to={to} className="dashboard-quicklink"><span><Icon size={17}/></span>{label}<ArrowRight/></Link>)}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({title,value,index}:{title:string;value:number;index:number}) {
  const Icon = [Briefcase,Clock,CheckCircle2][index] || Briefcase;
  return <article className="dashboard-metric"><div className="dashboard-metric-top"><p>{title}</p><span className="dashboard-metric-icon"><Icon/></span></div><strong>{value}</strong></article>;
}
