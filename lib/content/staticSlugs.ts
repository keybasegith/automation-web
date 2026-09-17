import { ARTICLES } from "@/lib/insights/articles";

/**
 * URLs already taken by the articles that live as static modules in
 * lib/insights/content.
 *
 * The existing Canada inflation piece was published before this CMS existed and
 * still renders from its own TypeScript module. Slug generation has to know
 * about it, or a new article could be handed a URL that already resolves to
 * somebody else's page.
 *
 * Kept in its own module so lib/content/service.ts does not pull the whole
 * article store — and its 369-line body — into every request that creates one.
 */
export function staticSlugs(): string[] {
  return ARTICLES.map((article) => article.slug);
}
