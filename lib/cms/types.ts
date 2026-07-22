/**
 * Shared types for the Website CMS.
 *
 * The CMS stores every editable area of the public site as a "document" that
 * carries a draft copy, the currently published copy, and a trail of previous
 * published versions. The public website only ever reads the `published` copy;
 * the /admin ERP edits the `draft` copy and promotes it on Publish.
 *
 * Storage is file-backed (see lib/cms/store.ts) to match the existing
 * executives store — no external database is required.
 */

/** Identifiers for each editable area of the site. */
export type CmsResource =
  | "global-settings"
  | "footer"
  | "navigation"
  | "executives"
  | "service-pages"
  | "careers"
  | "newsroom"
  | "content-pages";

/** A snapshot of a document's content at publish time, kept for restore. */
export interface CmsVersion<T> {
  id: string;
  versionNumber: number;
  snapshot: T;
  changeSummary: string;
  createdBy: string;
  createdAt: string;
  /** True when this snapshot was the live content at some point. */
  isPublishedVersion: boolean;
}

/**
 * A single editable document: its working draft, the live published copy, and
 * the history of previously published versions.
 */
export interface CmsDoc<T> {
  resource: CmsResource;
  /** The working copy edited in the admin. Never shown to the public. */
  draft: T;
  /** The live copy shown on the public website. Null until first publish. */
  published: T | null;
  /** Previous published snapshots, newest first. */
  versions: CmsVersion<T>[];
  draftUpdatedAt: string;
  draftUpdatedBy: string;
  publishedAt: string | null;
  publishedBy: string | null;
}

// ---------------------------------------------------------------------------
// Content payload shapes (the `T` in CmsDoc<T> for each resource)
// ---------------------------------------------------------------------------

export interface SocialLink {
  platform: "linkedin" | "x" | "instagram" | "youtube" | "facebook" | "other";
  label: string;
  url: string;
}

/** Company-wide settings shared across the whole website. */
export interface GlobalSettings {
  companyName: string;
  logoUrl: string;
  logoAlt: string;
  address: string;
  phone: string;
  generalEmail: string;
  supportEmail: string;
  socialLinks: SocialLink[];
  /** Copyright line; the literal `{year}` is replaced at render time. */
  copyrightText: string;
  footerDescription: string;
  defaultSeoTitle: string;
  defaultSeoDescription: string;
  defaultSocialImage: string;
  /** Promo text in the top utility bar of the header. */
  headerAnnouncement: string;
  headerAnnouncementUrl: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
}

export interface FooterLink {
  label: string;
  url: string;
  openInNewTab: boolean;
}

export interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

export interface FooterContent {
  columns: FooterColumn[];
  /** Extra "Terms of Use / Disclosures" style links in the legal row. */
  legalLinks: FooterLink[];
}

export interface NavChild {
  label: string;
  url: string;
  openInNewTab: boolean;
  isVisible: boolean;
}

export interface NavItem {
  label: string;
  /** Optional own link. Parent items with children usually have no url. */
  url: string;
  openInNewTab: boolean;
  isVisible: boolean;
  children: NavChild[];
  /**
   * When true this item renders the built-in "Our Services" mega menu, whose
   * nested structure stays in code. Only the label/visibility are editable.
   */
  isServicesMega: boolean;
}

export interface NavContent {
  /** Primary top-level menu items. */
  items: NavItem[];
  /** Small links in the top utility bar (Client Access, Advisor Access…). */
  utilityLinks: NavChild[];
}

/** One leadership-team member (mirrors the public KeyExecutives card). */
export interface ExecutiveItem {
  id: string;
  name: string;
  title: string;
  lead: string;
  paragraphs: string[];
  photoUrl: string | null;
  photoClass: string | null;
  comingSoon: boolean;
  ceoMessage: boolean;
  href: string | null;
  /** Per-person show/hide, independent of the whole-doc publish state. */
  isVisible: boolean;
}

export interface ExecutivesContent {
  people: ExecutiveItem[];
}

/**
 * Editable content for one public "service" marketing page (e.g. Tax Planning).
 * Covers the hero and SEO — the fields non-technical staff most need to change.
 * The bespoke body sections of each page remain in the page's own design.
 */
export interface ServicePageContent {
  /** URL slug and stable key, e.g. "tax-planning". Not editable in the admin. */
  slug: string;
  /** Group heading in the admin, e.g. "Wealth Planning". */
  group: string;
  /** Uppercase eyebrow above the hero heading, and the middle breadcrumb label. */
  eyebrow: string;
  /** Final breadcrumb label (usually the page name). */
  breadcrumbLabel: string;
  heading: string;
  intro: string;
  heroImage: string;
  ctaLabel: string;
  ctaUrl: string;
  seoTitle: string;
  seoDescription: string;
}

export interface ServicePagesContent {
  pages: ServicePageContent[];
}

/** One open position on the Careers page. */
export interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  /** Employment type, e.g. "Full-time". */
  type: string;
  description: string;
  isVisible: boolean;
}

export interface CareersContent {
  hero: { eyebrow: string; heading: string; intro: string };
  roles: JobPosting[];
}

/** One article/insight on the Newsroom page. */
export interface NewsArticle {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  /** Free-form display date, e.g. "2026.06.22". */
  date: string;
  author: string;
  isVisible: boolean;
}

export interface NewsroomContent {
  hero: { eyebrow: string; heading: string; intro: string };
  articles: NewsArticle[];
}

/**
 * A simple hero + SEO record for a standalone marketing page that isn't part of
 * a bigger collection (About, CEO Message, etc.). The bespoke body of each page
 * stays in its own design; these are the safely-editable headline fields.
 */
export interface ContentPage {
  slug: string;
  label: string;
  eyebrow: string;
  heading: string;
  intro: string;
  seoTitle: string;
  seoDescription: string;
}

export interface ContentPagesContent {
  pages: ContentPage[];
}

// ---------------------------------------------------------------------------
// Media library (not draft/published — assets are available immediately)
// ---------------------------------------------------------------------------

export interface MediaItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  altText: string;
  uploadedBy: string;
  uploadedAt: string;
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export type CmsAuditAction =
  | "save_draft"
  | "publish"
  | "discard_draft"
  | "restore_version"
  | "media_upload"
  | "media_delete"
  | "media_update";

export interface CmsAuditEntry {
  id: string;
  userId: string;
  action: CmsAuditAction;
  resource: string;
  description: string;
  createdAt: string;
}
