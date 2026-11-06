import type { PortfolioSummary } from '../components/PortfolioSummaryCard';
export type RequirementCoverage={percentage:number;score:number;maximum:number;found:number;partial:number;notFound:number};
export function requirementCoverage(report:PortfolioSummary|null|undefined,expectedContextHash?:string):RequirementCoverage|null{
 if(!report||report.format!=='PORTFOLIO_SUMMARY_V2'||!report.contents.length||!report.requirements.length)return null;
 if(expectedContextHash&&report.contextHash!==expectedContextHash)return null;
 const ids=report.requirements.map(r=>r.id);
 if(new Set(ids).size!==ids.length||report.requirements.some(r=>!['FOUND','PARTIAL','NOT_FOUND'].includes(r.status)))return null;
 const found=report.requirements.filter(r=>r.status==='FOUND').length;
 const partial=report.requirements.filter(r=>r.status==='PARTIAL').length;
 const notFound=report.requirements.filter(r=>r.status==='NOT_FOUND').length;
 const maximum=report.requirements.length,score=found+partial*.5;
 return {percentage:Math.round(score/maximum*1000)/10,score,maximum,found,partial,notFound};
}
