import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail } from 'lucide-react';
import { LanguageSwitcher, useLanguage } from '../context/LanguageContext';

export default function AccountRecovery({ mode }: { mode: 'forgot' | 'reset' | 'verify' }) {
  const { language } = useLanguage();const th=language==='th';const [params]=useSearchParams();
  const [email,setEmail]=useState(params.get('email')||'');
  const [token]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).get('token')||'');
  const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [done,setDone]=useState(false);const [sent,setSent]=useState(false);
  const title=mode==='forgot'?(th?'ลืมรหัสผ่าน':'Forgot password'):mode==='reset'?(th?'ตั้งรหัสผ่านใหม่':'Reset password'):(th?'ยืนยันอีเมล':'Verify your email');
  const description=mode==='forgot'?(th?'กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้':'Enter your registered email to request a password reset link.'):
    mode==='reset'?(th?'ลิงก์มีอายุ 30 นาที และใช้ได้ครั้งเดียว เมื่อตั้งรหัสใหม่ต้องเข้าสู่ระบบอีกครั้ง':'Links expire after 30 minutes and can be used once. Sign in again after resetting.'):
    (th?'ยืนยันอีเมลเพื่อเริ่มใช้งานบัญชีใหม่ ลิงก์มีอายุ 24 ชั่วโมง':'Verify your email to activate a new account. Links expire after 24 hours.');
  async function submit(e:FormEvent){
    e.preventDefault();setError('');
    if(mode==='reset'&&password!==confirm){setError(th?'รหัสผ่านทั้งสองช่องไม่ตรงกัน':'Passwords do not match.');return;}
    if(mode==='reset'&&new TextEncoder().encode(password).length>72){setError(th?'รหัสผ่านต้องไม่เกิน 72 ไบต์':'Password must not exceed 72 UTF-8 bytes.');return;}
    setBusy(true);
    const route=mode==='forgot'?'forgot-password':mode==='reset'?'reset-password':token?'verify-email':'resend-verification';
    const body=mode==='reset'?{token,password}:mode==='verify'&&token?{token}:{email};
    try{
      const r=await fetch(`${import.meta.env.VITE_API_URL||'http://localhost:4000'}/api/auth/${route}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed.');
      if(mode==='forgot'||(mode==='verify'&&!token))setSent(true);
      else{setDone(true);window.history.replaceState(null,'',window.location.pathname);if(mode==='reset'){localStorage.removeItem('token');localStorage.removeItem('user');}}
    }catch(e){setError(e instanceof Error?e.message:'Request failed.');}finally{setBusy(false);}
  }
  return <div lang={language} className="auth-shell min-h-screen bg-slate-50 flex items-center justify-center px-5 py-12">
    <main className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 sm:p-10 shadow-sm">
      <div className="flex items-center justify-between mb-8"><Link to="/" className="inline-flex items-center gap-2 text-xl font-bold text-slate-900"><span className="brand-symbol">if<span>•</span></span><span>Intern<span className="text-emerald-700">Flow</span></span></Link><LanguageSwitcher/></div>
      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-5">{mode==='reset'?<KeyRound/>:<Mail/>}</div>
      <h1 className="text-2xl font-bold text-slate-900 mb-3">{title}</h1><p className="text-sm text-slate-600 leading-6 mb-6">{description}</p>
      {error&&<div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 mb-5">{error}</div>}
      {(done||sent)&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 mb-6 flex gap-3"><CheckCircle2 className="shrink-0 w-5 h-5"/><span>{done?(mode==='reset'?(th?'ตั้งรหัสใหม่แล้ว กรุณาเข้าสู่ระบบอีกครั้ง':'Password reset. Please sign in again.'):(th?'ยืนยันอีเมลแล้ว เข้าสู่ระบบได้เลย':'Email verified. You can now sign in.')):(th?'หากมีบัญชีที่เข้าเงื่อนไข ระบบจะส่งลิงก์ไปยังอีเมล โปรดตรวจกล่องจดหมายและสแปม':'If an eligible account exists, a link will be emailed. Check your inbox and spam folder.')}</span></div>}
      {!done&&<form onSubmit={submit} className="space-y-5">
        {(mode==='forgot'||(mode==='verify'&&!token))&&<label className="block text-sm font-semibold text-slate-700">{th?'อีเมล':'Email'}<input type="email" name="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required maxLength={254} className="mt-2 w-full rounded-xl border border-slate-300 p-3"/></label>}
        {mode==='reset'&&(token?<><label className="block text-sm font-semibold">{th?'รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)':'New password (at least 8 characters)'}<input type="password" autoComplete="new-password" name="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3"/></label><label className="block text-sm font-semibold">{th?'ยืนยันรหัสผ่านใหม่':'Confirm password'}<input type="password" name="confirmPassword" autoComplete="new-password" minLength={8} required value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3"/></label></>:<p className="text-sm text-amber-800">{th?'ลิงก์ไม่ครบ กรุณาขอลิงก์ตั้งรหัสใหม่อีกครั้ง':'This link is incomplete. Request a new password reset link.'} <Link to="/forgot-password" className="underline">{th?'ขอลิงก์ใหม่':'Request a link'}</Link></p>)}
        {!(mode==='reset'&&!token)&&<button disabled={busy} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 text-white p-3 font-semibold disabled:opacity-50">{busy&&<Loader2 className="w-4 h-4 animate-spin"/>}{mode==='verify'?(token?(th?'ยืนยันอีเมลนี้':'Verify this email'):(th?'ส่งลิงก์ยืนยันอีกครั้ง':'Resend verification')):mode==='reset'?(th?'บันทึกรหัสผ่านใหม่':'Save new password'):(th?'ส่งลิงก์ตั้งรหัสผ่านใหม่':'Send reset link')}</button>}
      </form>}
      <Link to="/login" className="inline-flex items-center gap-2 mt-7 text-sm font-semibold text-emerald-800"><ArrowLeft className="w-4 h-4"/>{th?'กลับเข้าสู่ระบบ':'Back to sign in'}</Link>
    </main>
  </div>;
}
