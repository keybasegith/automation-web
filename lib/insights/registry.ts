import type { InsightArticle } from "./types";
import {
  getPublishedArticles as publishedArticles,
  getArticleBySlug as articleBySlug,
  getRelatedArticles as relatedArticles,
  getExternalCoverage,
} from "./articles";

/**
 * Public publication selection: two Market Perspectives and three homepage
 * Perspectives. Other static modules and CMS records remain archived.
 * The Newsroom listing separately selects only Market Perspectives.
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
