/**
 * The Advisor Content CMS model.
 *
 * Three ideas hold this together, and everything else follows from them:
 *
 * 1. An ARTICLE is an identity — a slug, an owner, a status, and pointers. It
 *    holds no content of its own.
 * 2. A REVISION is the content. Editable only while it is a draft; frozen the
 *    moment it is submitted, and frozen for good.
 * 3. Approval is a REVIEW ROW keyed by revision id. There is no `approved`
 *    flag on an article anywhere in this codebase, so a later edit has nothing
 *    to inherit.
 *
 * The revision payload is deliberately the same shape the public renderer
 * already consumes (lib/insights/types.ts). The CMS supplies article data; the
 * existing Keybase newsroom template decides how it looks.
 */

import type { ArticleBlock, ArticleSource } from "@/lib/insights/types";

// ---------------------------------------------------------------------------
// People and permissions
// ---------------------------------------------------------------------------

/**
 * Who someone is in the content system.
 *
 * Deliberately three values and no more. "Can this person approve their own
 * article?" must have one answer decided in one place (lib/content/authz.ts),
 * not a permission matrix that drifts.
 */
export type ContentRole = "advisor" | "compliance" | "admin";

export interface ContentUser {
  id: string;
  email: string;
  name: string;
  role: ContentRole;
  /**
   * Optional link into the people registry (lib/people). When present, the
   * public byline, portrait, and profile link all resolve from that one person
   * record — the article never keeps its own copy of someone's job title.
   */
  personId?: string;
  /** Byline title for an author who has no people-registry record yet. */
  authorTitle: string;
  isActive: boolean;
  createdAt: string;
}

/** A user without anything that could authenticate as them. */
export type PublicContentUser = Omit<ContentUser, never>;

// ---------------------------------------------------------------------------
// Content types
// ---------------------------------------------------------------------------

/**
 * What kind of piece this is. This is the field that separates corporate
 * content from an individual advisor's own voice, so it drives the public
 * eyebrow, the byline treatment, and who is allowed to author it.
 */
export type ContentType =
  | "market-perspective"
  | "advisor-perspective"
  | "financial-education"
  | "company-news";

export interface ContentTypeConfig {
  label: string;
  /** The uppercase line above the headline on the public page. */
  eyebrow: string;
  /** Default newsroom category. */
  category: string;
  /** Maps onto the existing InsightArticle.kind, which the template reads. */
  kind: "educational" | "market" | "company-news";
  /** True where the piece is one person's perspective, not the firm's. */
  advisorAuthored: boolean;
  description: string;
}

export const CONTENT_TYPES: Record<ContentType, ContentTypeConfig> = {
  "market-perspective": {
    label: "Keybase Market Perspective",
    eyebrow: "Keybase Market Perspectives",
    category: "Market Perspectives",
    kind: "market",
    advisorAuthored: false,
    description: "Corporate market and economic commentary, published by Keybase.",
  },
  "advisor-perspective": {
    label: "Advisor Perspective",
    eyebrow: "Advisor Perspective",
    category: "Advisor Perspectives",
    kind: "market",
    advisorAuthored: true,
    description:
      "An individual advisor's own commentary, published under their name inside the Keybase newsroom.",
  },
  "financial-education": {
    label: "Financial Education",
    eyebrow: "Financial Education",
    category: "Financial Education",
    kind: "educational",
    advisorAuthored: false,
    description: "Long-form explainers on planning, saving, and investing.",
  },
  "company-news": {
    label: "Company News",
    eyebrow: "Keybase News",
    category: "Company News",
    kind: "company-news",
    advisorAuthored: false,
    description: "Firm announcements. Carries no educational disclaimer.",
  },
};

export const CONTENT_TYPE_KEYS = Object.keys(CONTENT_TYPES) as ContentType[];

export function isContentType(value: unknown): value is ContentType {
  return typeof value === "string" && value in CONTENT_TYPES;
}

// ---------------------------------------------------------------------------
// Workflow state
// ---------------------------------------------------------------------------

/**
 * Where an article sits in the workflow. One value, on the article, describing
 * the whole piece — while `RevisionState` describes one snapshot of it. The two
 * are separate because an article can be published (v4) and simultaneously have
 * a fresh draft in progress (v5).
 */
export type ArticleStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "changes_requested"
  | "approved"
  | "scheduled"
  | "published"
  | "rejected"
  | "archived";

export type RevisionState =
  | "draft"
  | "submitted"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "superseded";

export const ARTICLE_STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  changes_requested: "Changes Requested",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
};

/** Statuses where compliance is holding the piece and the author cannot edit. */
export const LOCKED_STATUSES: ArticleStatus[] = ["submitted", "under_review"];

// ---------------------------------------------------------------------------
// The revision payload — what an author actually writes
// ---------------------------------------------------------------------------

/**
 * A hero image as the CMS stores it: an object-storage KEY, never a URL, so a
 * CDN or domain change stays a config change. Resolved at render time by
 * lib/cms/media/url.ts, exactly as every other CMS image already is.
 */
export interface PayloadImage {
  key: string;
  alt: string;
  width: number;
  height: number;
}

/**
 * The byline an article prints when its author has no people-registry record.
 *
 * A snapshot, and that is the point: it is captured onto the revision at
 * submission, so an approved article keeps saying what compliance approved even
 * if the author's title changes afterwards. Where `personId` is set instead,
 * the live person record wins — one spelling of a job title, one place.
 */
export interface PayloadByline {
  name: string;
  role: string;
  organization: string;
  /** Set only when a published profile page genuinely exists. */
  profilePath?: string;
}

/**
 * Everything an author writes, in one object.
 *
 * This is what gets snapshotted into a revision, what compliance reviews, and
 * what the public template renders. Every field is required at the type level
 * (empty string / empty array rather than optional) so a payload read back out
 * of the database can never be half-shaped — validation happens once, on the
 * way in, in lib/content/normalize.ts.
 */
export interface ArticlePayload {
  title: string;
  /** The standfirst under the headline. */
  deck: string;
  /** One or two sentences, used on listing cards. */
  excerpt: string;
  category: string;
  /** Overrides the content type's default eyebrow. Usually left empty. */
  eyebrow: string;
  heroImage: PayloadImage | null;
  body: ArticleBlock[];
  sources: ArticleSource[];
  keyTakeaways: string[];
  tags: string[];
  /**
   * Article-specific wording appended below the mandatory corporate
   * disclosure. It can never replace or remove it.
   */
  additionalDisclosure: string;
  seoTitle: string;
  seoDescription: string;
  /** Author snapshot. Ignored when the article's owner has a `personId`. */
  authorByline: PayloadByline | null;
}

export function emptyPayload(): ArticlePayload {
  return {
    title: "",
    deck: "",
    excerpt: "",
    category: "",
    eyebrow: "",
    heroImage: null,
    body: [],
    sources: [],
    keyTakeaways: [],
    tags: [],
    additionalDisclosure: "",
    seoTitle: "",
    seoDescription: "",
    authorByline: null,
  };
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export interface ContentArticle {
  id: string;
  slug: string;
  contentType: ContentType;
  status: ArticleStatus;
  ownerId: string;
  currentDraftRevisionId: string | null;
  submittedRevisionId: string | null;
  publishedRevisionId: string | null;
  publishedAt: string | null;
  scheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentRevision {
  id: string;
  articleId: string;
  revisionNumber: number;
  state: RevisionState;
  payload: ArticlePayload;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** Non-null means the content is frozen forever. Enforced by a DB trigger. */
  frozenAt: string | null;
}

export type ReviewDecision = "changes_requested" | "rejected" | "approved";

/**
 * The reviewer's checklist. A review AID: these are ticks a person made, and
 * nothing in this system reads them to decide whether an article is compliant.
 */
export interface ReviewChecklist {
  authorIdentity?: boolean;
  sourcesReviewed?: boolean;
  claimsSupported?: boolean;
  disclosuresIncluded?: boolean;
  externalLinksReviewed?: boolean;
  brandingMet?: boolean;
}

export const REVIEW_CHECKLIST_ITEMS: {
  key: keyof ReviewChecklist;
  label: string;
}[] = [
  { key: "authorIdentity", label: "Author identity confirmed" },
  { key: "sourcesReviewed", label: "Sources reviewed" },
  { key: "claimsSupported", label: "Financial claims supported" },
  { key: "disclosuresIncluded", label: "Disclosures included" },
  { key: "externalLinksReviewed", label: "External links reviewed" },
  { key: "brandingMet", label: "Branding requirements met" },
];

export interface ContentReview {
  id: string;
  articleId: string;
  revisionId: string;
  reviewerId: string;
  decision: ReviewDecision;
  comment: string;
  checklist: ReviewChecklist;
  createdAt: string;
}

export type AuditAction =
  | "article_created"
  | "draft_saved"
  | "revision_submitted"
  | "review_started"
  | "changes_requested"
  | "rejected"
  | "approved"
  | "revision_created"
  | "published"
  | "scheduled"
  | "unpublished"
  | "archived"
  | "slug_changed"
  | "settings_changed";

export interface ContentAuditEntry {
  id: string;
  articleId: string | null;
  revisionId: string | null;
  actorId: string | null;
  actorLabel: string;
  action: AuditAction;
  metadata: Record<string, unknown>;
  createdAt: string;
}
