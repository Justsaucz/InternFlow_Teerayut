import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Building2, MapPin, Star } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getDemoSponsoredJobs, type SponsoredDemoJob } from '../utils/sponsoredDemo';

export function AdsDemoBadge() {
  const {language}=useLanguage();
  return <span className="ads-demo-badge"><Star size={12} aria-hidden="true"/>{language==='th'?'แนะนำ':'Recommended'}</span>;
}

export default function RecommendedJobs() {
  const {language}=useLanguage();const th=language==='th';
  const [jobs,setJobs]=useState<SponsoredDemoJob[]>([]);const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
  useEffect(()=>{const controller=new AbortController();void(async()=>{try{
    const response=await fetch((import.meta.env.VITE_API_URL||'http://localhost:4000')+'/api/jobs',{signal:controller.signal});
    if(!response.ok)throw Error('Unable to load listings.');const data=await response.json();if(!Array.isArray(data))throw Error('Invalid listings.');
    if(!controller.signal.aborted){setJobs(getDemoSponsoredJobs(data));setStatus('ready');}
  }catch{if(!controller.signal.aborted)setStatus('error');}})();return()=>controller.abort();},[]);
  return <section className="ads-demo-section" aria-labelledby="recommended-jobs-title">
    <header className="ads-demo-heading"><div><p className="ads-demo-eyebrow">{th?'ประกาศที่เปิดรับ':'OPEN OPPORTUNITIES'}</p><h3 id="recommended-jobs-title">{th?'ตำแหน่งงานแนะนำ':'Recommended internships'}</h3></div></header>
    {status==='loading'?<p role="status" className="ads-demo-message">{th?'กำลังโหลดประกาศ…':'Loading listings…'}</p>:status==='error'?<p role="status" className="ads-demo-message">{th?'โหลดประกาศไม่สำเร็จ โปรดลองอีกครั้ง':'Unable to load listings. Please try again.'}</p>:!jobs.length?<p className="ads-demo-message">{th?'ยังไม่มีประกาศที่เปิดรับ บริษัทสามารถเพิ่มประกาศผ่านหน้าจัดการงาน':'No open positions yet. Companies can create a listing from Job Management.'}</p>:<div className="ads-demo-grid">{jobs.map(job=><article key={job.id} className="ads-demo-card">
      <div className="ads-demo-card-top"><span className="ads-demo-company-icon"><Building2 size={23}/></span><AdsDemoBadge/></div><p className="ads-demo-company">{job.company.companyName}</p><h4>{job.title}</h4><p className="ads-demo-description">{job.description}</p><div className="ads-demo-card-footer"><span><MapPin size={13}/>{job.location}</span><Link to={'/dashboard/jobs?q='+encodeURIComponent(job.title)}>{th?'ดูประกาศ':'View listing'}<ArrowUpRight size={15}/></Link></div>
    </article>)}</div>}
  </section>;
}
