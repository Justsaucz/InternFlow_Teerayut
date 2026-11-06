import { useEffect, useState } from 'react';
import { 
  ArrowRight, 
  Briefcase, 
  FileText,
  Sparkles, 
  ChevronDown,
  Search,
  MapPin,
  Clock,
  Coins,
  Code2,
  Palette,
  BarChart3,
  Megaphone,
  Layers,
  Check,
  Compass
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage, LanguageSwitcher } from '../context/LanguageContext';
import { jobCategory, matchesJob, type SearchableJob } from '../utils/jobFilters';

interface PublicJob extends SearchableJob {
  id: string;
  allowance: string | null;
  positions: number;
  workingHours: string | null;
}

export default function Home() {
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedWorkType, setSelectedWorkType] = useState('ALL');
  const [activeJobTab, setActiveJobTab] = useState<'ALL' | 'TECH' | 'DESIGN' | 'MARKETING' | 'REMOTE'>('ALL');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { t, language } = useLanguage();

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const isTh = language === 'th';
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs`, { signal: controller.signal })
      .then(res => { if (!res.ok) throw new Error('Failed to load jobs'); return res.json(); })
      .then(setJobs).catch(error => { if (error.name !== 'AbortError') setLoadError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const listingCount = (category: string) => `${jobs.filter(job => jobCategory(job) === category).length} ${isTh ? 'ตำแหน่ง' : 'Listings'}`;
  const searchHref = (job?: PublicJob) => {
    const params = new URLSearchParams({ q: job?.title || searchQuery, category: selectedCategory, workType: selectedWorkType });
    return `/dashboard/jobs?${params}`;
  };

  // Job Categories Data
  const categories = [
    { 
      id: 'TECH', 
      name: isTh ? 'วิศวกรรมซอฟต์แวร์และเทคโนโลยี' : 'Software & Engineering', 
      icon: Code2, 
      count: listingCount('TECH'),
      color: 'from-emerald-500 to-teal-600' 
    },
    { 
      id: 'DESIGN', 
      name: isTh ? 'การออกแบบผลิตภัณฑ์และ UI/UX' : 'UI/UX & Product Design', 
      icon: Palette, 
      count: listingCount('DESIGN'),
      color: 'from-teal-500 to-cyan-600' 
    },
    { 
      id: 'DATA', 
      name: isTh ? 'วิทยาศาสตร์ข้อมูลและ GenAI' : 'Data Science & GenAI', 
      icon: BarChart3, 
      count: listingCount('DATA'),
      color: 'from-emerald-600 to-green-700' 
    },
    { 
      id: 'MARKETING', 
      name: isTh ? 'การตลาดดิจิทัลและสื่อสร้างสรรค์' : 'Digital Growth & Media', 
      icon: Megaphone, 
      count: listingCount('MARKETING'),
      color: 'from-green-500 to-emerald-600' 
    },
    { 
      id: 'PRODUCT', 
      name: isTh ? 'การจัดการผลิตภัณฑ์และโครงการ' : 'Product & Project Ops', 
      icon: Layers, 
      count: listingCount('PRODUCT'),
      color: 'from-teal-600 to-emerald-800' 
    },
    { 
      id: 'BUSINESS', 
      name: isTh ? 'ธุรกิจ การเงินและการลงทุน' : 'Business & Finance', 
      icon: Briefcase, 
      count: listingCount('BUSINESS'),
      color: 'from-emerald-700 to-teal-700' 
    },
  ];

  const filteredJobs = jobs.filter(job => {
    if (!matchesJob(job, searchQuery, selectedCategory, selectedWorkType)) return false;
    return activeJobTab === 'ALL' || (activeJobTab === 'REMOTE' ? job.isRemote : jobCategory(job) === activeJobTab);
  }).map(job => ({
    ...job,
    companyName: job.company.companyName,
    logo: job.company.companyName.slice(0, 2).toUpperCase(),
    logoBg: 'bg-emerald-600',
    featured: false,
    stipend: job.allowance || (isTh ? 'ไม่ระบุเบี้ยเลี้ยง' : 'Allowance not specified'),
    type: job.isRemote ? (isTh ? 'ทำงานทางไกล' : 'Remote') : job.location,
    tags: [jobCategory(job)],
    appliedCount: job.positions
  }));

  const faqs = isTh ? [
    {
      q: "ขั้นตอนการสมัครและระบบตรวจสอบทำงานอย่างไร?",
      a: "นักศึกษาสร้างโปรไฟล์ แนบเอกสาร และส่งใบสมัครให้บริษัทตรวจสอบได้ ข้อมูลผลการเรียนเป็นข้อมูลที่นักศึกษาระบุ บริษัทพิจารณาจากโปรไฟล์และเอกสารที่แนบ"
    },
    {
      q: "InternFlow ใช้งานได้ฟรีสำหรับนักศึกษาหรือไม่?",
      a: "ฟรี 100%! สำหรับนักศึกษาทุกคน คุณสามารถค้นหาตำแหน่งงาน ส่งใบสมัคร บันทึก Logbook มากกว่า 400 ชั่วโมง และรับรายงานประเมินผลตามเกณฑ์ CWIE ได้โดยไม่มีค่าใช้จ่ายใดๆ"
    },
    {
      q: "กฎการยืนยันสิทธิ์เพียงแห่งเดียว (Single-Commitment) คืออะไร?",
      a: "เมื่อนักศึกษายืนยันข้อเสนอ ระบบจะปิดใบสมัครอื่นและระงับการสมัครใหม่ การขอยกเลิกที่ฝึกงานต้องให้บริษัทพิจารณา"
    },
    {
      q: "พี่เลี้ยงสถานประกอบการตรวจและรับรอง Logbook อย่างไร?",
      a: "แทนที่จะต้องตรวจสมุดบันทึกเล่มหนาช่วงปลายเทอม พี่เลี้ยงสามารถใช้ระบบตรวจรายสัปดาห์ในคลิกเดียว ตรวจสอบงานที่ส่งจริง และระบบจะคำนวณชั่วโมงพร้อมสรุปแบบประเมินให้อัตโนมัติ"
    }
  ] : [
    {
      q: "How does the application and verification process work?",
      a: "Create a profile, attach supporting documents, and apply for employers to review. Academic details are self-reported and reviewed alongside your supporting documents."
    },
    {
      q: "Is InternFlow completely free for students?",
      a: "Yes! InternFlow is 100% free for all students. You can search positions, submit applications, track your 400+ hour logbooks, and view mentor feedback and internship evaluation reports at zero cost."
    },
    {
      q: "What is the Single-Commitment Protocol?",
      a: "When a student confirms an internship offer on InternFlow, competing pending applications are automatically declined and new applications are locked. Cancelling a confirmed placement requires company review."
    },
    {
      q: "How do mentors track and sign off on university logbooks?",
      a: "Instead of dealing with thick paper binders at week 16, mentors use our Daily Logbook Inspector Drawer. Mentors approve logged tasks in 1 click, with recorded hours and evaluation scores available in a printable report."
    }
  ];

  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  });

  return (
    <div lang={language} className="landing-page">
      <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to content</a>
      <header className="landing-header">
        <div className="landing-container landing-nav">
          <Link to="/" className="brand-lockup" aria-label="InternFlow home"><span className="brand-symbol">if<span>•</span></span><span>Intern<span className="brand-flow">Flow</span><small>Make your next move.</small></span></Link>
          <nav className="landing-navlinks" aria-label={isTh ? 'เมนูหลัก' : 'Main navigation'}>
            <button onClick={() => jump('featured')}>{t.home.findInternships}</button>
            <button onClick={() => jump('categories')}>{t.home.categories}</button>
            <button onClick={() => jump('how-it-works')}>{t.home.howItWorks}</button>
            <button onClick={() => jump('faq')}>{t.home.faq}</button>
          </nav>
          <div className="landing-nav-actions"><LanguageSwitcher /><Link className="landing-signin" to="/login">{t.home.signIn}</Link><Link className="ui-button ui-button-small landing-nav-cta" to="/register">{t.home.getStarted}<ArrowRight size={15}/></Link></div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section id="search" className="landing-hero">
          <div className="landing-container hero-grid">
            <div className="hero-copy">
              <div className="section-eyebrow"><span className="eyebrow-line"/>{isTh ? 'ทุกก้าวของการฝึกงาน อยู่ที่เดียว' : 'A little direction. A lot of possibility.'}</div>
              <h1>{isTh ? <>เริ่มต้นบทใหม่<br/><em>ในแบบของคุณ.</em></> : <>Your next chapter<br/><em>starts here.</em></>}</h1>
              <p className="hero-description">{isTh ? 'ค้นหาที่ฝึกงานที่ตรงกับคุณ ติดตามใบสมัคร และบันทึกประสบการณ์การทำงาน ตั้งแต่ก้าวแรกจนถึงวันประเมินผล' : 'Find an internship that fits. Keep your applications, daily work, and mentor feedback together, from your first step to your final review.'}</p>
              <div className="hero-actions"><button className="ui-button" onClick={() => jump('featured')}>{isTh ? 'ค้นหาที่ฝึกงาน' : 'Explore internships'}<ArrowRight size={18}/></button><Link className="ui-text-link" to="/register">{isTh ? 'สร้างโปรไฟล์ของคุณ' : 'Create your profile'}<ArrowRight size={16}/></Link></div>
              <div className="hero-proof"><span><Check size={14}/>{isTh ? 'สำหรับนักศึกษา' : 'Built for students'}</span><span><Check size={14}/>{isTh ? 'ทำงานร่วมกับบริษัท' : 'Connected with employers'}</span></div>
            </div>
            <div className="hero-visual" aria-label={isTh ? 'ภาพรวมขั้นตอนการฝึกงาน' : 'Your internship journey'}>
              <div className="visual-grid"/>
              <div className="visual-caption">A NEW PERSPECTIVE ON YOUR FUTURE</div>
              <div className="journey-card">
                <div className="journey-card-top"><span className="journey-icon"><Compass size={21}/></span><span>{isTh ? 'เส้นทางของคุณ' : 'Your internship journey'}<small>{isTh ? 'หนึ่งพื้นที่ สำหรับทุกก้าวต่อไป' : 'One place for every next step.'}</small></span><span className="journey-dots">•••</span></div>
                <div className="journey-step journey-step-active"><span className="journey-step-number">01</span><span><strong>{isTh ? 'ค้นพบโอกาสที่ใช่' : 'Discover your direction'}</strong><small>{isTh ? 'ค้นหาและเลือกสายงานที่สนใจ' : 'Explore roles that match your interests.'}</small></span><ArrowRight size={17}/></div>
                <div className="journey-step"><span className="journey-step-number">02</span><span><strong>{isTh ? 'เปลี่ยนโอกาสเป็นก้าวแรก' : 'Make your first move'}</strong><small>{isTh ? 'ส่งใบสมัครและติดตามสถานะ' : 'Apply and follow your next steps.'}</small></span><FileText size={17}/></div>
                <div className="journey-step"><span className="journey-step-number">03</span><span><strong>{isTh ? 'เก็บทุกการเติบโต' : 'Turn experience into growth'}</strong><small>{isTh ? 'บันทึกงานและรับคำแนะนำจากพี่เลี้ยง' : 'Record your work and mentor feedback.'}</small></span><Check size={17}/></div>
                <div className="journey-card-bottom"><span className="mini-leaves"><Layers size={14}/></span>{isTh ? 'ตั้งแต่ใบสมัคร จนถึงประสบการณ์จริง' : 'From first application to real experience.'}</div>
              </div>
              <div className="opportunity-note"><span className="note-icon"><Briefcase size={18}/></span><span><strong>{loading ? '—' : jobs.length} {isTh ? 'โอกาสที่เปิดรับ' : 'open opportunities'}</strong><small>{isTh ? 'สำรวจก้าวต่อไปของคุณ' : 'Your next move is out there.'}</small></span><span className="note-arrow">↗</span></div>
              <div className="visual-footnote"><span>DISCOVER</span><span>APPLY</span><span>GROW</span></div>
            </div>
          </div>
          <div className="landing-container">
            <form className="landing-search" onSubmit={event => { event.preventDefault(); jump('featured'); }}>
              <label className="search-field search-keyword"><Search size={19}/><span><span className="field-caption">{isTh ? 'ค้นหาตำแหน่งงาน' : 'WHAT ARE YOU LOOKING FOR?'}</span><input aria-label={t.home.searchPlaceholder} placeholder={t.home.searchPlaceholder} value={searchQuery} onChange={event => setSearchQuery(event.target.value)}/></span></label>
              <label className="search-field"><Compass size={18}/><span><span className="field-caption">{isTh ? 'สายงานที่สนใจ' : 'YOUR FIELD'}</span><select aria-label={isTh ? 'หมวดหมู่งาน' : 'Job category'} value={selectedCategory} onChange={event => setSelectedCategory(event.target.value)}><option value="ALL">{isTh ? 'ทุกหมวดหมู่' : 'All categories'}</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></span><ChevronDown size={14}/></label>
              <label className="search-field"><MapPin size={18}/><span><span className="field-caption">{isTh ? 'รูปแบบการทำงาน' : 'WORK PREFERENCE'}</span><select aria-label={isTh ? 'สถานที่ทำงาน' : 'Work preference'} value={selectedWorkType} onChange={event => setSelectedWorkType(event.target.value)}><option value="ALL">{isTh ? 'ทุกสถานที่' : 'Any location'}</option><option value="BANGKOK">{isTh ? 'กรุงเทพฯ' : 'Bangkok'}</option><option value="HYBRID">Hybrid</option><option value="REMOTE">Remote</option></select></span><ChevronDown size={14}/></label>
              <button type="submit" className="ui-button">{t.home.searchBtn}<Search size={17}/></button>
            </form>
            <div className="search-suggestions"><span>{isTh ? 'ลองค้นหา' : 'A place to start:'}</span>{['Frontend','Data','Design','Product','Cloud','Bangkok'].map(tag => <button key={tag} onClick={() => {setSearchQuery(tag);jump('featured');}}>{tag}<span>↗</span></button>)}</div>
          </div>
        </section>

        <section id="categories" className="landing-section landing-container">
          <div className="section-heading"><div><p className="section-eyebrow">FIND YOUR DIRECTION</p><h2>{isTh ? 'แต่ละคนมีเส้นทางของตัวเอง' : 'Different paths. Your kind of future.'}</h2><p>{isTh ? 'เริ่มจากสายงานที่คุณสนใจ แล้วค้นหาโอกาสที่เหมาะกับคุณ' : 'Start with what interests you. Find the opportunity that feels right.'}</p></div><Link className="ui-text-link" to={searchHref()}>{t.home.viewAllJobs}<ArrowRight size={17}/></Link></div>
          <div className="category-grid">{categories.map(category => {const Icon=category.icon; return <button key={category.id} className="category-tile" aria-pressed={selectedCategory===category.id} onClick={() => {setSelectedCategory(category.id);jump('search');}}><span className="category-icon"><Icon size={22}/></span><strong>{category.name}</strong><span className="category-count">{category.count}</span><ArrowRight size={17} className="category-arrow"/></button>;})}</div>
        </section>

        <section id="featured" className="openings-section">
          <div className="landing-container">
            <div className="section-heading"><div><p className="section-eyebrow">OPPORTUNITIES, OPEN NOW</p><h2>{isTh ? 'ก้าวต่อไป อาจอยู่ตรงนี้' : 'Good things begin with a first step.'}</h2><p>{isTh ? 'ตำแหน่งที่เปิดรับสมัครบน InternFlow' : 'Explore the latest internship openings on InternFlow.'}</p></div><span className="listing-total">{loading ? '—' : filteredJobs.length} {isTh ? 'ตำแหน่ง' : 'openings'}</span></div>
            <div className="opening-tabs" aria-label={isTh ? 'กรองตำแหน่งงาน' : 'Filter openings'}>{(['ALL','TECH','DESIGN','MARKETING','REMOTE'] as const).map(tab => <button key={tab} aria-pressed={activeJobTab===tab} onClick={() => setActiveJobTab(tab)}>{({ALL:isTh?'ทั้งหมด':'All openings',TECH:isTh?'เทคโนโลยี':'Technology',DESIGN:isTh?'ออกแบบ':'Design',MARKETING:isTh?'การตลาด':'Marketing',REMOTE:isTh?'ทำงานทางไกล':'Remote'})[tab]}</button>)}</div>
            {loading && <div className="landing-empty" role="status"><span className="loading-ring"/>{isTh ? 'กำลังค้นหาโอกาสให้คุณ…' : 'Loading opportunities…'}</div>}
            {loadError && <div className="landing-empty" role="alert">{isTh ? 'โหลดตำแหน่งงานไม่สำเร็จ กรุณาลองใหม่' : 'Unable to load openings. Please try again.'}</div>}
            {!loading&&!loadError&&!filteredJobs.length&&<div className="landing-empty" role="status"><Search size={28}/><strong>{isTh?'ยังไม่พบตำแหน่งที่ตรงกับการค้นหา':'No openings match your search.'}</strong><span>{isTh?'ลองเปลี่ยนคำค้นหรือเลือกหมวดหมู่อื่น':'Try a different keyword or category.'}</span></div>}
            <div className="opening-grid">{filteredJobs.map(job => <article className="opening-card" key={job.id}><div className="opening-card-top"><div className="company-monogram">{job.logo}</div><span className="work-mode">{job.isRemote?'Remote':'On-site'}</span></div><div className="opening-company">{job.companyName}</div><h3>{job.title}</h3><p className="opening-location"><MapPin size={14}/>{job.location}</p><div className="opening-details"><span><Coins size={14}/>{job.stipend}</span><span><Clock size={14}/>{job.workingHours||(isTh?'สอบถามเวลาทำงาน':'Hours on enquiry')}</span></div><div className="opening-card-footer"><span>{job.positions} {isTh?'ตำแหน่งที่เปิดรับ':'open spots'}</span><Link to={searchHref(job)} aria-label={`${isTh?'ดูรายละเอียด':'View opportunity'}: ${job.title}`}>{isTh?'ดูรายละเอียด':'View role'}<ArrowRight size={16}/></Link></div></article>)}</div>
            <div className="section-centered-action"><Link className="ui-button ui-button-outline" to={searchHref()}>{t.home.viewAllJobs}<ArrowRight size={17}/></Link></div>
          </div>
        </section>

        <section id="how-it-works" className="landing-section landing-container">
          <div className="section-heading"><div><p className="section-eyebrow">LESS ADMIN. MORE EXPERIENCE.</p><h2>{isTh?'โฟกัสกับการเรียนรู้ ที่เหลือจัดการง่ายขึ้น':'A clearer path from application to experience.'}</h2></div></div>
          <div className="process-grid">{[{title:isTh?'บอกเล่าตัวตนของคุณ':'Make it yours',description:isTh?'สร้างโปรไฟล์ เพิ่มทักษะ และเตรียมเอกสารสำหรับใบสมัคร':'Build your profile, add your skills, and prepare your application documents.'},{title:isTh?'เลือกโอกาส แล้วเริ่มต้น':'Find your next step',description:isTh?'ส่งใบสมัคร ติดตามสถานะ และยืนยันที่ฝึกงานเมื่อได้รับข้อเสนอ':'Apply, follow your status, and confirm your placement when an offer arrives.'},{title:isTh?'เก็บประสบการณ์ให้เป็นเรื่องราว':'See your progress',description:isTh?'บันทึกสิ่งที่ทำ รับคำแนะนำจากพี่เลี้ยง และดูผลประเมินของคุณ':'Keep a daily log, receive mentor feedback, and view your evaluation.'}].map((step,index) => <div className="process-step" key={step.title}><span>0{index+1}</span><h3>{step.title}</h3><p>{step.description}</p></div>)}</div>
        </section>

        <section className="employer-section landing-container"><div className="employer-panel"><div><p className="section-eyebrow"><Sparkles size={15}/>FOR TEAMS THAT BUILD THE FUTURE</p><h2>{isTh?'เปิดโอกาสให้คนรุ่นใหม่\nเติบโตไปกับทีมคุณ':'Your next great teammate\ncould start here.'}</h2><p>{isTh?'ลงประกาศฝึกงาน ดูแลใบสมัคร และติดตามประสบการณ์การทำงานของนักศึกษาในพื้นที่เดียว':'Publish internships, manage applicants, and support your interns in one workspace.'}</p><Link to="/register" className="ui-button ui-button-lime">{isTh?'เริ่มต้นสำหรับบริษัท':'Get started as an employer'}<ArrowRight size={18}/></Link></div><div className="employer-graphic" aria-hidden="true"><span className="employer-ring"/><span className="employer-ring employer-ring-two"/><Briefcase size={58}/><span className="employer-graphic-caption">BETTER TOGETHER.</span></div></div></section>

        <section id="faq" className="landing-section landing-container faq-layout"><div><p className="section-eyebrow">A LITTLE MORE CLARITY</p><h2>{isTh?'คำถามก่อนเริ่มต้น':'Before you take the next step.'}</h2><p>{isTh?'รู้จักการใช้งาน InternFlow ให้มากขึ้น':'A few things to know about getting started.'}</p></div><div className="faq-list">{faqs.map((faq,index) => <div className="faq-entry" key={faq.q}><h3><button aria-expanded={openFaq===index} aria-controls={`faq-answer-${index}`} onClick={() => toggleFaq(index)}>{faq.q}<ChevronDown size={19} className={openFaq===index?'faq-chevron-open':''}/></button></h3>{openFaq===index&&<p id={`faq-answer-${index}`}>{faq.a}</p>}</div>)}</div></section>
      </main>
      <footer className="landing-footer"><div className="landing-container footer-content"><Link to="/" className="brand-lockup"><span className="brand-symbol">if<span>•</span></span><span>Intern<span className="brand-flow">Flow</span><small>Your experience. Your next chapter.</small></span></Link><p>{isTh?'พื้นที่สำหรับทุกก้าวของการฝึกงาน':'A thoughtful space for your internship journey.'}</p><span>© {new Date().getFullYear()} InternFlow</span></div></footer>
    </div>
  );
}
