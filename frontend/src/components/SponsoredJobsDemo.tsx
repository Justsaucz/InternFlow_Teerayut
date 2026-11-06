import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Building2, MapPin, Megaphone } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getDemoSponsoredJobs, type SponsoredDemoJob } from '../utils/sponsoredDemo';

export function AdsDemoBadge() {
  const { language } = useLanguage();
  return <span className="ads-demo-badge"><Megaphone size={12} aria-hidden="true" />ADS<span aria-hidden="true">·</span>{language === 'th' ? 'ตัวอย่าง' : 'Demo'}</span>;
}

export default function SponsoredJobsDemo() {
  const { language } = useLanguage();
  const th = language === 'th';
  const [jobs, setJobs] = useState<SponsoredDemoJob[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs`, { signal: controller.signal });
        if (!response.ok) throw new Error('Unable to load preview listings.');
        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid listings response.');
        if (!controller.signal.aborted) {
          setJobs(getDemoSponsoredJobs(data));
          setStatus('ready');
        }
      } catch {
        if (!controller.signal.aborted) setStatus('error');
      }
    })();
    return () => controller.abort();
  }, []);

  return <section className="ads-demo-section" aria-labelledby="ads-demo-title">
    <header className="ads-demo-heading">
      <div><p className="ads-demo-eyebrow"><Megaphone size={14} aria-hidden="true" />{th ? 'พื้นที่โฆษณา' : 'SPONSORED PLACEMENTS'}</p><h3 id="ads-demo-title">{th ? 'ประกาศโปรโมต' : 'Promoted internships'}</h3></div>
      <span className="ads-demo-preview">{th ? 'ตัวอย่างการแสดงผล' : 'Preview'}</span>
    </header>
    <p className="ads-demo-disclosure">{th ? 'ตัวอย่างพื้นที่โฆษณาจากประกาศที่เปิดรับ ยังไม่มีการชำระเงินหรือซื้อโปรโมต' : 'Sample ad placements using open listings. No payment or promotion purchase has been made.'}</p>
    {status === 'loading' ? <p role="status" className="ads-demo-message">{th ? 'กำลังโหลดประกาศ…' : 'Loading listings…'}</p> : status === 'error' ? <p role="status" className="ads-demo-message">{th ? 'ยังโหลดตัวอย่างโฆษณาไม่ได้ ลองใหม่ภายหลัง' : 'Ad previews are unavailable. Please try again later.'}</p> : !jobs.length ? <p className="ads-demo-message">{th ? 'ยังไม่มีประกาศที่เปิดรับสำหรับแสดงตัวอย่าง' : 'No open listings are available for this preview.'}</p> : <div className="ads-demo-grid">{jobs.map(job => <article key={job.id} className="ads-demo-card">
      <div className="ads-demo-card-top"><span className="ads-demo-company-icon" aria-hidden="true"><Building2 size={23} /></span><AdsDemoBadge /></div>
      <p className="ads-demo-company">{job.company.companyName}</p>
      <h4>{job.title}</h4>
      <p className="ads-demo-description">{job.description}</p>
      <div className="ads-demo-card-footer"><span><MapPin size={13} aria-hidden="true" />{job.location}{job.isRemote ? (th ? ' · ทำงานทางไกล' : ' · Remote') : ''}</span><Link to={`/dashboard/jobs?q=${encodeURIComponent(job.title)}`} aria-label={`${th ? 'ดูประกาศ' : 'View listing'}: ${job.title}`}>{th ? 'ดูประกาศ' : 'View listing'}<ArrowUpRight size={15} aria-hidden="true" /></Link></div>
    </article>)}</div>}
  </section>;
}
