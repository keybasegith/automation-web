import type { InsightArticle } from "./types";
import {
  getPublishedArticles as publishedArticles,
  getArticleBySlug as articleBySlug,
  getRelatedArticles as relatedArticles,
  getExternalCoverage,
} from "./articles";

/**
 * Public publication selection. Only the two selected Market Perspectives
 * are published. Older static modules and CMS records remain archived, but
 * cannot reappear through direct URLs, related links, search or the sitemap.
 */
export async function getPublishedArticles(): Promise<InsightArticle[]> {
  return publishedArticles();
}

export async function getArticleBySlug(slug: string): Promise<InsightArticle | undefined> {
  return articleBySlug(slug);
}

export async function getRelatedArticles(slug: string, limit = 3): Promise<InsightArticle[]> {
  return relatedArticles(slug, limit);
}

export { getExternalCoverage };
