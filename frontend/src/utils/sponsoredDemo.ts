export interface SponsoredDemoJob {
  id: string;
  title: string;
  description: string;
  location: string;
  isRemote: boolean;
  isActive?: boolean;
  company: { companyName: string; logoUrl: string | null };
}

// Preview placements only. No paid status, campaign, or ranking is persisted.
export function getDemoSponsoredJobs(jobs: SponsoredDemoJob[]) {
  return jobs.filter(job => job.isActive !== false).slice(0, 2);
}

