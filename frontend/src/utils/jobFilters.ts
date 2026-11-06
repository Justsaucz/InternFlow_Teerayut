export interface SearchableJob {
  title: string;
  description: string;
  requirements: string;
  location: string;
  isRemote: boolean;
  company: { companyName: string };
}

// Categories are text filters over the existing posting fields, not verified skills.
const categories: Record<string, RegExp> = {
  DATA: /data|machine learning|\bai\b|ข้อมูล|ปัญญาประดิษฐ์/i,
  DESIGN: /design|\bux\b|\bui\b|figma|ออกแบบ/i,
  MARKETING: /marketing|content|seo|การตลาด|สื่อสาร/i,
  PRODUCT: /product|project|ผลิตภัณฑ์|โครงการ/i,
  BUSINESS: /business|finance|account|ธุรกิจ|บัญชี|การเงิน/i,
  TECH: /engineer|developer|software|react|cloud|devops|program|เทค|ซอฟต์แวร์|วิศว/i
};
export function jobCategory(job: SearchableJob) {
  return Object.keys(categories).find(key => categories[key].test(job.title)) || 'OTHER';
}
export function matchesJob(job: SearchableJob, query: string, category = 'ALL', workType = 'ALL') {
  const text = [job.title, job.description, job.requirements, job.location, job.company.companyName].join(' ').toLocaleLowerCase();
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.every(term => text.includes(term))) return false;
  if (category !== 'ALL' && jobCategory(job) !== category) return false;
  if (workType === 'REMOTE' && !job.isRemote) return false;
  if (workType === 'ONSITE' && job.isRemote) return false;
  if (workType === 'HYBRID' && !/hybrid|ผสม|ไฮบริด/i.test(job.location)) return false;
  if (workType === 'BANGKOK' && !/bangkok|กรุงเทพ/i.test(job.location)) return false;
  return true;
}
