import { listPublished, getPublishedBySlug } from "@/lib/content/repo";
import { toInsightArticle } from "@/lib/content/render";
import type { InsightArticle } from "./types";
import { getPublishedArticles as staticArticles, getExternalCoverage } from "./articles";

/**
 * The one place the public website asks "what articles exist?".
 *
 * Two sources feed it:
 *
 *   1. The static store in lib/insights/content — articles written directly in
 *      TypeScript before the CMS existed. The Canada inflation piece lives
 *      here, and it keeps its exact page, URL, and SEO by staying here rather
 *      than being rewritten through a migration nobody asked for.
 *
 *   2. The PUBLISHED revision of each CMS article. Published, and nothing else:
 *      the query joins on `published_revision_id`, so a draft, a submission
 *      under review, a rejected piece, and an approved-but-not-yet-published
 *      one are all invisible here. An article sitting at v4 published with v5
 *      in draft returns v4.
 *
 * Every function is async because the database is. The synchronous helpers in
 * ./articles.ts still exist and still cover the static store alone — they are
 * what the tests exercise, and what the pure selection logic is written
 * against.
 */

/**
 * A database that is unreachable must not take the public newsroom down. The
 * static articles still render; the CMS ones are missing until it recovers, and
 * the reason is logged rather than swallowed. Matches how lib/cms/public.ts
 * already treats a failed read on a public page.
 */
async function publishedFromCms(): Promise<InsightArticle[]> {
  try {
    const rows = await listPublished();
    return rows.map(({ article, revision, owner }) =>
      toInsightArticle(article, revision, owner),
    );
  } catch (err) {
    console.error("[insights] could not read published CMS articles:", err);
    return [];
  }
}

/** Every article with a page of its own, newest first. External items excluded. */
export async function getPublishedArticles(): Promise<InsightArticle[]> {
  const [fromCms] = await Promise.all([publishedFromCms()]);
  return [...staticArticles(), ...fromCms].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
}

/**
 * One published article by slug.
 *
 * The static store is checked first because those slugs are already live and
 * must keep resolving to the same page; slug generation refuses to reuse one
 * (lib/content/staticSlugs.ts), so the two sets cannot overlap in practice.
 */
export async function getArticleBySlug(
  slug: string,
): Promise<InsightArticle | undefined> {
  const fromStatic = staticArticles().find((a) => a.slug === slug);
  if (fromStatic) return fromStatic;

  try {
    const found = await getPublishedBySlug(slug);
    if (!found) return undefined;
    return toInsightArticle(found.article, found.revision, found.owner);
  } catch (err) {
    console.error(`[insights] could not read published article "${slug}":`, err);
    return undefined;
  }
}

/**
 * Curated relations first, then others in the same category. Never the article
 * itself, and never padded out with unrelated pieces to hit a count.
 *
 * The same rule ./articles.ts applies to the static store, over the merged set.
 */
export async function getRelatedArticles(
  slug: string,
  limit = 3,
): Promise<InsightArticle[]> {
  const all = await getPublishedArticles();
  const article = all.find((a) => a.slug === slug);
  if (!article) return [];

  const others = all.filter((a) => a.slug !== slug);
  const curated = (article.relatedSlugs ?? [])
    .map((s) => others.find((a) => a.slug === s))
    .filter((a): a is InsightArticle => Boolean(a));

  const sameCategory = others.filter(
    (a) => a.category === article.category && !curated.includes(a),
  );

  return [...curated, ...sameCategory].slice(0, limit);
}

/** External coverage: listed and linked out, never reproduced on this site. */
export { getExternalCoverage };
