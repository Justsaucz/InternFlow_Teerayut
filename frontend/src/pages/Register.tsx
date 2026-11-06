import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useLanguage, LanguageSwitcher } from '../context/LanguageContext';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'COMPANY_HR'>('STUDENT');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        email,
        password,
        name,
        role,
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/verify-email?email=' + encodeURIComponent(email));
        }, 1500);
      } else {
        setError(data.error || 'Registration failed. Please check your information.');
      }
    } catch (err) {
      console.error(err);
      setError(t.auth.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div lang={language} className="auth-shell min-h-screen bg-slate-50 flex">
      {/* ── Left Showcase Pane (Desktop Only) ────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#062314] via-[#0a3820] to-[#03150c] text-white p-12 xl:p-16 flex-col justify-between overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <Link to="/" className="brand-lockup"><span className="brand-symbol">if<span>•</span></span><span>Intern<span className="brand-flow">Flow</span><small>Make your next move.</small></span></Link>
        </div>

        {/* Central Showcase Content */}
        <div className="relative z-10 my-auto py-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.auth.getStartedTag}</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight text-white mb-6 font-heading">
            {t.auth.leftHeroTitle}
          </h1>

          <p className="text-slate-300 text-lg leading-relaxed mb-10 max-w-lg">
            {t.auth.leftHeroDesc}
          </p>

          {/* 3 Pillars List */}
          <div className="space-y-4 max-w-md">
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Verified Partner Companies</h4>
                <p className="text-xs text-slate-300">Every host organization is vetted for active mentorship.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">1-Click CWIE Compliance</h4>
                <p className="text-xs text-slate-300">Fast daily logbook sign-offs and auto-compiled rubrics.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Metrics */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div>Over <strong>500+</strong> Verified Listings</div>
          <div>•</div>
          <div><strong>100%</strong> Onboarding Commitment</div>
          <div>•</div>
          <div>CWIE Mandate Ready</div>
        </div>
      </div>

      {/* ── Right Form Pane ─────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="max-w-md w-full space-y-8">
          {/* Header & Language Switcher */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="lg:hidden flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-sm">
                  IF
                </div>
                <span className="text-xl font-black text-slate-900 font-heading">
                  Intern<span className="text-emerald-600">Flow</span>
                </span>
              </div>
              <div className="ml-auto">
                <LanguageSwitcher />
              </div>
            </div>

            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
              {t.auth.signUpTitle}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {t.auth.signUpSubtitle}
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="flex items-center p-4 text-sm text-red-800 rounded-2xl bg-red-50 border border-red-200">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center p-4 text-sm text-emerald-800 rounded-2xl bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 mr-3 flex-shrink-0 text-emerald-600" />
              <span>{language === 'th' ? 'สร้างบัญชีแล้ว กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ' : 'Account created. Verify your email before signing in.'}</span>
            </div>
          )}

          {/* Form */}
          <form className="space-y-5" onSubmit={handleRegister}>
            {/* Visual Role Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                {t.auth.selectRoleLabel}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('STUDENT')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                    role === 'STUDENT'
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-600/30'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                    role === 'STUDENT' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{t.auth.studentRoleTitle}</h3>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      {t.auth.studentRoleDesc}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('COMPANY_HR')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                    role === 'COMPANY_HR'
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-600/30'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                    role === 'COMPANY_HR' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{t.auth.companyRoleTitle}</h3>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      {t.auth.companyRoleDesc}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                {t.auth.fullNameLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  name="name"
                  type="text"
                  required
                  className="block w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400"
                  placeholder={t.auth.fullNamePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                {t.auth.emailLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  className="block w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400"
                  placeholder={t.auth.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                {t.auth.passwordLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="block w-full pl-10 pr-11 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400"
                  placeholder={t.auth.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  {t.auth.signUpBtn} ({role === 'STUDENT' ? t.nav.studentRole : t.nav.companyRole})
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="pt-4 border-t border-slate-200/80 text-center text-sm text-slate-600">
            {t.auth.alreadyHaveAccount}{' '}
            <Link to="/login" className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
              {t.auth.loginLink}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
