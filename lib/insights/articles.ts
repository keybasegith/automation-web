import { CANADA_INFLATION_JULY_2026 } from "./content/canadaInflationJuly2026";
import type { ArticleBlock, ArticleKind, InsightArticle } from "./types";

/**
 * The published article store.
 *
 * One record per article, each in its own module under `content/`. Adding a
 * record here is the whole publishing step: the page at /newsroom/<slug>, its
 * listing card, its metadata, its structured data, and its table of contents
 * all follow from it with no further wiring.
 *
 * Nothing is listed here without a real body behind it — the newsroom shows
 * articles, not headlines waiting for copy.
 */
export const ARTICLES: InsightArticle[] = [CANADA_INFLATION_JULY_2026];

/**
 * The categories the newsroom uses. No category exists here without a
 * published article behind it; add one as the article that needs it lands.
 */
export const CATEGORIES = ["Market Perspectives"] as const;

/** Pieces that carry an educational disclaimer unless told otherwise. */
const DISCLAIMER_BY_DEFAULT: ArticleKind[] = ["educational", "market"];

export function showsDisclaimer(article: InsightArticle): boolean {
  return article.showDisclaimer ?? DISCLAIMER_BY_DEFAULT.includes(article.kind);
}

/** Every article with a page of its own, newest first. External items excluded. */
export function getPublishedArticles(): InsightArticle[] {
  return ARTICLES.filter((a) => a.kind !== "external" && a.body.length > 0).sort(
    (a, b) => b.publishedAt.localeCompare(a.publishedAt),
  );
}

/** External coverage: listed and linked out, never reproduced on this site. */
export function getExternalCoverage(): InsightArticle[] {
  return ARTICLES.filter((a) => a.kind === "external" && a.externalUrl);
}

export function getArticleBySlug(slug: string): InsightArticle | undefined {
  return getPublishedArticles().find((a) => a.slug === slug);
}

/**
 * Curated relations first, then others in the same category. Never the article
 * itself, and never padded out with unrelated pieces to hit a count.
 */
export function getRelatedArticles(slug: string, limit = 3): InsightArticle[] {
  const article = getArticleBySlug(slug);
  if (!article) return [];

  const others = getPublishedArticles().filter((a) => a.slug !== slug);
  const curated = (article.relatedSlugs ?? [])
    .map((s) => others.find((a) => a.slug === s))
    .filter((a): a is InsightArticle => Boolean(a));

  const sameCategory = others.filter(
    (a) => a.category === article.category && !curated.includes(a),
  );

  return [...curated, ...sameCategory].slice(0, limit);
}

/** Slug for a heading anchor: lowercase, hyphenated, punctuation stripped. */
export function headingSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * Table-of-contents entries for an article's headings, with ids made unique by
 * suffixing repeats — two sections called "Example" must not both anchor to
 * #example.
 */
export function articleHeadings(body: ArticleBlock[]): TocEntry[] {
  const seen = new Map<string, number>();
  return body
    .filter((b): b is Extract<ArticleBlock, { type: "heading" }> => b.type === "heading")
    .map((block) => {
      const base = headingSlug(block.text);
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      return {
        id: count === 0 ? base : `${base}-${count + 1}`,
        text: block.text,
        level: block.level,
      };
    });
}

/** Below this, a table of contents is more furniture than help. */
const TOC_MIN_HEADINGS = 4;

export function showsTableOfContents(body: ArticleBlock[]): boolean {
  return articleHeadings(body).length >= TOC_MIN_HEADINGS;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * "2026-06-22" → "June 22, 2026".
 *
 * Parsed by hand rather than through Date/toLocaleDateString, which would make
 * the output depend on the renderer's timezone and ICU data — the classic way a
 * server-rendered date ends up one day off from the client's.
 */
export function formatArticleDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  const name = MONTHS[Number(month) - 1];
  if (!name) return iso;
  return `${name} ${Number(day)}, ${year}`;
}
