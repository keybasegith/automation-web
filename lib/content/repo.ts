import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { iso, isoRequired, query } from "@/lib/content/db";
import type {
  ArticlePayload,
  ArticleStatus,
  AuditAction,
  ContentArticle,
  ContentAuditEntry,
  ContentReview,
  ContentRevision,
  ContentRole,
  ContentType,
  ContentUser,
  ReviewChecklist,
  ReviewDecision,
  RevisionState,
} from "@/lib/content/types";

/**
 * Row access for the content system. SQL lives here and nowhere else; workflow
 * rules live in lib/content/service.ts.
 *
 * Every function that participates in a workflow transition takes an optional
 * PoolClient, so the service can run a whole transition — revision, pointer,
 * audit entry — inside one transaction rather than leaving an article in a
 * state the workflow has no name for.
 */

type Runner = { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };

function runner(client?: PoolClient): Runner {
  return client
    ? (client as unknown as Runner)
    : { query: async (text, params) => ({ rows: await query(text, params ?? []) }) };
}

async function rows<T>(
  client: PoolClient | undefined,
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await runner(client).query(text, params);
  return res.rows as T[];
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: ContentRole;
  password_hash: string;
  person_id: string | null;
  author_title: string;
  is_active: boolean;
  created_at: Date;
}

function toUser(r: UserRow): ContentUser {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    personId: r.person_id ?? undefined,
    authorTitle: r.author_title,
    isActive: r.is_active,
    createdAt: isoRequired(r.created_at),
  };
}

const USER_COLUMNS =
  "id, email, name, role, password_hash, person_id, author_title, is_active, created_at";

/** The user plus their password hash. Only the sign-in path may call this. */
export async function findUserForLogin(
  email: string
): Promise<{ user: ContentUser; passwordHash: string } | null> {
  const found = await rows<UserRow>(
    undefined,
    `select ${USER_COLUMNS} from content_users where email = $1`,
    [email.trim().toLowerCase()]
  );
  if (found.length === 0) return null;
  return { user: toUser(found[0]), passwordHash: found[0].password_hash };
}

export async function getUser(id: string): Promise<ContentUser | null> {
  const found = await rows<UserRow>(
    undefined,
    `select ${USER_COLUMNS} from content_users where id = $1`,
    [id]
  );
  return found.length ? toUser(found[0]) : null;
}

export async function listUsers(): Promise<ContentUser[]> {
  const found = await rows<UserRow>(
    undefined,
    `select ${USER_COLUMNS} from content_users order by name asc`
  );
  return found.map(toUser);
}

/** Users keyed by id — for listing screens that would otherwise N+1. */
export async function getUsersByIds(
  ids: string[]
): Promise<Map<string, ContentUser>> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (unique.length === 0) return new Map();
  const found = await rows<UserRow>(
    undefined,
    `select ${USER_COLUMNS} from content_users where id = any($1::uuid[])`,
    [unique]
  );
  return new Map(found.map((r) => [r.id, toUser(r)]));
}

export async function createUser(input: {
  email: string;
  name: string;
  role: ContentRole;
  passwordHash: string;
  personId?: string;
  authorTitle?: string;
}): Promise<ContentUser> {
  const found = await rows<UserRow>(
    undefined,
    `insert into content_users
       (id, email, name, role, password_hash, person_id, author_title)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning ${USER_COLUMNS}`,
    [
      randomUUID(),
      input.email.trim().toLowerCase(),
      input.name.trim(),
      input.role,
      input.passwordHash,
      input.personId ?? null,
      input.authorTitle ?? "",
    ]
  );
  return toUser(found[0]);
}

export async function updateUser(
  id: string,
  patch: {
    name?: string;
    role?: ContentRole;
    passwordHash?: string;
    personId?: string | null;
    authorTitle?: string;
    isActive?: boolean;
  }
): Promise<ContentUser | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  const set = (col: string, value: unknown) => {
    params.push(value);
    sets.push(`${col} = $${params.length}`);
  };

  if (patch.name !== undefined) set("name", patch.name.trim());
  if (patch.role !== undefined) set("role", patch.role);
  if (patch.passwordHash !== undefined) set("password_hash", patch.passwordHash);
  if (patch.personId !== undefined) set("person_id", patch.personId);
  if (patch.authorTitle !== undefined) set("author_title", patch.authorTitle);
  if (patch.isActive !== undefined) set("is_active", patch.isActive);
  if (sets.length === 0) return getUser(id);

  sets.push("updated_at = now()");
  params.push(id);
  const found = await rows<UserRow>(
    undefined,
    `update content_users set ${sets.join(", ")}
      where id = $${params.length} returning ${USER_COLUMNS}`,
    params
  );
  return found.length ? toUser(found[0]) : null;
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

interface ArticleRow {
  id: string;
  slug: string;
  content_type: ContentType;
  status: ArticleStatus;
  owner_id: string;
  current_draft_revision_id: string | null;
  submitted_revision_id: string | null;
  published_revision_id: string | null;
  published_at: Date | null;
  scheduled_for: Date | null;
  created_at: Date;
  updated_at: Date;
}

function toArticle(r: ArticleRow): ContentArticle {
  return {
    id: r.id,
    slug: r.slug,
    contentType: r.content_type,
    status: r.status,
    ownerId: r.owner_id,
    currentDraftRevisionId: r.current_draft_revision_id,
    submittedRevisionId: r.submitted_revision_id,
    publishedRevisionId: r.published_revision_id,
    publishedAt: iso(r.published_at),
    scheduledFor: iso(r.scheduled_for),
    createdAt: isoRequired(r.created_at),
    updatedAt: isoRequired(r.updated_at),
  };
}

const ARTICLE_COLUMNS = `id, slug, content_type, status, owner_id,
  current_draft_revision_id, submitted_revision_id, published_revision_id,
  published_at, scheduled_for, created_at, updated_at`;

export async function getArticle(
  id: string,
  client?: PoolClient
): Promise<ContentArticle | null> {
  const found = await rows<ArticleRow>(
    client,
    `select ${ARTICLE_COLUMNS} from content_articles where id = $1`,
    [id]
  );
  return found.length ? toArticle(found[0]) : null;
}

/**
 * The same row, locked for the rest of the transaction.
 *
 * Every workflow transition reads the article's current state and then writes a
 * new one. Without the lock, two clicks a few milliseconds apart — a double
 * submit, or an approve landing while a resubmit is in flight — would both read
 * the old state and both act on it.
 */
export async function getArticleForUpdate(
  id: string,
  client: PoolClient
): Promise<ContentArticle | null> {
  const found = await rows<ArticleRow>(
    client,
    `select ${ARTICLE_COLUMNS} from content_articles where id = $1 for update`,
    [id]
  );
  return found.length ? toArticle(found[0]) : null;
}

export async function getArticleBySlug(
  slug: string
): Promise<ContentArticle | null> {
  const found = await rows<ArticleRow>(
    undefined,
    `select ${ARTICLE_COLUMNS} from content_articles where slug = $1`,
    [slug]
  );
  return found.length ? toArticle(found[0]) : null;
}

export async function allSlugs(): Promise<string[]> {
  const found = await rows<{ slug: string }>(
    undefined,
    "select slug from content_articles"
  );
  return found.map((r) => r.slug);
}

export interface ArticleFilter {
  ownerId?: string;
  statuses?: ArticleStatus[];
  contentTypes?: ContentType[];
  /** Matched against the current draft's title and the slug. */
  search?: string;
  /** Only articles that have been submitted at least once. */
  submittedOnly?: boolean;
  updatedAfter?: string;
  limit?: number;
}

/**
 * An article plus just enough of its current content to draw a table row.
 * The title comes from the draft revision, which is where the author's latest
 * words live; the published title, where it differs, is shown separately.
 */
export interface ArticleListItem extends ContentArticle {
  title: string;
  publishedTitle: string | null;
  draftRevisionNumber: number | null;
  latestRevisionNumber: number;
  sourceCount: number;
}

export async function listArticles(
  filter: ArticleFilter = {}
): Promise<ArticleListItem[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (clause: (i: number) => string, value: unknown) => {
    params.push(value);
    where.push(clause(params.length));
  };

  if (filter.ownerId) add((i) => `a.owner_id = $${i}`, filter.ownerId);
  if (filter.statuses?.length) {
    add((i) => `a.status = any($${i}::text[])`, filter.statuses);
  }
  if (filter.contentTypes?.length) {
    add((i) => `a.content_type = any($${i}::text[])`, filter.contentTypes);
  }
  if (filter.submittedOnly) {
    where.push(
      "(a.submitted_revision_id is not null or a.published_revision_id is not null or a.status <> 'draft')"
    );
  }
  if (filter.updatedAfter) add((i) => `a.updated_at >= $${i}`, filter.updatedAfter);
  if (filter.search?.trim()) {
    add(
      (i) => `(a.slug ilike $${i} or coalesce(d.payload ->> 'title', '') ilike $${i})`,
      `%${filter.search.trim()}%`
    );
  }

  params.push(Math.min(filter.limit ?? 200, 500));
  const limitParam = params.length;

  const found = await rows<
    ArticleRow & {
      title: string | null;
      published_title: string | null;
      draft_revision_number: number | null;
      latest_revision_number: number | null;
      source_count: string | null;
    }
  >(
    undefined,
    `select ${ARTICLE_COLUMNS.split(",").map((c) => `a.${c.trim()}`).join(", ")},
            d.payload ->> 'title' as title,
            p.payload ->> 'title' as published_title,
            d.revision_number     as draft_revision_number,
            (select max(revision_number) from content_revisions r
              where r.article_id = a.id) as latest_revision_number,
            (select jsonb_array_length(coalesce(d.payload -> 'sources', '[]'::jsonb)))
                                  as source_count
       from content_articles a
       left join content_revisions d on d.id = a.current_draft_revision_id
       left join content_revisions p on p.id = a.published_revision_id
      ${where.length ? `where ${where.join(" and ")}` : ""}
      order by a.updated_at desc
      limit $${limitParam}`,
    params
  );

  return found.map((r) => ({
    ...toArticle(r),
    title: r.title ?? "",
    publishedTitle: r.published_title,
    draftRevisionNumber: r.draft_revision_number,
    latestRevisionNumber: r.latest_revision_number ?? 0,
    sourceCount: Number(r.source_count ?? 0),
  }));
}

/** Counts per status, for the dashboard summary cards. */
export async function countByStatus(
  filter: Pick<ArticleFilter, "ownerId" | "submittedOnly"> = {}
): Promise<Record<string, number>> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.ownerId) {
    params.push(filter.ownerId);
    where.push(`owner_id = $${params.length}`);
  }
  if (filter.submittedOnly) {
    where.push(
      "(submitted_revision_id is not null or published_revision_id is not null or status <> 'draft')"
    );
  }
  const found = await rows<{ status: string; n: string }>(
    undefined,
    `select status, count(*) n from content_articles
      ${where.length ? `where ${where.join(" and ")}` : ""}
      group by status`,
    params
  );
  return Object.fromEntries(found.map((r) => [r.status, Number(r.n)]));
}

export async function insertArticle(
  input: {
    slug: string;
    contentType: ContentType;
    ownerId: string;
  },
  client: PoolClient
): Promise<ContentArticle> {
  const found = await rows<ArticleRow>(
    client,
    `insert into content_articles (id, slug, content_type, status, owner_id)
     values ($1, $2, $3, 'draft', $4)
     returning ${ARTICLE_COLUMNS}`,
    [randomUUID(), input.slug, input.contentType, input.ownerId]
  );
  return toArticle(found[0]);
}

export async function updateArticle(
  id: string,
  patch: {
    slug?: string;
    contentType?: ContentType;
    status?: ArticleStatus;
    currentDraftRevisionId?: string | null;
    submittedRevisionId?: string | null;
    publishedRevisionId?: string | null;
    publishedAt?: string | null;
    scheduledFor?: string | null;
  },
  client?: PoolClient
): Promise<ContentArticle | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  const set = (col: string, value: unknown) => {
    params.push(value);
    sets.push(`${col} = $${params.length}`);
  };

  if (patch.slug !== undefined) set("slug", patch.slug);
  if (patch.contentType !== undefined) set("content_type", patch.contentType);
  if (patch.status !== undefined) set("status", patch.status);
  if (patch.currentDraftRevisionId !== undefined) {
    set("current_draft_revision_id", patch.currentDraftRevisionId);
  }
  if (patch.submittedRevisionId !== undefined) {
    set("submitted_revision_id", patch.submittedRevisionId);
  }
  if (patch.publishedRevisionId !== undefined) {
    set("published_revision_id", patch.publishedRevisionId);
  }
  if (patch.publishedAt !== undefined) set("published_at", patch.publishedAt);
  if (patch.scheduledFor !== undefined) set("scheduled_for", patch.scheduledFor);
  if (sets.length === 0) return getArticle(id, client);

  sets.push("updated_at = now()");
  params.push(id);
  const found = await rows<ArticleRow>(
    client,
    `update content_articles set ${sets.join(", ")}
      where id = $${params.length} returning ${ARTICLE_COLUMNS}`,
    params
  );
  return found.length ? toArticle(found[0]) : null;
}

// ---------------------------------------------------------------------------
// Revisions
// ---------------------------------------------------------------------------

interface RevisionRow {
  id: string;
  article_id: string;
  revision_number: number;
  state: RevisionState;
  payload: ArticlePayload;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  frozen_at: Date | null;
}

function toRevision(r: RevisionRow): ContentRevision {
  return {
    id: r.id,
    articleId: r.article_id,
    revisionNumber: r.revision_number,
    state: r.state,
    payload: r.payload,
    createdBy: r.created_by,
    createdAt: isoRequired(r.created_at),
    updatedAt: isoRequired(r.updated_at),
    frozenAt: iso(r.frozen_at),
  };
}

const REVISION_COLUMNS =
  "id, article_id, revision_number, state, payload, created_by, created_at, updated_at, frozen_at";

export async function getRevision(
  id: string,
  client?: PoolClient
): Promise<ContentRevision | null> {
  const found = await rows<RevisionRow>(
    client,
    `select ${REVISION_COLUMNS} from content_revisions where id = $1`,
    [id]
  );
  return found.length ? toRevision(found[0]) : null;
}

export async function listRevisions(
  articleId: string
): Promise<ContentRevision[]> {
  const found = await rows<RevisionRow>(
    undefined,
    `select ${REVISION_COLUMNS} from content_revisions
      where article_id = $1 order by revision_number desc`,
    [articleId]
  );
  return found.map(toRevision);
}

export async function nextRevisionNumber(
  articleId: string,
  client: PoolClient
): Promise<number> {
  const found = await rows<{ n: number | null }>(
    client,
    "select max(revision_number) n from content_revisions where article_id = $1",
    [articleId]
  );
  return (found[0]?.n ?? 0) + 1;
}

export async function insertRevision(
  input: {
    articleId: string;
    revisionNumber: number;
    state: RevisionState;
    payload: ArticlePayload;
    createdBy: string;
    frozen?: boolean;
  },
  client: PoolClient
): Promise<ContentRevision> {
  const found = await rows<RevisionRow>(
    client,
    `insert into content_revisions
       (id, article_id, revision_number, state, payload, created_by, frozen_at)
     values ($1, $2, $3, $4, $5::jsonb, $6, ${input.frozen ? "now()" : "null"})
     returning ${REVISION_COLUMNS}`,
    [
      randomUUID(),
      input.articleId,
      input.revisionNumber,
      input.state,
      JSON.stringify(input.payload),
      input.createdBy,
    ]
  );
  return toRevision(found[0]);
}

/**
 * Overwrite a draft revision's content.
 *
 * Guarded twice over. The `frozen_at is null` clause below means a frozen
 * revision matches no row and the update is a no-op returning null; the
 * database trigger `content_revisions_frozen_guard` would raise even if that
 * clause were ever removed. A revision under review cannot be edited.
 */
export async function updateRevisionPayload(
  id: string,
  payload: ArticlePayload,
  client?: PoolClient
): Promise<ContentRevision | null> {
  const found = await rows<RevisionRow>(
    client,
    `update content_revisions
        set payload = $2::jsonb, updated_at = now()
      where id = $1 and frozen_at is null and state = 'draft'
      returning ${REVISION_COLUMNS}`,
    [id, JSON.stringify(payload)]
  );
  return found.length ? toRevision(found[0]) : null;
}

/** Freeze a revision and move it to a new state. Content never changes here. */
export async function freezeRevision(
  id: string,
  state: RevisionState,
  client: PoolClient
): Promise<ContentRevision | null> {
  const found = await rows<RevisionRow>(
    client,
    `update content_revisions
        set state = $2, frozen_at = coalesce(frozen_at, now()), updated_at = now()
      where id = $1 returning ${REVISION_COLUMNS}`,
    [id, state]
  );
  return found.length ? toRevision(found[0]) : null;
}

/** Advance a frozen revision's state (submitted → approved, and so on). */
export async function setRevisionState(
  id: string,
  state: RevisionState,
  client: PoolClient
): Promise<void> {
  await rows(
    client,
    "update content_revisions set state = $2, updated_at = now() where id = $1",
    [id, state]
  );
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

interface ReviewRow {
  id: string;
  article_id: string;
  revision_id: string;
  reviewer_id: string;
  decision: ReviewDecision;
  comment: string;
  checklist: ReviewChecklist;
  created_at: Date;
}

function toReview(r: ReviewRow): ContentReview {
  return {
    id: r.id,
    articleId: r.article_id,
    revisionId: r.revision_id,
    reviewerId: r.reviewer_id,
    decision: r.decision,
    comment: r.comment,
    checklist: r.checklist ?? {},
    createdAt: isoRequired(r.created_at),
  };
}

const REVIEW_COLUMNS =
  "id, article_id, revision_id, reviewer_id, decision, comment, checklist, created_at";

export async function insertReview(
  input: {
    articleId: string;
    revisionId: string;
    reviewerId: string;
    decision: ReviewDecision;
    comment: string;
    checklist: ReviewChecklist;
  },
  client: PoolClient
): Promise<ContentReview> {
  const found = await rows<ReviewRow>(
    client,
    `insert into content_reviews
       (id, article_id, revision_id, reviewer_id, decision, comment, checklist)
     values ($1, $2, $3, $4, $5, $6, $7::jsonb)
     returning ${REVIEW_COLUMNS}`,
    [
      randomUUID(),
      input.articleId,
      input.revisionId,
      input.reviewerId,
      input.decision,
      input.comment,
      JSON.stringify(input.checklist ?? {}),
    ]
  );
  return toReview(found[0]);
}

export async function listReviews(articleId: string): Promise<ContentReview[]> {
  const found = await rows<ReviewRow>(
    undefined,
    `select ${REVIEW_COLUMNS} from content_reviews
      where article_id = $1 order by created_at desc`,
    [articleId]
  );
  return found.map(toReview);
}

/**
 * The approval attached to one exact revision, if it has one.
 *
 * This is the single question the publish path asks, and the reason approval
 * cannot leak from one revision to the next: a new revision is a new id, and a
 * new id has no row here.
 */
export async function approvalForRevision(
  revisionId: string,
  client?: PoolClient
): Promise<ContentReview | null> {
  const found = await rows<ReviewRow>(
    client,
    `select ${REVIEW_COLUMNS} from content_reviews
      where revision_id = $1 and decision = 'approved'
      order by created_at desc limit 1`,
    [revisionId]
  );
  return found.length ? toReview(found[0]) : null;
}

/** The most recent decision on an article, whatever it was. */
export async function latestReview(
  articleId: string
): Promise<ContentReview | null> {
  const found = await rows<ReviewRow>(
    undefined,
    `select ${REVIEW_COLUMNS} from content_reviews
      where article_id = $1 order by created_at desc limit 1`,
    [articleId]
  );
  return found.length ? toReview(found[0]) : null;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

interface AuditRow {
  id: string;
  article_id: string | null;
  revision_id: string | null;
  actor_id: string | null;
  actor_label: string;
  action: AuditAction;
  metadata: Record<string, unknown>;
  created_at: Date;
}

function toAudit(r: AuditRow): ContentAuditEntry {
  return {
    id: r.id,
    articleId: r.article_id,
    revisionId: r.revision_id,
    actorId: r.actor_id,
    actorLabel: r.actor_label,
    action: r.action,
    metadata: r.metadata ?? {},
    createdAt: isoRequired(r.created_at),
  };
}

/**
 * Append one audit entry.
 *
 * Never throws when it runs on its own: a failed log write must not fail the
 * user's action. When it runs inside a workflow transaction it is passed that
 * transaction's client, and there a failure DOES roll the whole thing back —
 * an approval that was not recorded should not have happened.
 */
export async function appendAudit(
  entry: {
    articleId?: string | null;
    revisionId?: string | null;
    actorId?: string | null;
    actorLabel: string;
    action: AuditAction;
    metadata?: Record<string, unknown>;
  },
  client?: PoolClient
): Promise<void> {
  const write = () =>
    rows(
      client,
      `insert into content_audit
         (id, article_id, revision_id, actor_id, actor_label, action, metadata)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        randomUUID(),
        entry.articleId ?? null,
        entry.revisionId ?? null,
        entry.actorId ?? null,
        entry.actorLabel,
        entry.action,
        JSON.stringify(entry.metadata ?? {}),
      ]
    );

  if (client) {
    await write();
    return;
  }
  try {
    await write();
  } catch (err) {
    console.error("[content] audit write failed:", err);
  }
}

export async function listAudit(
  articleId: string,
  limit = 100
): Promise<ContentAuditEntry[]> {
  const found = await rows<AuditRow>(
    undefined,
    `select id, article_id, revision_id, actor_id, actor_label, action, metadata, created_at
       from content_audit where article_id = $1
      order by created_at desc limit $2`,
    [articleId, Math.min(limit, 500)]
  );
  return found.map(toAudit);
}

export async function listRecentAudit(limit = 50): Promise<ContentAuditEntry[]> {
  const found = await rows<AuditRow>(
    undefined,
    `select id, article_id, revision_id, actor_id, actor_label, action, metadata, created_at
       from content_audit order by created_at desc limit $1`,
    [Math.min(limit, 200)]
  );
  return found.map(toAudit);
}

// ---------------------------------------------------------------------------
// Public reads
// ---------------------------------------------------------------------------

export interface PublishedArticle {
  article: ContentArticle;
  revision: ContentRevision;
  owner: ContentUser | null;
}

/**
 * The published revision for a slug — the ONLY way the public site reads an
 * article out of this system.
 *
 * It joins on `published_revision_id`, never on "the newest revision". An
 * article with a draft v5 in progress still returns v4 here, which is exactly
 * the guarantee the workflow is built to provide.
 */
export async function getPublishedBySlug(
  slug: string
): Promise<PublishedArticle | null> {
  const found = await rows<ArticleRow & { rev: RevisionRow }>(
    undefined,
    `select ${ARTICLE_COLUMNS.split(",").map((c) => `a.${c.trim()}`).join(", ")},
            to_jsonb(r.*) as rev
       from content_articles a
       join content_revisions r on r.id = a.published_revision_id
      where a.slug = $1 and a.status = 'published'`,
    [slug]
  );
  if (found.length === 0) return null;
  const article = toArticle(found[0]);
  const revision = toRevision(found[0].rev);
  return { article, revision, owner: await getUser(article.ownerId) };
}

/** Every published article, newest first. For the newsroom listing. */
export async function listPublished(): Promise<PublishedArticle[]> {
  const found = await rows<ArticleRow & { rev: RevisionRow }>(
    undefined,
    `select ${ARTICLE_COLUMNS.split(",").map((c) => `a.${c.trim()}`).join(", ")},
            to_jsonb(r.*) as rev
       from content_articles a
       join content_revisions r on r.id = a.published_revision_id
      where a.status = 'published'
      order by a.published_at desc nulls last`
  );
  const owners = await getUsersByIds(found.map((r) => r.owner_id));
  return found.map((r) => ({
    article: toArticle(r),
    revision: toRevision(r.rev),
    owner: owners.get(r.owner_id) ?? null,
  }));
}
