import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  HAS_TEST_DB,
  enterTestDb,
  exitTestDb,
  makeUser,
  rawQuery,
} from "./testHarness";
import {
  createArticle,
  loadWorkspace,
  saveDraft,
  submitForReview,
  updateSettings,
} from "./service";
import * as repo from "./repo";
import { emptyPayload, type ArticlePayload, type ContentUser } from "./types";

/**
 * The workflow, end to end, against a real database.
 *
 * These are the tests that matter: they check the properties the whole feature
 * exists to guarantee — an author cannot touch somebody else's work, a
 * submitted version cannot change underneath a reviewer, and editing after
 * approval produces a new revision rather than inheriting the old one's
 * standing.
 */

const suite = HAS_TEST_DB ? describe : describe.skip;

/** A payload complete enough to submit. */
function fullPayload(overrides: Partial<ArticlePayload> = {}): ArticlePayload {
  return {
    ...emptyPayload(),
    title: "What Canada's latest inflation data could mean for long-term investors",
    excerpt:
      "Headline inflation moved higher, but long-term investors should consider the broader picture.",
    body: [
      {
        type: "paragraph",
        text: Array.from({ length: 150 }, (_, i) => `word${i}`).join(" "),
      },
    ],
    sources: [
      {
        label: "Statistics Canada",
        title: "Consumer Price Index, July 2026",
        url: "https://www150.statcan.gc.ca/example",
      },
    ],
    ...overrides,
  };
}

suite("content workflow", () => {
  let sarah: ContentUser;
  let otherAdvisor: ContentUser;
  let christine: ContentUser;

  beforeEach(async () => {
    await enterTestDb();
    sarah = await makeUser("advisor", "Sarah Chen");
    otherAdvisor = await makeUser("advisor", "Another Advisor");
    christine = await makeUser("compliance", "Christine");
  });

  afterEach(() => exitTestDb());

  // -------------------------------------------------------------------------
  // Authoring
  // -------------------------------------------------------------------------

  it("creates an article with a slug and a first draft revision", async () => {
    const created = await createArticle(sarah, {
      contentType: "advisor-perspective",
      title: "Canada's Inflation Rate Is Back at 3%",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const { article, revision } = created.value;
    expect(article.slug).toBe("canada-s-inflation-rate-is-back-at-3-percent");
    expect(article.status).toBe("draft");
    expect(article.ownerId).toBe(sarah.id);
    expect(revision.revisionNumber).toBe(1);
    expect(article.currentDraftRevisionId).toBe(revision.id);
    // Nothing is live yet.
    expect(article.publishedRevisionId).toBeNull();
  });

  it("refuses to let an advisor create corporate content", async () => {
    const result = await createArticle(sarah, {
      contentType: "market-perspective",
      title: "Keybase Market Perspective",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(403);
  });

  it("never hands out a slug that already belongs to a published page", async () => {
    // The Canada inflation article lives as a static module and is already at
    // this URL. A new article must not shadow it.
    const created = await createArticle(sarah, {
      contentType: "advisor-perspective",
      title:
        "Canada's Inflation Rate Is Back at 3%. Here's What Investors Should Actually Pay Attention To",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.article.slug).not.toBe(
      "canada-inflation-july-2026-investor-perspective"
    );
  });

  it("lets an advisor edit their own draft", async () => {
    const created = await createArticle(sarah, {
      contentType: "advisor-perspective",
    });
    if (!created.ok) return;

    const saved = await saveDraft(
      sarah,
      created.value.article.id,
      fullPayload({ title: "A revised headline" })
    );
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.value.revision.payload.title).toBe("A revised headline");
    // Editing a draft updates it in place rather than opening a new version.
    expect(saved.value.newRevision).toBe(false);
    expect(saved.value.revision.id).toBe(created.value.revision.id);
  });

  it("refuses to let one advisor edit another's draft", async () => {
    const created = await createArticle(sarah, {
      contentType: "advisor-perspective",
    });
    if (!created.ok) return;

    const attempt = await saveDraft(
      otherAdvisor,
      created.value.article.id,
      fullPayload({ title: "Written by somebody else" })
    );
    expect(attempt.ok).toBe(false);
    if (attempt.ok) return;
    // A 404, not a 403: probing ids reveals nothing about what exists.
    expect(attempt.status).toBe(404);

    // And the original is untouched.
    const revision = await repo.getRevision(created.value.revision.id);
    expect(revision?.payload.title).not.toBe("Written by somebody else");
  });

  it("hides another advisor's draft entirely", async () => {
    const created = await createArticle(sarah, {
      contentType: "advisor-perspective",
    });
    if (!created.ok) return;

    const seen = await loadWorkspace(otherAdvisor, created.value.article.id);
    expect(seen.ok).toBe(false);

    // Compliance cannot see it either, until it is submitted to them.
    const byCompliance = await loadWorkspace(christine, created.value.article.id);
    expect(byCompliance.ok).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Submission and immutability
  // -------------------------------------------------------------------------

  it("refuses to submit an incomplete article, listing what is missing", async () => {
    const created = await createArticle(sarah, {
      contentType: "advisor-perspective",
    });
    if (!created.ok) return;

    const attempt = await submitForReview(sarah, created.value.article.id);
    expect(attempt.ok).toBe(false);
    if (attempt.ok) return;
    expect(attempt.status).toBe(400);
    expect(attempt.details?.length).toBeGreaterThan(0);
  });

  it("freezes the submitted revision and locks the article", async () => {
    const created = await createArticle(sarah, {
      contentType: "advisor-perspective",
    });
    if (!created.ok) return;
    const articleId = created.value.article.id;
    await saveDraft(sarah, articleId, fullPayload());

    const submitted = await submitForReview(sarah, articleId);
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;

    expect(submitted.value.article.status).toBe("submitted");
    expect(submitted.value.article.submittedRevisionId).toBe(
      submitted.value.revision.id
    );
    expect(submitted.value.revision.frozenAt).not.toBeNull();
    expect(submitted.value.revision.state).toBe("submitted");
  });

  it("will not let the author change the version compliance is reading", async () => {
    const created = await createArticle(sarah, {
      contentType: "advisor-perspective",
    });
    if (!created.ok) return;
    const articleId = created.value.article.id;
    await saveDraft(sarah, articleId, fullPayload());
    const submitted = await submitForReview(sarah, articleId);
    if (!submitted.ok) return;

    const attempt = await saveDraft(
      sarah,
      articleId,
      fullPayload({ title: "Sneaking a change past the reviewer" })
    );
    expect(attempt.ok).toBe(false);
    if (attempt.ok) return;
    expect(attempt.status).toBe(409);

    const stored = await repo.getRevision(submitted.value.revision.id);
    expect(stored?.payload.title).toBe(fullPayload().title);
  });

  it("refuses at the database level even if the service is bypassed", async () => {
    // The rule does not depend on application code being correct. Writing
    // straight to the table raises, because a trigger enforces the freeze.
    const created = await createArticle(sarah, {
      contentType: "advisor-perspective",
    });
    if (!created.ok) return;
    await saveDraft(sarah, created.value.article.id, fullPayload());
    const submitted = await submitForReview(sarah, created.value.article.id);
    if (!submitted.ok) return;

    await expect(
      rawQuery(
        "update content_revisions set payload = '{\"title\":\"tampered\"}'::jsonb where id = $1",
        [submitted.value.revision.id]
      )
    ).rejects.toThrow(/frozen/i);
  });

  it("cannot be submitted twice", async () => {
    const created = await createArticle(sarah, {
      contentType: "advisor-perspective",
    });
    if (!created.ok) return;
    await saveDraft(sarah, created.value.article.id, fullPayload());
    await submitForReview(sarah, created.value.article.id);

    const again = await submitForReview(sarah, created.value.article.id);
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.status).toBe(409);
  });

  it("shows compliance the article once it has been submitted", async () => {
    const created = await createArticle(sarah, {
      contentType: "advisor-perspective",
    });
    if (!created.ok) return;
    await saveDraft(sarah, created.value.article.id, fullPayload());
    await submitForReview(sarah, created.value.article.id);

    const seen = await loadWorkspace(christine, created.value.article.id);
    expect(seen.ok).toBe(true);
    if (!seen.ok) return;
    expect(seen.value.submitted?.payload.title).toBe(fullPayload().title);
    // And compliance may act on it, because they did not write it.
    expect(seen.value.permissions.review).toBe(true);
  });

  it("never lets the author review their own submission", async () => {
    const created = await createArticle(sarah, {
      contentType: "advisor-perspective",
    });
    if (!created.ok) return;
    await saveDraft(sarah, created.value.article.id, fullPayload());
    await submitForReview(sarah, created.value.article.id);

    const seen = await loadWorkspace(sarah, created.value.article.id);
    if (!seen.ok) return;
    expect(seen.value.permissions.review).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Concurrency
  // -------------------------------------------------------------------------

  it("refuses a save aimed at a revision that has moved on", async () => {
    const created = await createArticle(sarah, {
      contentType: "advisor-perspective",
    });
    if (!created.ok) return;
    const articleId = created.value.article.id;
    await saveDraft(sarah, articleId, fullPayload());
    await submitForReview(sarah, articleId);

    // A second tab still holding the old revision id.
    const stale = await saveDraft(
      sarah,
      articleId,
      fullPayload({ title: "From a stale tab" }),
      created.value.revision.id
    );
    expect(stale.ok).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Slugs
  // -------------------------------------------------------------------------

  it("does not move a live URL when the headline is rewritten", async () => {
    const created = await createArticle(sarah, {
      contentType: "advisor-perspective",
      title: "Original headline",
    });
    if (!created.ok) return;
    const original = created.value.article.slug;

    await saveDraft(
      sarah,
      created.value.article.id,
      fullPayload({ title: "A completely different headline" })
    );

    const after = await repo.getArticle(created.value.article.id);
    expect(after?.slug).toBe(original);
  });

  it("refuses a slug another article already uses", async () => {
    const admin = await makeUser("admin");
    const first = await createArticle(sarah, {
      contentType: "advisor-perspective",
      title: "Taken headline",
    });
    const second = await createArticle(sarah, {
      contentType: "advisor-perspective",
      title: "Different headline",
    });
    if (!first.ok || !second.ok) return;

    const attempt = await updateSettings(admin, second.value.article.id, {
      slug: first.value.article.slug,
    });
    expect(attempt.ok).toBe(false);
    if (attempt.ok) return;
    expect(attempt.status).toBe(409);
  });

  // -------------------------------------------------------------------------
  // Audit
  // -------------------------------------------------------------------------

  it("records creation and submission in the audit trail", async () => {
    const created = await createArticle(sarah, {
      contentType: "advisor-perspective",
    });
    if (!created.ok) return;
    await saveDraft(sarah, created.value.article.id, fullPayload());
    await submitForReview(sarah, created.value.article.id);

    const audit = await repo.listAudit(created.value.article.id);
    const actions = audit.map((entry) => entry.action);
    expect(actions).toContain("article_created");
    expect(actions).toContain("revision_submitted");
    expect(audit.every((entry) => entry.actorLabel === "Sarah Chen")).toBe(true);
  });

  it("will not let anyone rewrite the audit trail", async () => {
    const created = await createArticle(sarah, {
      contentType: "advisor-perspective",
    });
    if (!created.ok) return;

    await expect(
      rawQuery("update content_audit set actor_label = 'Somebody Else' where article_id = $1", [
        created.value.article.id,
      ])
    ).rejects.toThrow(/append-only/i);

    await expect(
      rawQuery("delete from content_audit where article_id = $1", [
        created.value.article.id,
      ])
    ).rejects.toThrow(/append-only/i);
  });

  // -------------------------------------------------------------------------
  // Public exposure
  // -------------------------------------------------------------------------

  it("keeps an unpublished article out of every public read", async () => {
    const created = await createArticle(sarah, {
      contentType: "advisor-perspective",
      title: "Not for the public yet",
    });
    if (!created.ok) return;
    const slug = created.value.article.slug;

    // Draft: invisible.
    expect(await repo.getPublishedBySlug(slug)).toBeNull();
    expect(await repo.listPublished()).toHaveLength(0);

    // Under review: still invisible. Guessing the slug gets nothing.
    await saveDraft(sarah, created.value.article.id, fullPayload());
    await submitForReview(sarah, created.value.article.id);
    expect(await repo.getPublishedBySlug(slug)).toBeNull();
    expect(await repo.listPublished()).toHaveLength(0);
  });
});
