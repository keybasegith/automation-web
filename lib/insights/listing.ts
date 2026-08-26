import type { NewsArticle } from "@/lib/cms/types";
import { articleAuthor } from "./attribution";
import type { ArticleImage, InsightArticle } from "./types";
import {
  formatArticleDate,
  getExternalCoverage,
  getPublishedArticles,
} from "./articles";

/**
 * One row in the newsroom listing, whatever it came from.
 *
 * `href` is what separates a real article from a headline: cards with one are
 * anchors, cards without one render as they always have. That is how the seven
 * current CMS entries — headlines with no body behind them — keep appearing in
 * the newsroom without pretending to be articles.
 */
export interface NewsroomCard {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  /** What the reader sees. */
  dateLabel: string;
  /** ISO date for <time datetime>, when the source date is unambiguous. */
  dateTime?: string;
  author?: string;
  /** Internal article path, or an external URL. Absent means "not yet a page". */
  href?: string;
  external?: boolean;
  externalPublisher?: string;
  /** The article's own artwork, when it has some. */
  image?: ArticleImage;
}

/** Loose title match, so a CMS entry is not listed twice once written up. */
function titleKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * The CMS stores dates as free-form display strings ("2026.06.22"). Convert to
 * ISO only when the shape is unmistakable — never guess at an ambiguous date.
 */
export function isoFromDisplayDate(value: string): string | undefined {
  const match = /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/.exec(value.trim());
  if (!match) return undefined;
  const [, y, m, d] = match;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function fromArticle(article: InsightArticle): NewsroomCard {
  return {
    id: article.slug,
    title: article.title,
    category: article.category,
    excerpt: article.excerpt,
    dateLabel: formatArticleDate(article.publishedAt),
    dateTime: article.publishedAt,
    author: articleAuthor(article)?.name,
    href:
      article.kind === "external"
        ? article.externalUrl
        : `/newsroom/${article.slug}`,
    external: article.kind === "external",
    externalPublisher: article.externalPublisher,
    image: article.heroImage,
  };
}

/**
 * The full listing: published articles first, then external coverage, then any
 * CMS entry that has not been written up as an article yet.
 */
export function buildNewsroomCards(cmsArticles: NewsArticle[]): NewsroomCard[] {
  const published = getPublishedArticles();
  const external = getExternalCoverage();

  const claimed = new Set(
    [...published, ...external].map((article) => titleKey(article.title)),
  );

  const remaining = cmsArticles
    .filter((entry) => !claimed.has(titleKey(entry.title)))
    .map<NewsroomCard>((entry) => ({
      id: entry.id,
      title: entry.title,
      category: entry.category,
      excerpt: entry.excerpt,
      dateLabel: entry.date,
      dateTime: isoFromDisplayDate(entry.date),
      author: entry.author,
    }));

  return [...published.map(fromArticle), ...external.map(fromArticle), ...remaining];
}
