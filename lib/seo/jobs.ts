import type { JobPosting } from "@/lib/cms/types";
export function isCurrentJob(job: JobPosting, now = new Date()): boolean {
  if (!job.isVisible) return false;
  if (job.validThrough && (!/^\d{4}-\d{2}-\d{2}$/.test(job.validThrough) || Date.parse(`${job.validThrough}T23:59:59.999Z`) < now.getTime())) return false;
  if (job.datePosted && Date.parse(job.datePosted) > now.getTime()) return false;
  return true;
}
export function hasJobPage(job: JobPosting, now = new Date()): boolean {
  return Boolean(isCurrentJob(job,now) && job.confirmedOpening && job.title && job.description && job.datePosted && job.validThrough && job.addressLocality && job.addressRegion && /^[a-zA-Z0-9_-]+$/.test(job.id));
}
export const jobPath = (job: JobPosting) => `/careers/${encodeURIComponent(job.id)}`;
