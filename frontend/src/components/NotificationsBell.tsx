import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

type Notice={id:string;title:string;message:string;href:string;readAt:string|null;createdAt:string};
const base=import.meta.env.VITE_API_URL||'http://localhost:4000';
export default function NotificationsBell(){
  const {language}=useLanguage();const th=language==='th';const [open,setOpen]=useState(false);const [items,setItems]=useState<Notice[]>([]);const [unread,setUnread]=useState(0);const [error,setError]=useState('');const box=useRef<HTMLDivElement>(null);const button=useRef<HTMLButtonElement>(null);const navigate=useNavigate();
  const load=useCallback(async()=>{
    if(document.hidden)return;
    try{const r=await fetch(`${base}/api/notifications`,{headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}});if(r.status===401){localStorage.removeItem('token');localStorage.removeItem('user');navigate('/login');return;}if(!r.ok)throw Error('Unable to load notifications.');const d=await r.json();setItems(d.items);setUnread(d.unreadCount);setError('');}
    catch{setError(th?'โหลดการแจ้งเตือนไม่สำเร็จ':'Notifications could not be loaded.');}
  },[navigate,th]);
  useEffect(()=>{const initial=window.setTimeout(()=>void load(),0);const timer=window.setInterval(()=>void load(),30000);const refresh=()=>void load();window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{clearTimeout(initial);clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};},[load]);
  useEffect(()=>{if(!open)return;const initial=window.setTimeout(()=>void load(),0);const onClick=(e:MouseEvent)=>{if(!box.current?.contains(e.target as Node))setOpen(false);};const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);button.current?.focus();}};document.addEventListener('mousedown',onClick);document.addEventListener('keydown',onKey);return()=>{clearTimeout(initial);document.removeEventListener('mousedown',onClick);document.removeEventListener('keydown',onKey);};},[open,load]);
  async function read(id?:string){try{const r=await fetch(`${base}/api/notifications/${id?`${id}/read`:'read-all'}`,{method:'PATCH',headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}});if(!r.ok)throw Error();await load();}catch{setError(th?'บันทึกสถานะการอ่านไม่สำเร็จ':'Could not mark notifications as read.');}}
  return <div ref={box} className="relative"><button ref={button} type="button" aria-label={th?`การแจ้งเตือน ${unread} รายการยังไม่อ่าน`:`Notifications, ${unread} unread`} aria-expanded={open} aria-controls="notification-panel" onClick={()=>setOpen(!open)} className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-emerald-50"><Bell className="h-5 w-5"/>{unread>0&&<span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-emerald-700 px-1 text-[10px] leading-5 text-white">{unread>99?'99+':unread}</span>}</button>
    {open&&<section id="notification-panel" aria-label={th?'การแจ้งเตือน':'Notifications'} className="fixed top-20 right-3 left-3 sm:absolute sm:top-14 sm:left-auto sm:right-0 sm:w-96 rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden z-50"><header className="flex justify-between items-center p-4 border-b border-slate-100"><h2 className="font-bold text-sm">{th?'การแจ้งเตือน':'Notifications'}</h2><div className="flex gap-3"><button type="button" onClick={()=>void read()} title={th?'อ่านทั้งหมด':'Mark all read'} aria-label={th?'อ่านทั้งหมด':'Mark all read'}><CheckCheck className="h-4 w-4 text-emerald-700"/></button><button type="button" aria-label={th?'ปิด':'Close'} onClick={()=>setOpen(false)}><X className="h-4 w-4"/></button></div></header>
      {error&&<p role="alert" className="p-3 text-xs text-rose-700">{error}</p>}
      <ul className="max-h-96 overflow-y-auto">{items.map(n=><li key={n.id} className={`border-b border-slate-100 ${n.readAt?'bg-white':'bg-emerald-50/70'}`}><Link to={n.href.startsWith('/dashboard')?n.href:'/dashboard'} onClick={()=>{void read(n.id);setOpen(false);}} className="block p-4"><p className="font-semibold text-sm">{n.title}</p><p className="text-xs text-slate-600 leading-5 mt-1">{n.message}</p><time className="text-[10px] text-slate-400" dateTime={n.createdAt}>{new Date(n.createdAt).toLocaleString(th?'th-TH':'en-GB')}</time></Link></li>)}</ul>
      {!items.length&&!error&&<p className="p-8 text-center text-sm text-slate-500">{th?'ยังไม่มีการแจ้งเตือน':'No notifications yet.'}</p>}
    </section>}
  </div>;
}
