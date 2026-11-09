import { useEffect, useRef, useState } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Briefcase, 
  FileText, 
  User, 
  LogOut, 
  Users, 
  GraduationCap, 
  Building2, 
  ChevronRight,
  Sparkles,
  BookOpen,
  Award,
  Menu,
  X
} from 'lucide-react';
import { useLanguage, LanguageSwitcher } from '../../context/LanguageContext';
import NotificationsBell from '../NotificationsBell';
import EmailVerificationBanner from '../EmailVerificationBanner';

interface UserData {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: 'STUDENT' | 'COMPANY_HR';
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();

  useEffect(() => {
    setSidebarOpen(false);
    try {
      const stored = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (!stored || !token) throw new Error('Missing session');
      const parsed = JSON.parse(stored) as UserData;
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (!['STUDENT', 'COMPANY_HR'].includes(parsed.role) || payload.exp * 1000 <= Date.now() || !payload.exp) throw new Error('Invalid session');
      const companyPage = ['/dashboard/jobs/manage', '/dashboard/applicants', '/dashboard/evaluations', '/dashboard/company/profile'].includes(location.pathname);
      const studentPage = ['/dashboard/jobs', '/dashboard/applications', '/dashboard/logbook', '/dashboard/profile'].includes(location.pathname);
      if ((companyPage && parsed.role !== 'COMPANY_HR') || (studentPage && parsed.role !== 'STUDENT')) { navigate('/dashboard', { replace: true }); return; }
      setUser(parsed);
    } catch {
      localStorage.removeItem('user'); localStorage.removeItem('token');
      navigate('/login?redirect=' + encodeURIComponent(location.pathname + location.search), { replace: true });
    }
  }, [navigate, location.pathname, location.search]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebar.current?.querySelector<HTMLElement>('a,button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSidebarOpen(false); menuButton.current?.focus(); }
      if (event.key === 'Tab') {
        const items = sidebar.current?.querySelectorAll<HTMLElement>('a,button');
        if (!items?.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKeyDown); };
  }, [sidebarOpen]);

  if (!user) return null;

  const handleLogout = () => {
    const token=localStorage.getItem('token');
    if(token)void fetch((import.meta.env.VITE_API_URL||'http://localhost:4000')+'/api/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+token}}).catch(()=>{});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getRoleBadge = () => {
    switch (user.role) {
      case 'STUDENT':
        return { label: t.nav.studentRole, icon: GraduationCap, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'COMPANY_HR':
        return { label: t.nav.companyRole, icon: Building2, color: 'bg-teal-50 text-teal-700 border-teal-200' };
      default:
        return { label: 'User', icon: User, color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const roleInfo = getRoleBadge();
  const RoleIcon = roleInfo.icon;

  const getNavigation = () => {
    switch (user.role) {
      case 'STUDENT':
        return [
          { name: t.nav.dashboard, href: '/dashboard', icon: Home },
          { name: t.nav.findInternships, href: '/dashboard/jobs', icon: Briefcase },
          { name: t.nav.myApplications, href: '/dashboard/applications', icon: FileText },
          { name: t.nav.weeklyLogbook, href: '/dashboard/logbook', icon: BookOpen },
          { name: t.nav.myProfile, href: '/dashboard/profile', icon: User },
        ];
      case 'COMPANY_HR':
        return [
          { name: t.nav.dashboard, href: '/dashboard', icon: Home },
          { name: t.nav.jobPostings, href: '/dashboard/jobs/manage', icon: Briefcase },
          { name: t.nav.applicants, href: '/dashboard/applicants', icon: Users },
          { name: t.nav.internEvaluations, href: '/dashboard/evaluations', icon: Award },
          { name: t.nav.companyProfile, href: '/dashboard/company/profile', icon: Building2 },
        ];
      default:
        return [];
    }
  };

  const navigation = getNavigation();
  const parentPath = location.pathname === '/dashboard/screening'
    ? (user.role === 'STUDENT' ? '/dashboard/applications' : '/dashboard/applicants')
    : location.pathname;
  const currentNav = navigation.find((item) => item.href === parentPath);

  return (
    <div lang={language} className="workspace-shell min-h-screen bg-slate-50 flex font-sans antialiased text-slate-900">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      {sidebarOpen && <button type="button" tabIndex={-1} aria-label="Close navigation" onClick={() => { setSidebarOpen(false); menuButton.current?.focus(); }} className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" />}
      <aside ref={sidebar} id="dashboard-navigation" aria-label={t.nav.mainMenu} className={`workspace-sidebar ${sidebarOpen ? 'flex' : 'hidden'} fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] overflow-y-auto bg-white border-r border-slate-200/80 flex-col justify-between flex-shrink-0 lg:sticky lg:top-0 lg:h-screen lg:flex`}>
        <div>
          {/* App Brand Header */}
          <div className="p-6 pb-5 border-b border-slate-100 flex items-center justify-between">
            <Link to="/dashboard" onClick={() => setSidebarOpen(false)} className="brand-lockup"><span className="brand-symbol">if<span>•</span></span><span>Intern<span className="brand-flow">Flow</span><small>{t.nav.workspace}</small></span></Link>
            <button type="button" aria-label="Close navigation" onClick={() => { setSidebarOpen(false); menuButton.current?.focus(); }} className="lg:hidden p-2 rounded-lg text-slate-600"><X className="w-5 h-5" /></button>
          </div>

          {/* User Role Card */}
          <div className="role-card p-3.5 mx-4 mt-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-xs border border-slate-200 overflow-hidden text-emerald-600 flex-shrink-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl.startsWith('http') ? user.avatarUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${user.avatarUrl}`}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <RoleIcon className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 leading-tight truncate">{user.name}</p>
                <span className={`inline-flex items-center text-[10px] font-bold mt-0.5 px-2 py-0.5 rounded-full border ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
              </div>
            </div>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0 shadow-xs shadow-emerald-500/50" title="Online" />
          </div>

          {/* Navigation Links */}
          <nav className="px-4 py-6 space-y-1.5">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">{t.nav.mainMenu}</p>
            {navigation.map((item) => {
              const isActive = parentPath === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  onClick={() => setSidebarOpen(false)}
                  to={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center justify-between px-3.5 py-3 text-sm font-semibold rounded-2xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 font-bold'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center">
                    <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {item.name}
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-white/80" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer & Logout */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            {t.nav.signOut}
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="workspace-header h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-8 gap-3 z-10">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <button type="button" ref={menuButton} aria-label={t.nav.mainMenu} aria-expanded={sidebarOpen} aria-controls="dashboard-navigation" onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-600 rounded-lg flex-shrink-0"><Menu className="w-5 h-5" /></button>
            <span className="hidden sm:inline text-slate-400 font-medium">{t.nav.portal}</span>
            <span className="hidden sm:inline text-slate-300">/</span>
            <h1 className="text-sm sm:text-lg font-bold text-slate-900 font-heading truncate">
              {currentNav?.name || t.nav.dashboard}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <NotificationsBell />
            <LanguageSwitcher />
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              InternFlow Workspace
            </span>
          </div>
        </header>

        <EmailVerificationBanner />
        {/* Page Body */}
        <main className="workspace-main flex-1 min-w-0 p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
