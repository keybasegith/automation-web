import { notFound } from "next/navigation";

import NewsroomArticle from "@/components/insights/NewsroomArticle";
import { getArticleBySlug, getRelatedArticles } from "@/lib/insights/registry";
import { pageMetadata } from "@/lib/seo/metadata";

/**
 * One insight article.
 *
 * Rendered dynamically, for the same reason /people/[slug] is: articles are
 * editable in the content CMS and staff expect a publication to appear
 * immediately. Static generation would freeze the set of articles at build
 * time, so a piece approved and published this afternoon would not exist until
 * the next deploy.
 *
 * Which slugs resolve is decided by the article registry, which merges the
 * static store with the PUBLISHED revision of each CMS article. A draft, a
 * submission under review, and a rejected piece all 404 here — guessing a slug
 * gets you nothing.
 */
export const dynamic = "force-dynamic";

/**
 * Title and description come from the article record — its own SEO copy where
 * the writer supplied some, its headline and excerpt otherwise. An unknown slug
 * gets nothing here; the page itself is what returns the 404.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};

  return pageMetadata(`/newsroom/${article.slug}`,
    article.seoTitle ?? `${article.title} — Keybase Financial Group`,
    article.seoDescription ?? article.excerpt, article.heroImage?.src, "article");
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <NewsroomArticle article={article} related={await getRelatedArticles(slug)} />
  );
}
