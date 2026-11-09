import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { LanguageSwitcher, useLanguage } from '../context/LanguageContext';

export default function AccountRecovery({mode}:{mode:'forgot'|'reset'|'verify'}) {
  const {language}=useLanguage();const th=language==='th';const [params]=useSearchParams();
  const [email,setEmail]=useState(params.get('email')||'');
  const [otp,setOtp]=useState('');const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [done,setDone]=useState(false);const [sent,setSent]=useState(false);
  const title=mode==='forgot'?(th?'ลืมรหัสผ่าน':'Forgot password'):mode==='reset'?(th?'ตั้งรหัสผ่านใหม่':'Reset password'):(th?'ยืนยันอีเมล':'Verify your email');
  async function request(route:string,body:object) {
    const response=await fetch((import.meta.env.VITE_API_URL||'http://localhost:4000')+'/api/auth/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await response.json();if(!response.ok)throw Error(data.error||'Request failed.');return data;
  }
  async function submit(event:FormEvent) {
    event.preventDefault();setError('');setBusy(true);
    try {
      if(mode==='forgot') {await request('forgot-password',{email});setSent(true);}
      else {
        if(mode==='reset' && password!==confirm)throw Error(th?'รหัสผ่านทั้งสองช่องไม่ตรงกัน':'Passwords do not match.');
        if(mode==='reset' && new TextEncoder().encode(password).length>72)throw Error(th?'รหัสผ่านต้องไม่เกิน 72 ไบต์':'Password must not exceed 72 UTF-8 bytes.');
        await request(mode==='reset'?'reset-password':'verify-email',mode==='reset'?{email,otp,password}:{email,otp});
        setDone(true);if(mode==='reset'){localStorage.removeItem('token');localStorage.removeItem('user');}
      }
    }catch(e){setError(e instanceof Error?e.message:'Request failed.');}finally{setBusy(false);}
  }
  async function resend() {setBusy(true);setError('');try{await request(mode==='verify'?'resend-verification':'forgot-password',{email});setSent(true);}catch(e){setError(e instanceof Error?e.message:'Request failed.');}finally{setBusy(false);}}
  return <div lang={language} className="auth-shell min-h-screen bg-slate-50 flex items-center justify-center px-5 py-12">
    <main className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 sm:p-10 shadow-sm">
      <div className="flex justify-between items-center mb-8"><Link to="/" className="text-xl font-bold text-emerald-900">InternFlow</Link><LanguageSwitcher/></div>
      <Mail className="text-emerald-700 mb-5"/>
      <h1 className="text-2xl font-bold text-slate-900 mb-3">{title}</h1>
      <p className="text-sm text-slate-600 mb-6">{th?'ระบบจะส่งรหัสใช้ครั้งเดียวไปยังอีเมลของคุณ โปรดตรวจกล่องจดหมายและสแปม รหัสมีอายุ 15 นาที':'A one-time code is sent to your email. Check your inbox and spam folder. Codes expire in 15 minutes.'}</p>
      {error&&<div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 mb-5">{error}</div>}
      {(done||sent)&&<div role="status" className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900 mb-5 flex gap-3"><CheckCircle2 className="w-5 h-5 shrink-0"/><span>{done?(mode==='verify'?(th?'ยืนยันอีเมลแล้ว เข้าสู่ระบบได้เลย':'Email verified. You can now sign in.'):(th?'เปลี่ยนรหัสผ่านแล้ว โปรดเข้าสู่ระบบใหม่':'Password changed. Please sign in again.')):(th?'หากบัญชีนี้มีอยู่ ระบบจะส่งรหัสไปยังอีเมล':'If an eligible account exists, a code will be emailed.')}</span></div>}
      {!done&&<form onSubmit={submit} className="space-y-5">
        <label className="block text-sm font-semibold text-slate-700">{th?'อีเมล':'Email'}<input type="email" name="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3"/></label>
        {mode!=='forgot'&&<label className="block text-sm font-semibold text-slate-700">{th?'รหัสยืนยันจากอีเมล':'Email verification code'}<input name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6,8}" minLength={6} maxLength={8} value={otp} onChange={e=>setOtp(e.target.value.replace(/[^0-9]/g,''))} className="mt-2 w-full rounded-xl border border-slate-300 p-3 tracking-widest"/></label>}
        {mode==='reset'&&<><label className="block text-sm font-semibold">{th?'รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)':'New password (at least 8 characters)'}<input type="password" name="password" autoComplete="new-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3"/></label><label className="block text-sm font-semibold">{th?'ยืนยันรหัสผ่านใหม่':'Confirm new password'}<input type="password" name="confirmPassword" autoComplete="new-password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3"/></label></>}
        <button disabled={busy} type="submit" className="flex w-full justify-center items-center gap-2 rounded-xl bg-emerald-800 text-white p-3 font-semibold disabled:opacity-50">{busy&&<Loader2 className="w-4 h-4 animate-spin"/>}{mode==='forgot'?(th?'ส่งรหัสรีเซ็ตรหัสผ่าน':'Send reset code'):mode==='reset'?(th?'บันทึกรหัสผ่านใหม่':'Save new password'):(th?'ยืนยันอีเมล':'Verify email')}</button>
        {mode!=='forgot'&&<button disabled={busy||!email} type="button" onClick={resend} className="w-full text-sm text-emerald-800 underline disabled:opacity-50">{th?'ส่งรหัสอีกครั้ง':'Resend code'}</button>}
      </form>}
      {mode==='forgot'&&sent&&<Link to={'/reset-password?email='+encodeURIComponent(email)} className="mt-5 block rounded-xl bg-emerald-800 p-3 text-center text-white">{th?'กรอกรหัสและตั้งรหัสผ่านใหม่':'Enter code and reset password'}</Link>}
      <Link to="/login" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"><ArrowLeft className="w-4 h-4"/>{th?'กลับเข้าสู่ระบบ':'Back to sign in'}</Link>
    </main>
  </div>;
}
