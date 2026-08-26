import { compact, entityReference, type SchemaNode } from "./types";
import { entityId } from "../siteUrl";
import type { PostalAddressInput } from "./organization";

export interface JobPostingInput {
  title: string;
  description: string;
  /** ISO 8601. Required by consumers of JobPosting — no date, no schema. */
  datePosted?: string;
  validThrough?: string;
  /** e.g. "FULL_TIME", "PART_TIME", "CONTRACTOR". */
  employmentType?: string;
  hiringOrganization?: { name: string; idFragment?: string };
  jobLocation?: PostalAddressInput;
  /** Country a candidate must be able to work from, for remote roles. */
  applicantLocationRequirements?: string;
  /** True only when the application is completed on this site. */
  directApply?: boolean;
  /** Absolute URL of the posting's own page. */
  url?: string;
}

/**
 * A `JobPosting` node for genuine, dated, individually-addressable openings.
 *
 * Returns `null` without a title, description, and real `datePosted`. The
 * careers page today lists roles from the CMS that carry no posting date, no
 * closing date, and no page of their own — a recruitment-marketing list rather
 * than a set of postings. Marking that up would misrepresent it, so nothing
 * calls this builder yet.
 */
export function buildJobPosting(input: JobPostingInput): SchemaNode | null {
  if (!input.title?.trim() || !input.description?.trim() || !input.datePosted?.trim()) {
    return null;
  }

  return compact({
    "@type": "JobPosting",
    title: input.title,
    description: input.description,
    datePosted: input.datePosted,
    validThrough: input.validThrough,
    employmentType: input.employmentType,
    hiringOrganization: input.hiringOrganization
      ? entityReference(
          "Organization",
          input.hiringOrganization.name,
          input.hiringOrganization.idFragment
            ? entityId(input.hiringOrganization.idFragment)
            : undefined,
        )
      : undefined,
    jobLocation: input.jobLocation
      ? {
          "@type": "Place",
          address: compact({ "@type": "PostalAddress", ...input.jobLocation }),
        }
      : undefined,
    applicantLocationRequirements: input.applicantLocationRequirements
      ? { "@type": "Country", name: input.applicantLocationRequirements }
      : undefined,
    directApply: input.directApply,
    url: input.url,
  });
}
