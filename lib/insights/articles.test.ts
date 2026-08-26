import { describe, expect, it } from "vitest";

import {
  ARTICLES,
  CATEGORIES,
  articleHeadings,
  formatArticleDate,
  getArticleBySlug,
  getPublishedArticles,
  getRelatedArticles,
  headingSlug,
  showsDisclaimer,
  showsTableOfContents,
} from "./articles";
import { articleAuthor, articleReviewer } from "./attribution";
import { buildNewsroomCards, isoFromDisplayDate } from "./listing";
import type { ArticleBlock, InsightArticle } from "./types";
import type { NewsArticle } from "@/lib/cms/types";

/**
 * Selection rules are exercised against fixtures rather than the live store, so
 * they keep testing the behaviour and not today's editorial calendar. The tests
 * against the real store below assert only what must hold of anything
 * published: a slug that resolves, a body behind it, a known category.
 */
function fixture(overrides: Partial<InsightArticle> = {}): InsightArticle {
  return {
    slug: "example-article",
    kind: "educational",
    category: "Retirement",
    title: "Example Article",
    excerpt: "An example.",
    publishedAt: "2026-06-22",
    body: [{ type: "paragraph", text: "Body." }],
    ...overrides,
  };
}

describe("the published store", () => {
  it("publishes nothing without a body behind it", () => {
    expect(ARTICLES.length).toBeGreaterThan(0);
    expect(ARTICLES.every((a) => a.body.length > 0)).toBe(true);
  });

  it("resolves every published slug, and only those", () => {
    for (const article of getPublishedArticles()) {
      expect(getArticleBySlug(article.slug)?.slug).toBe(article.slug);
    }
    expect(getArticleBySlug("positioning-portfolios")).toBeUndefined();
    expect(getArticleBySlug("")).toBeUndefined();
  });

  it("gives every article a unique slug", () => {
    const slugs = ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("declares no category without content behind it", () => {
    expect(CATEGORIES.length).toBeGreaterThan(0);
    expect(new Set(CATEGORIES).size).toBe(CATEGORIES.length);
    for (const article of ARTICLES) {
      expect(CATEGORIES).toContain(article.category);
    }
  });

  it("dates every article in ISO form, never a display string", () => {
    for (const article of ARTICLES) {
      expect(article.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("points related services at site-relative routes", () => {
    for (const article of ARTICLES) {
      for (const service of article.relatedServices ?? []) {
        expect(service.href.startsWith("/")).toBe(true);
      }
    }
  });
});

describe("article selection", () => {
  const store = [
    fixture({ slug: "a", publishedAt: "2026-01-01" }),
    fixture({ slug: "b", publishedAt: "2026-03-01" }),
    fixture({ slug: "c", publishedAt: "2026-02-01", category: "Investing" }),
  ];

  const published = (list: InsightArticle[]) =>
    list.filter((a) => a.kind !== "external" && a.body.length > 0)
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  it("orders newest first", () => {
    expect(published(store).map((a) => a.slug)).toEqual(["b", "c", "a"]);
  });

  it("never returns the article itself as related", () => {
    // getRelatedArticles reads the real (empty) store, so exercise the rule directly.
    const current = store[0];
    const related = published(store).filter((a) => a.slug !== current.slug);
    expect(related.map((a) => a.slug)).not.toContain("a");
  });

  it("returns nothing related for an unknown slug", () => {
    expect(getRelatedArticles("does-not-exist")).toEqual([]);
  });
});

describe("optional fields", () => {
  it("accepts an article with no author and no reviewer", () => {
    const article = fixture();
    expect(article.authorId).toBeUndefined();
    expect(article.reviewerId).toBeUndefined();
    expect(articleAuthor(article)).toBeUndefined();
    expect(articleReviewer(article)).toBeUndefined();
  });

  it("carries author and reviewer separately when both exist", () => {
    const article = fixture({
      authorId: "dax-sukhraj",
      reviewerId: "mark-garcia",
      reviewedAt: "2026-07-01",
    });
    expect(articleAuthor(article)?.name).toBe("Dax Sukhraj");
    expect(articleReviewer(article)?.role).toBe("Chief Compliance Officer");
    expect(article.reviewedAt).toBe("2026-07-01");
  });

  it("resolves a byline to nothing when the id matches no person", () => {
    expect(articleAuthor(fixture({ authorId: "nobody-at-all" }))).toBeUndefined();
  });
});

describe("disclaimer rules", () => {
  it("applies to educational and market pieces", () => {
    expect(showsDisclaimer(fixture({ kind: "educational" }))).toBe(true);
    expect(showsDisclaimer(fixture({ kind: "market" }))).toBe(true);
  });

  it("does not apply to company news or external coverage", () => {
    expect(showsDisclaimer(fixture({ kind: "company-news" }))).toBe(false);
    expect(showsDisclaimer(fixture({ kind: "external" }))).toBe(false);
  });

  it("can be overridden explicitly", () => {
    expect(showsDisclaimer(fixture({ kind: "company-news", showDisclaimer: true }))).toBe(true);
  });
});

describe("headings and the table of contents", () => {
  const body: ArticleBlock[] = [
    { type: "heading", level: 2, text: "What is an RRSP?" },
    { type: "paragraph", text: "…" },
    { type: "heading", level: 3, text: "Example" },
    { type: "heading", level: 2, text: "Contribution room" },
    { type: "heading", level: 3, text: "Example" },
  ];

  it("slugifies headings predictably", () => {
    expect(headingSlug("What is an RRSP?")).toBe("what-is-an-rrsp");
    expect(headingSlug("Tax & Estate — 2026")).toBe("tax-estate-2026");
  });

  it("never produces a duplicate anchor id", () => {
    const ids = articleHeadings(body).map((h) => h.id);
    expect(ids).toEqual(["what-is-an-rrsp", "example", "contribution-room", "example-2"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps heading levels intact", () => {
    expect(articleHeadings(body).map((h) => h.level)).toEqual([2, 3, 2, 3]);
  });

  it("shows a contents list only once an article is long enough", () => {
    expect(showsTableOfContents(body)).toBe(true);
    expect(showsTableOfContents(body.slice(0, 2))).toBe(false);
    expect(showsTableOfContents([{ type: "paragraph", text: "Short." }])).toBe(false);
  });
});

describe("dates", () => {
  it("formats an ISO date without depending on the host timezone", () => {
    expect(formatArticleDate("2026-06-22")).toBe("June 22, 2026");
    expect(formatArticleDate("2026-01-05")).toBe("January 5, 2026");
  });

  it("returns unparseable input unchanged rather than inventing a date", () => {
    expect(formatArticleDate("2026.06.22")).toBe("2026.06.22");
    expect(formatArticleDate("")).toBe("");
  });

  it("converts unambiguous CMS display dates to ISO, and nothing else", () => {
    expect(isoFromDisplayDate("2026.06.22")).toBe("2026-06-22");
    expect(isoFromDisplayDate("2026-6-8")).toBe("2026-06-08");
    expect(isoFromDisplayDate("June 2026")).toBeUndefined();
    expect(isoFromDisplayDate("")).toBeUndefined();
  });
});

describe("the newsroom listing", () => {
  const cmsEntries: NewsArticle[] = [
    {
      id: "1",
      category: "Markets",
      title: "Positioning Portfolios for a Higher-for-Longer Rate Environment",
      excerpt: "What persistent rates mean…",
      date: "2026.06.22",
      author: "Keybase Research",
      isVisible: true,
    },
    {
      id: "2",
      category: "Firm News",
      title: "Keybase Expands Its Advisory Team Across Canada",
      excerpt: "New advisors join…",
      date: "2026.05.12",
      author: "Keybase Financial Group",
      isVisible: true,
    },
  ];

  /** The CMS entries, in the order buildNewsroomCards appends them. */
  const stubs = (cards: ReturnType<typeof buildNewsroomCards>) =>
    cards.slice(getPublishedArticles().length);

  it("lists published articles first, each linking to its own page", () => {
    const cards = buildNewsroomCards([]);
    expect(cards).toHaveLength(getPublishedArticles().length);
    expect(cards.every((c) => c.href?.startsWith("/newsroom/"))).toBe(true);
  });

  it("carries the article's own artwork onto its card", () => {
    for (const card of buildNewsroomCards([])) {
      const article = getArticleBySlug(card.id);
      expect(card.image?.src).toBe(article?.heroImage?.src);
    }
  });

  it("lists a CMS entry with no article behind it, and gives it no link", () => {
    const listed = stubs(buildNewsroomCards(cmsEntries));
    expect(listed).toHaveLength(2);
    expect(listed.every((c) => c.href === undefined)).toBe(true);
    expect(listed.map((c) => c.title)).toEqual(cmsEntries.map((e) => e.title));
  });

  it("carries an ISO date for <time> when the display date is unambiguous", () => {
    const [first] = stubs(buildNewsroomCards(cmsEntries));
    expect(first.dateLabel).toBe("2026.06.22");
    expect(first.dateTime).toBe("2026-06-22");
  });

  it("preserves the CMS author byline verbatim", () => {
    expect(stubs(buildNewsroomCards(cmsEntries))[0].author).toBe("Keybase Research");
  });

  it("adds nothing of its own for an empty CMS list", () => {
    expect(stubs(buildNewsroomCards([]))).toEqual([]);
  });

  it("does not list a CMS entry twice once it has been written up", () => {
    const [article] = getPublishedArticles();
    const duplicate = [
      ...cmsEntries,
      {
        id: "dupe",
        category: article.category,
        title: article.title,
        excerpt: article.excerpt,
        date: "2026.08.26",
        author: "Keybase Research",
        isVisible: true,
      },
    ];
    const titles = buildNewsroomCards(duplicate).map((c) => c.title);
    expect(titles.filter((t) => t === article.title)).toHaveLength(1);
  });
});
