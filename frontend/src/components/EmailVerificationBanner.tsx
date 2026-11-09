import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
export default function EmailVerificationBanner(){
 const {language}=useLanguage();const [email,setEmail]=useState('');
 useEffect(()=>{let active=true;fetch(`${import.meta.env.VITE_API_URL||'http://localhost:4000'}/api/auth/me`,{headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}}).then(async r=>{if(!r.ok)return;const u=await r.json();if(active&&u&&!u.emailVerifiedAt)setEmail(u.email);}).catch(()=>{});return()=>{active=false;};},[]);
 if(!email || import.meta.env.VITE_DEMO_MODE === 'true')return null;
 return <aside className="mx-4 sm:mx-8 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 flex flex-wrap justify-between gap-2"><span>{language==='th'?'บัญชีเดิมนี้ยังไม่ได้ยืนยันอีเมล กรุณายืนยันเพื่อให้ข้อมูลบัญชีครบถ้วน':'This existing account has not verified its email yet.'}</span><Link to={`/verify-email?email=${encodeURIComponent(email)}`} className="font-bold underline">{language==='th'?'ยืนยันอีเมล':'Verify email'}</Link></aside>;
}
