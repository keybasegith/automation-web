import type {
  ArticleStatus,
  ContentArticle,
  ContentRole,
  ContentType,
  ContentUser,
} from "@/lib/content/types";
import { CONTENT_TYPES, LOCKED_STATUSES } from "@/lib/content/types";

/**
 * THE single place that decides who may do what to content.
 *
 * Every API route calls into here before it touches the database. The UI also
 * calls it, but only to decide which buttons to draw — hiding a button is a
 * courtesy, not a control, and no permission is enforced anywhere else.
 *
 * The rules that matter most, stated once:
 *
 *   - An advisor may edit only their OWN article, and only while it is not
 *     sitting with compliance.
 *   - Nobody approves their own work. Not an advisor, not a compliance officer
 *     who happens to have written something, not an admin.
 *   - Publishing requires an approval of the EXACT revision being published,
 *     which is checked against the database in lib/content/service.ts. The
 *     rule here is only about who may press the button.
 */

export interface Actor {
  id: string;
  role: ContentRole;
  isActive: boolean;
}

export function actorFromUser(user: ContentUser): Actor {
  return { id: user.id, role: user.role, isActive: user.isActive };
}

const isAdmin = (a: Actor) => a.role === "admin";
const isCompliance = (a: Actor) => a.role === "compliance";
const owns = (a: Actor, article: ContentArticle) => article.ownerId === a.id;

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/**
 * Who may open an article in the CMS at all.
 *
 * Compliance can see any article that has been submitted at least once — a
 * private draft nobody has asked them to review is none of their business.
 */
export function canViewArticle(actor: Actor, article: ContentArticle): boolean {
  if (!actor.isActive) return false;
  if (isAdmin(actor)) return true;
  if (owns(actor, article)) return true;
  if (isCompliance(actor)) return hasEverBeenSubmitted(article);
  return false;
}

/** True once an article has entered the compliance workflow. */
function hasEverBeenSubmitted(article: ContentArticle): boolean {
  return (
    article.submittedRevisionId !== null ||
    article.publishedRevisionId !== null ||
    article.status !== "draft"
  );
}

/** Who may read the private preview of a specific revision. */
export function canPreviewArticle(
  actor: Actor,
  article: ContentArticle
): boolean {
  return canViewArticle(actor, article);
}

// ---------------------------------------------------------------------------
// Authoring
// ---------------------------------------------------------------------------

/** Advisors write their own perspective; corporate types are staff-authored. */
export function canCreateContentType(actor: Actor, type: ContentType): boolean {
  if (!actor.isActive) return false;
  if (isAdmin(actor)) return true;
  // Compliance reviews content; it does not author the firm's corporate voice.
  if (isCompliance(actor)) return false;
  return CONTENT_TYPES[type].advisorAuthored;
}

export function canCreateArticle(actor: Actor): boolean {
  return (
    actor.isActive && (isAdmin(actor) || actor.role === "advisor")
  );
}

/**
 * Whether the working draft may be edited right now.
 *
 * The status gate is what stops an author changing the words underneath a
 * reviewer. It is belt-and-braces: the revision compliance holds is frozen in
 * the database too, so even a bug here cannot alter a submitted revision.
 */
export function canEditArticle(actor: Actor, article: ContentArticle): boolean {
  if (!actor.isActive) return false;
  if (article.status === "archived") return false;
  if (LOCKED_STATUSES.includes(article.status)) return false;
  if (isAdmin(actor)) return true;
  return owns(actor, article);
}

/** Why editing is blocked, in words an author can act on. */
export function editBlockedReason(
  actor: Actor,
  article: ContentArticle
): string | null {
  if (canEditArticle(actor, article)) return null;
  if (!actor.isActive) return "This account is no longer active.";
  if (article.status === "archived") return "This article is archived.";
  if (LOCKED_STATUSES.includes(article.status)) {
    return "Compliance is reviewing this version. You can edit again once they respond.";
  }
  return "You can only edit articles you created.";
}

export function canSubmitForReview(
  actor: Actor,
  article: ContentArticle
): boolean {
  if (!canEditArticle(actor, article)) return false;
  const submittable: ArticleStatus[] = [
    "draft",
    "changes_requested",
    "rejected",
    "approved",
    "published",
  ];
  return submittable.includes(article.status);
}

/** Only an admin may retarget a slug, and never one that is already live. */
export function canChangeSlug(actor: Actor, article: ContentArticle): boolean {
  if (!actor.isActive) return false;
  if (article.publishedRevisionId !== null) return isAdmin(actor);
  return isAdmin(actor) || owns(actor, article);
}

// ---------------------------------------------------------------------------
// Compliance
// ---------------------------------------------------------------------------

export function canReviewQueue(actor: Actor): boolean {
  return actor.isActive && (isCompliance(actor) || isAdmin(actor));
}

/**
 * Who may record a compliance decision on this article.
 *
 * The self-review rule lives here and nowhere else. An admin has every other
 * power in this system and still cannot approve their own article — separation
 * of duties is the entire point of the feature, so there is no override.
 */
export function canReview(actor: Actor, article: ContentArticle): boolean {
  if (!canReviewQueue(actor)) return false;
  if (owns(actor, article)) return false;
  return true;
}

/** Why a decision is refused, for the reviewer's screen. */
export function reviewBlockedReason(
  actor: Actor,
  article: ContentArticle
): string | null {
  if (canReview(actor, article)) return null;
  if (!canReviewQueue(actor)) return "Only compliance can review submissions.";
  if (owns(actor, article)) {
    return "You wrote this article, so you cannot review it. Another reviewer has to.";
  }
  return "This article cannot be reviewed right now.";
}

// ---------------------------------------------------------------------------
// Publication
// ---------------------------------------------------------------------------

/**
 * Who may press Publish. Whether the revision is ALLOWED to be published — that
 * it carries an approval of its own — is a database question answered in
 * lib/content/service.ts, not a permission question answered here.
 */
export function canPublish(actor: Actor): boolean {
  return actor.isActive && isAdmin(actor);
}

export function canArchive(actor: Actor, article: ContentArticle): boolean {
  if (!actor.isActive) return false;
  return isAdmin(actor) || (owns(actor, article) && article.publishedRevisionId === null);
}

export function canManageUsers(actor: Actor): boolean {
  return actor.isActive && isAdmin(actor);
}

/** Everything the UI needs to decide what to draw, computed in one call. */
export interface ArticlePermissions {
  view: boolean;
  edit: boolean;
  editBlockedReason: string | null;
  submit: boolean;
  changeSlug: boolean;
  review: boolean;
  reviewBlockedReason: string | null;
  publish: boolean;
  archive: boolean;
}

export function articlePermissions(
  actor: Actor,
  article: ContentArticle
): ArticlePermissions {
  return {
    view: canViewArticle(actor, article),
    edit: canEditArticle(actor, article),
    editBlockedReason: editBlockedReason(actor, article),
    submit: canSubmitForReview(actor, article),
    changeSlug: canChangeSlug(actor, article),
    review: canReview(actor, article),
    reviewBlockedReason: reviewBlockedReason(actor, article),
    publish: canPublish(actor),
    archive: canArchive(actor, article),
  };
}
