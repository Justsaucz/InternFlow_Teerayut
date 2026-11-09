import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  AlertCircle, 
  Loader2, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useLanguage, LanguageSwitcher } from '../context/LanguageContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t, language } = useLanguage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        const redirect = params.get('redirect');
        navigate(redirect && /^\/dashboard(?:[/?]|$)/.test(redirect) ? redirect : '/dashboard', { replace: true });
      } else {
        setError(data.error || t.auth.invalidCredentials);
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

        {/* Central Content */}
        <div className="relative z-10 my-auto py-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.auth.welcomeBackTag}</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight text-white mb-6 font-heading">
            {t.auth.leftHeroTitle}
          </h1>

          <p className="text-slate-300 text-lg leading-relaxed mb-10 max-w-lg">
            {t.auth.leftHeroDesc}
          </p>
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
              {t.auth.signInTitle}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {t.auth.signInSubtitle}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-center p-4 text-sm text-red-800 rounded-2xl bg-red-50 border border-red-200">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          {import.meta.env.VITE_DEMO_MODE === 'true' && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <p className="font-semibold text-emerald-950">{language === 'th' ? 'เลือกบัญชีทดลอง แล้วกดเข้าสู่ระบบ' : 'Choose a demo account, then sign in'}</p>
            <div className="mt-3 flex flex-wrap gap-2">{[['student','นักศึกษา / Student'],['intern','ผู้ฝึกงาน / Intern'],['hr','บริษัท / HR']].map(([account,label]) => <button key={account} type="button" onClick={() => {setEmail(`${account}@internflow.example.test`);setPassword('InternFlowDemo2026!');setError(null);}} className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-emerald-900 hover:bg-emerald-100">{label}</button>)}</div>
            <p className="mt-2 text-xs text-emerald-800">{language === 'th' ? 'เป็นบัญชีที่ใช้ร่วมกัน โปรดอย่าใส่ข้อมูลส่วนตัว' : 'Shared demo accounts. Do not enter personal information.'}</p>
          </div>}
          <form className="space-y-5" onSubmit={handleLogin}>
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
                  id="login-email-input"
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
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  {t.auth.passwordLabel}
                </label>
                <Link to="/forgot-password" className="text-xs font-semibold text-emerald-700 hover:underline">{language === 'th' ? 'ลืมรหัสผ่าน?' : 'Forgot password?'}</Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password-input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
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
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  {t.auth.signInBtn}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Helper */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-xs text-slate-600">
            <span className="font-bold text-emerald-800 block mb-1">{t.auth.quickDemoHint}</span>
            {t.auth.demoHintText}
          </div>

          <p className="text-center text-xs text-slate-500"><Link to={`/verify-email?email=${encodeURIComponent(email)}`} className="text-emerald-800 underline">{language === 'th' ? 'ยังไม่ได้ยืนยันอีเมล? ส่งลิงก์อีกครั้ง' : 'Email not verified? Resend verification'}</Link></p>
          {/* Footer Navigation */}
          <div className="pt-4 border-t border-slate-200/80 text-center text-sm text-slate-600">
            {t.auth.dontHaveAccount}{' '}
            <Link to="/register" className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
              {t.auth.registerLink}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
