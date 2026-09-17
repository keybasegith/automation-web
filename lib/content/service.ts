import type { PoolClient } from "pg";
import { withTransaction } from "@/lib/content/db";
import * as repo from "@/lib/content/repo";
import {
  actorFromUser,
  articlePermissions,
  canCreateArticle,
  canCreateContentType,
  canEditArticle,
  canSubmitForReview,
  canViewArticle,
  canChangeSlug,
  type ArticlePermissions,
} from "@/lib/content/authz";
import { normalizePayload, payloadReadyToSubmit } from "@/lib/content/normalize";
import { slugProblem, slugify, uniqueSlug } from "@/lib/content/slug";
import { staticSlugs } from "@/lib/content/staticSlugs";
import {
  CONTENT_TYPES,
  emptyPayload,
  isContentType,
  type ArticlePayload,
  type ContentArticle,
  type ContentAuditEntry,
  type ContentReview,
  type ContentRevision,
  type ContentType,
  type ContentUser,
} from "@/lib/content/types";

/**
 * The content workflow.
 *
 * Every state transition in the system happens in this file, inside a database
 * transaction, after a permission check. Route handlers do nothing but parse a
 * request and translate the result into HTTP — so there is no second path to
 * the store that could skip a rule.
 *
 * The invariant the whole design exists to protect:
 *
 *   Approval belongs to a revision id. Editing creates a NEW revision, which
 *   has no approval of its own and therefore cannot inherit one. The public
 *   site renders `published_revision_id` and nothing else.
 */

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string; details?: string[] };

const fail = (status: number, error: string, details?: string[]): Result<never> => ({
  ok: false,
  status,
  error,
  details,
});

const ok = <T>(value: T): Result<T> => ({ ok: true, value });

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

/** Everything one article's screens need, in one round of queries. */
export interface ArticleWorkspace {
  article: ContentArticle;
  /** The revision the author is editing, or the newest one if none is editable. */
  draft: ContentRevision | null;
  /** The revision compliance is holding, if any. */
  submitted: ContentRevision | null;
  /** The revision the public site is rendering, if any. */
  published: ContentRevision | null;
  revisions: ContentRevision[];
  reviews: ContentReview[];
  audit: ContentAuditEntry[];
  owner: ContentUser | null;
  permissions: ArticlePermissions;
  /** The feedback an author still has to act on, if any. */
  openFeedback: ContentReview | null;
}

export async function loadWorkspace(
  actor: ContentUser,
  articleId: string
): Promise<Result<ArticleWorkspace>> {
  const article = await repo.getArticle(articleId);
  if (!article) return fail(404, "That article could not be found.");

  const a = actorFromUser(actor);
  // A 404 rather than a 403: an advisor probing ids should not learn which of
  // them belong to somebody else's private draft.
  if (!canViewArticle(a, article)) {
    return fail(404, "That article could not be found.");
  }

  const [revisions, reviews, audit, owner] = await Promise.all([
    repo.listRevisions(articleId),
    repo.listReviews(articleId),
    repo.listAudit(articleId),
    repo.getUser(article.ownerId),
  ]);

  const byId = new Map(revisions.map((r) => [r.id, r]));
  const draft =
    (article.currentDraftRevisionId
      ? byId.get(article.currentDraftRevisionId)
      : undefined) ??
    revisions[0] ??
    null;

  const latest = reviews[0] ?? null;
  const openFeedback =
    latest &&
    (latest.decision === "changes_requested" || latest.decision === "rejected") &&
    (article.status === "changes_requested" || article.status === "rejected")
      ? latest
      : null;

  return ok({
    article,
    draft,
    submitted: article.submittedRevisionId
      ? byId.get(article.submittedRevisionId) ?? null
      : null,
    published: article.publishedRevisionId
      ? byId.get(article.publishedRevisionId) ?? null
      : null,
    revisions,
    reviews,
    audit,
    owner,
    permissions: articlePermissions(a, article),
    openFeedback,
  });
}

/** One revision, with the permission check the article's own screens apply. */
export async function loadRevision(
  actor: ContentUser,
  articleId: string,
  revisionId: string
): Promise<Result<{ article: ContentArticle; revision: ContentRevision; owner: ContentUser | null }>> {
  const article = await repo.getArticle(articleId);
  if (!article) return fail(404, "That article could not be found.");
  if (!canViewArticle(actorFromUser(actor), article)) {
    return fail(404, "That article could not be found.");
  }
  const revision = await repo.getRevision(revisionId);
  if (!revision || revision.articleId !== articleId) {
    return fail(404, "That version could not be found.");
  }
  return ok({ article, revision, owner: await repo.getUser(article.ownerId) });
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

/**
 * The byline a new article starts with, taken from the author's own account.
 *
 * Only used when the author has no `personId`. Where they do, the byline is
 * resolved live from the people registry at render time instead, so their job
 * title has exactly one spelling across the whole site.
 */
function initialByline(owner: ContentUser): ArticlePayload["authorByline"] {
  if (owner.personId) return null;
  return {
    name: owner.name,
    role: owner.authorTitle,
    organization: "Keybase Financial Group",
  };
}

export async function createArticle(
  actor: ContentUser,
  input: { contentType: unknown; title?: unknown }
): Promise<Result<{ article: ContentArticle; revision: ContentRevision }>> {
  const a = actorFromUser(actor);
  if (!canCreateArticle(a)) {
    return fail(403, "You do not have permission to create articles.");
  }
  if (!isContentType(input.contentType)) {
    return fail(400, "Choose a content type.");
  }
  if (!canCreateContentType(a, input.contentType)) {
    return fail(
      403,
      `Only Keybase corporate content editors can create ${CONTENT_TYPES[input.contentType].label} articles.`
    );
  }

  const config = CONTENT_TYPES[input.contentType];
  const title = typeof input.title === "string" ? input.title.trim().slice(0, 200) : "";

  // Uniqueness spans the database AND the articles still living as static
  // modules in lib/insights/content — a new article must never shadow a page
  // that already exists at that URL.
  const taken = new Set([...(await repo.allSlugs()), ...staticSlugs()]);
  const slug = uniqueSlug(slugify(title) || "untitled-article", taken);

  const payload: ArticlePayload = {
    ...emptyPayload(),
    title,
    category: config.category,
    authorByline: initialByline(actor),
  };

  const created = await withTransaction(async (client) => {
    const article = await repo.insertArticle(
      { slug, contentType: input.contentType as ContentType, ownerId: actor.id },
      client
    );
    const revision = await repo.insertRevision(
      {
        articleId: article.id,
        revisionNumber: 1,
        state: "draft",
        payload,
        createdBy: actor.id,
      },
      client
    );
    const withDraft = await repo.updateArticle(
      article.id,
      { currentDraftRevisionId: revision.id },
      client
    );
    await repo.appendAudit(
      {
        articleId: article.id,
        revisionId: revision.id,
        actorId: actor.id,
        actorLabel: actor.name,
        action: "article_created",
        metadata: { contentType: input.contentType, slug },
      },
      client
    );
    return { article: withDraft ?? article, revision };
  });

  return ok(created);
}

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

/**
 * The revision an author may write to right now, creating one if needed.
 *
 * This is the mechanism that makes approval non-inheritable. When the current
 * draft pointer names a frozen revision — because it was submitted, approved,
 * or published — editing cannot touch it, so a new revision is opened as a copy
 * and the pointer moves. The frozen one keeps its state, its approval, and its
 * place in the version history.
 */
async function ensureEditableDraft(
  article: ContentArticle,
  actor: ContentUser,
  client: PoolClient
): Promise<{ article: ContentArticle; revision: ContentRevision; created: boolean }> {
  const current = article.currentDraftRevisionId
    ? await repo.getRevision(article.currentDraftRevisionId, client)
    : null;

  if (current && current.frozenAt === null && current.state === "draft") {
    return { article, revision: current, created: false };
  }

  const source =
    current ??
    (article.publishedRevisionId
      ? await repo.getRevision(article.publishedRevisionId, client)
      : null);

  const revision = await repo.insertRevision(
    {
      articleId: article.id,
      revisionNumber: await repo.nextRevisionNumber(article.id, client),
      state: "draft",
      payload: source ? source.payload : emptyPayload(),
      createdBy: actor.id,
    },
    client
  );

  const updated = await repo.updateArticle(
    article.id,
    { currentDraftRevisionId: revision.id },
    client
  );

  await repo.appendAudit(
    {
      articleId: article.id,
      revisionId: revision.id,
      actorId: actor.id,
      actorLabel: actor.name,
      action: "revision_created",
      metadata: {
        revisionNumber: revision.revisionNumber,
        copiedFrom: source?.revisionNumber ?? null,
      },
    },
    client
  );

  return { article: updated ?? article, revision, created: true };
}

export interface SaveResult {
  article: ContentArticle;
  revision: ContentRevision;
  /** True when this save opened a new revision rather than updating one. */
  newRevision: boolean;
}

/**
 * Save the working draft. This is the autosave path.
 *
 * `expectedRevisionId` is the revision the browser believed it was editing. If
 * the server has moved on — the piece was submitted from another tab, or
 * compliance sent it back — the save is refused with 409 rather than written
 * somewhere the author cannot see. Their words are still in their editor, and
 * the client shows them what happened.
 */
export async function saveDraft(
  actor: ContentUser,
  articleId: string,
  rawPayload: unknown,
  expectedRevisionId?: string
): Promise<Result<SaveResult>> {
  const normalized = normalizePayload(rawPayload);
  if ("error" in normalized) return fail(400, normalized.error);

  return withTransaction(async (client) => {
    const article = await repo.getArticleForUpdate(articleId, client);
    if (!article) return fail(404, "That article could not be found.");

    const a = actorFromUser(actor);
    if (!canViewArticle(a, article)) {
      return fail(404, "That article could not be found.");
    }
    if (!canEditArticle(a, article)) {
      return fail(
        409,
        "Compliance is reviewing this version, so it cannot be edited right now."
      );
    }
    if (
      expectedRevisionId &&
      article.currentDraftRevisionId &&
      expectedRevisionId !== article.currentDraftRevisionId
    ) {
      return fail(
        409,
        "This article changed somewhere else since you opened it. Reload to see the current version — your text is still on screen."
      );
    }

    const editable = await ensureEditableDraft(article, actor, client);
    const saved = await repo.updateRevisionPayload(
      editable.revision.id,
      normalized.value,
      client
    );
    if (!saved) {
      // Only reachable if the revision froze between the lock and this write.
      return fail(409, "That version was locked before your changes were saved.");
    }

    // Editing after a rejection or a request for changes puts the article back
    // in the author's hands. A published article stays published while its next
    // revision is written — that is the whole point of revision-based approval.
    const nextStatus =
      article.status === "changes_requested" || article.status === "rejected"
        ? "draft"
        : article.status;

    const updated =
      nextStatus === article.status && !editable.created
        ? editable.article
        : (await repo.updateArticle(article.id, { status: nextStatus }, client)) ??
          editable.article;

    return ok({
      article: updated,
      revision: saved,
      newRevision: editable.created,
    });
  });
}

/** Article-level settings: content type, and (for admins) the public slug. */
export async function updateSettings(
  actor: ContentUser,
  articleId: string,
  patch: { contentType?: unknown; slug?: unknown }
): Promise<Result<ContentArticle>> {
  return withTransaction(async (client) => {
    const article = await repo.getArticleForUpdate(articleId, client);
    if (!article) return fail(404, "That article could not be found.");

    const a = actorFromUser(actor);
    if (!canEditArticle(a, article)) {
      return fail(403, "You cannot change this article's settings right now.");
    }

    const changes: { contentType?: ContentType; slug?: string } = {};

    if (patch.contentType !== undefined) {
      if (!isContentType(patch.contentType)) {
        return fail(400, "Unknown content type.");
      }
      if (!canCreateContentType(a, patch.contentType)) {
        return fail(403, "You cannot use that content type.");
      }
      changes.contentType = patch.contentType;
    }

    if (patch.slug !== undefined) {
      if (!canChangeSlug(a, article)) {
        return fail(
          403,
          "This article is live. Only an administrator can change a published URL."
        );
      }
      const slug = slugify(String(patch.slug));
      const problem = slugProblem(slug);
      if (problem) return fail(400, problem);
      if (slug !== article.slug) {
        const clash = await repo.getArticleBySlug(slug);
        if (clash || staticSlugs().includes(slug)) {
          return fail(409, "Another article already uses that URL.");
        }
        changes.slug = slug;
      }
    }

    if (Object.keys(changes).length === 0) return ok(article);

    const updated = await repo.updateArticle(article.id, changes, client);
    await repo.appendAudit(
      {
        articleId: article.id,
        revisionId: article.currentDraftRevisionId,
        actorId: actor.id,
        actorLabel: actor.name,
        action: changes.slug ? "slug_changed" : "settings_changed",
        metadata: changes.slug
          ? { from: article.slug, to: changes.slug }
          : { contentType: changes.contentType },
      },
      client
    );
    return ok(updated ?? article);
  });
}

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

/**
 * Hand the current draft to compliance.
 *
 * The revision is frozen here, in the same transaction that hands it over, and
 * a database trigger enforces that freeze independently of this code. From this
 * moment the reviewer and the author are looking at the same bytes, and nothing
 * the author does can change them.
 */
export async function submitForReview(
  actor: ContentUser,
  articleId: string
): Promise<Result<{ article: ContentArticle; revision: ContentRevision }>> {
  return withTransaction(async (client) => {
    const article = await repo.getArticleForUpdate(articleId, client);
    if (!article) return fail(404, "That article could not be found.");

    const a = actorFromUser(actor);
    if (!canViewArticle(a, article)) {
      return fail(404, "That article could not be found.");
    }
    if (!canSubmitForReview(a, article)) {
      return fail(
        409,
        article.status === "submitted" || article.status === "under_review"
          ? "This version is already with compliance."
          : "You cannot submit this article right now."
      );
    }

    const revision = article.currentDraftRevisionId
      ? await repo.getRevision(article.currentDraftRevisionId, client)
      : null;
    if (!revision) return fail(409, "There is nothing to submit yet.");
    if (revision.frozenAt !== null) {
      return fail(409, "That version has already been submitted.");
    }

    const problems = payloadReadyToSubmit(revision.payload);
    if (problems.length > 0) {
      return fail(400, "This article is not ready to submit yet.", problems);
    }

    const frozen = await repo.freezeRevision(revision.id, "submitted", client);
    if (!frozen) return fail(500, "The version could not be locked.");

    const updated = await repo.updateArticle(
      article.id,
      { status: "submitted", submittedRevisionId: frozen.id },
      client
    );

    await repo.appendAudit(
      {
        articleId: article.id,
        revisionId: frozen.id,
        actorId: actor.id,
        actorLabel: actor.name,
        action: "revision_submitted",
        metadata: {
          revisionNumber: frozen.revisionNumber,
          title: frozen.payload.title,
        },
      },
      client
    );

    return ok({ article: updated ?? article, revision: frozen });
  });
}

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

/**
 * The article list for a dashboard.
 *
 * The scope is decided here from the actor's role, not passed in from the
 * client: an advisor's list is filtered to their own id server-side, so no
 * request can widen it.
 */
export async function listForActor(
  actor: ContentUser,
  filter: {
    search?: string;
    statuses?: string[];
    contentTypes?: string[];
    updatedAfter?: string;
    scope?: "mine" | "review" | "all";
  } = {}
): Promise<Result<{ items: repo.ArticleListItem[]; counts: Record<string, number> }>> {
  const a = actorFromUser(actor);
  if (!a.isActive) return fail(403, "This account is no longer active.");

  const scope = filter.scope ?? (a.role === "compliance" ? "review" : "mine");
  const base: repo.ArticleFilter = {
    search: filter.search,
    statuses: filter.statuses?.filter(Boolean) as repo.ArticleFilter["statuses"],
    contentTypes: filter.contentTypes?.filter(Boolean) as ContentType[] | undefined,
    updatedAfter: filter.updatedAfter,
  };

  if (a.role === "advisor") {
    base.ownerId = actor.id;
  } else if (scope === "mine") {
    base.ownerId = actor.id;
  } else if (scope === "review" || a.role === "compliance") {
    base.submittedOnly = true;
  }

  const [items, counts] = await Promise.all([
    repo.listArticles(base),
    repo.countByStatus({ ownerId: base.ownerId, submittedOnly: base.submittedOnly }),
  ]);
  return ok({ items, counts });
}

export { articlePermissions };
