import { describe, expect, it } from "vitest";
import {
  actorFromUser,
  canCreateContentType,
  canEditArticle,
  canPublish,
  canReview,
  canSubmitForReview,
  canViewArticle,
  reviewBlockedReason,
  type Actor,
} from "./authz";
import type { ArticleStatus, ContentArticle, ContentRole } from "./types";

/**
 * The permission rules, tested without a database.
 *
 * These are pure functions on purpose: the answer to "may this person approve
 * this article?" should be checkable without standing up Postgres, and every
 * route in the system routes its decision through here.
 */

const ADVISOR: Actor = { id: "advisor-1", role: "advisor", isActive: true };
const OTHER_ADVISOR: Actor = { id: "advisor-2", role: "advisor", isActive: true };
const COMPLIANCE: Actor = { id: "compliance-1", role: "compliance", isActive: true };
const ADMIN: Actor = { id: "admin-1", role: "admin", isActive: true };

function article(overrides: Partial<ContentArticle> = {}): ContentArticle {
  return {
    id: "article-1",
    slug: "example",
    contentType: "advisor-perspective",
    status: "draft",
    ownerId: ADVISOR.id,
    currentDraftRevisionId: "rev-1",
    submittedRevisionId: null,
    publishedRevisionId: null,
    publishedAt: null,
    scheduledFor: null,
    createdAt: "2026-08-24T09:00:00.000Z",
    updatedAt: "2026-08-24T09:00:00.000Z",
    ...overrides,
  };
}

describe("viewing", () => {
  it("lets an advisor see their own draft and nobody else's", () => {
    const draft = article();
    expect(canViewArticle(ADVISOR, draft)).toBe(true);
    expect(canViewArticle(OTHER_ADVISOR, draft)).toBe(false);
  });

  it("hides an untouched private draft from compliance", () => {
    // Compliance reviews what it is sent. A draft nobody has submitted is not
    // yet their business.
    expect(canViewArticle(COMPLIANCE, article())).toBe(false);
  });

  it("shows compliance an article once it has been submitted", () => {
    expect(
      canViewArticle(
        COMPLIANCE,
        article({ status: "submitted", submittedRevisionId: "rev-1" })
      )
    ).toBe(true);
  });

  it("refuses a deactivated account everything", () => {
    const gone: Actor = { ...ADMIN, isActive: false };
    expect(canViewArticle(gone, article())).toBe(false);
    expect(canEditArticle(gone, article())).toBe(false);
    expect(canPublish(gone)).toBe(false);
  });
});

describe("editing", () => {
  it("lets an owner edit their own draft", () => {
    expect(canEditArticle(ADVISOR, article())).toBe(true);
  });

  it("refuses another advisor's draft", () => {
    expect(canEditArticle(OTHER_ADVISOR, article())).toBe(false);
  });

  it.each<ArticleStatus>(["submitted", "under_review"])(
    "locks editing while compliance holds the article (%s)",
    (status) => {
      const held = article({ status });
      expect(canEditArticle(ADVISOR, held)).toBe(false);
      // Not even an admin edits a version somebody is mid-review on.
      expect(canEditArticle(ADMIN, held)).toBe(false);
    }
  );

  it("returns editing once compliance responds", () => {
    expect(canEditArticle(ADVISOR, article({ status: "changes_requested" }))).toBe(
      true
    );
    expect(canEditArticle(ADVISOR, article({ status: "rejected" }))).toBe(true);
  });

  it("allows a new draft while an earlier version stays published", () => {
    const live = article({
      status: "published",
      publishedRevisionId: "rev-4",
      publishedAt: "2026-08-26T11:00:00.000Z",
    });
    expect(canEditArticle(ADVISOR, live)).toBe(true);
  });

  it("refuses an archived article", () => {
    expect(canEditArticle(ADMIN, article({ status: "archived" }))).toBe(false);
  });
});

describe("submitting", () => {
  it.each<ArticleStatus>(["draft", "changes_requested", "rejected", "published"])(
    "can submit from %s",
    (status) => {
      expect(canSubmitForReview(ADVISOR, article({ status }))).toBe(true);
    }
  );

  it("cannot submit a version already with compliance", () => {
    expect(canSubmitForReview(ADVISOR, article({ status: "submitted" }))).toBe(false);
    expect(canSubmitForReview(ADVISOR, article({ status: "under_review" }))).toBe(
      false
    );
  });
});

describe("reviewing", () => {
  it("lets compliance review somebody else's article", () => {
    expect(canReview(COMPLIANCE, article({ status: "submitted" }))).toBe(true);
  });

  it("never lets an author review their own article", () => {
    // The rule the whole feature exists for. An advisor cannot approve their
    // own work…
    expect(canReview(ADVISOR, article({ status: "submitted" }))).toBe(false);

    // …and neither can a compliance officer who happens to have written it…
    const ownedByCompliance = article({
      ownerId: COMPLIANCE.id,
      status: "submitted",
    });
    expect(canReview(COMPLIANCE, ownedByCompliance)).toBe(false);

    // …nor an admin, who has every other power in the system.
    const ownedByAdmin = article({ ownerId: ADMIN.id, status: "submitted" });
    expect(canReview(ADMIN, ownedByAdmin)).toBe(false);
    expect(reviewBlockedReason(ADMIN, ownedByAdmin)).toMatch(/wrote this article/i);
  });

  it("does not let an advisor review anybody's article", () => {
    expect(canReview(OTHER_ADVISOR, article({ status: "submitted" }))).toBe(false);
  });
});

describe("publishing", () => {
  it("is an administrator's decision alone", () => {
    expect(canPublish(ADMIN)).toBe(true);
    expect(canPublish(COMPLIANCE)).toBe(false);
    expect(canPublish(ADVISOR)).toBe(false);
  });
});

describe("content types", () => {
  it("lets an advisor write only advisor-authored types", () => {
    expect(canCreateContentType(ADVISOR, "advisor-perspective")).toBe(true);
    expect(canCreateContentType(ADVISOR, "market-perspective")).toBe(false);
    expect(canCreateContentType(ADVISOR, "company-news")).toBe(false);
  });

  it("lets an admin write the corporate voice", () => {
    expect(canCreateContentType(ADMIN, "market-perspective")).toBe(true);
    expect(canCreateContentType(ADMIN, "company-news")).toBe(true);
  });
});

describe("actorFromUser", () => {
  it("carries role and active state off the user record", () => {
    const roles: ContentRole[] = ["advisor", "compliance", "admin"];
    for (const role of roles) {
      const actor = actorFromUser({
        id: "u",
        email: "u@example.com",
        name: "U",
        role,
        authorTitle: "",
        isActive: false,
        createdAt: "2026-08-26T00:00:00.000Z",
      });
      expect(actor).toEqual({ id: "u", role, isActive: false });
    }
  });
});
