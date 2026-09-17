import { buildBreadcrumbs } from "@/lib/seo/schema/breadcrumbs";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import ServiceCta from "@/components/services/ServiceCta";
import ArticleHeader from "@/components/insights/ArticleHeader";
import ArticleBody from "@/components/insights/ArticleBody";
import ArticleTableOfContents from "@/components/insights/ArticleTableOfContents";
import KeyTakeaways from "@/components/insights/KeyTakeaways";
import ArticleSources from "@/components/insights/ArticleSources";
import ArticleDisclaimer from "@/components/insights/ArticleDisclaimer";
import ArticleRelated from "@/components/insights/ArticleRelated";
import ArticleContributors from "@/components/insights/ArticleContributors";
import JsonLd from "@/lib/seo/jsonLd";
import { buildArticle } from "@/lib/seo/schema";
import { schemaDocument } from "@/lib/seo/schema/types";
import { KEYBASE_ORGANIZATION_REF } from "@/lib/seo/keybase";
import { articleAuthor, articleReviewer } from "@/lib/insights/attribution";
import { absoluteUrl } from "@/lib/seo/siteUrl";
import {
  articleHeadings,
  showsDisclaimer,
  showsTableOfContents,
} from "@/lib/insights/articles";
import type { InsightArticle } from "@/lib/insights/types";

/**
 * THE Keybase newsroom article page. One renderer, two callers.
 *
 * The public route (/newsroom/[slug]) and the authenticated CMS preview both
 * render this exact component with the same `InsightArticle` object. That is
 * deliberate and it is the point: a preview built from a second, parallel
 * template would drift from the real page, and an advisor would be approving
 * something that is not quite what a client sees. There is no second template
 * to drift.
 *
 * This markup was lifted unchanged out of app/newsroom/[slug]/page.tsx, so the
 * article already published keeps its exact appearance, spacing, typography,
 * and responsive behaviour.
 */
export default function NewsroomArticle({
  article,
  related = [],
  preview = false,
}: {
  article: InsightArticle;
  related?: InsightArticle[];
  /**
   * Renders the page for an authenticated preview rather than the public web.
   * Suppresses structured data — a draft must not advertise itself to search
   * engines as a published piece.
   */
  preview?: boolean;
}) {
  const headings = articleHeadings(article.body);
  // Name and title come from the one person record, so the schema can never
  // describe someone differently from the byline printed above it.
  const author = articleAuthor(article);
  const reviewer = articleReviewer(article);

  const schema = preview
    ? null
    : schemaDocument(
        [
          buildBreadcrumbs([{ name: "Home", path: "/" }, { name: "Newsroom", path: "/newsroom" }, { name: article.title, path: `/newsroom/${article.slug}` }]),
          buildArticle({
            headline: article.title,
            description: article.excerpt,
            datePublished: article.publishedAt,
            dateModified: article.modifiedAt,
            author: author ? { name: author.name, jobTitle: author.role } : undefined,
            reviewedBy: reviewer
              ? { name: reviewer.name, jobTitle: reviewer.role }
              : undefined,
            // Absolute URLs only. Both stay absent until a production domain is
            // configured; the schema builder omits them rather than guessing.
            image: article.heroImage ? absoluteUrl(article.heroImage.src) : undefined,
            url: absoluteUrl(`/newsroom/${article.slug}`),
            publisher: KEYBASE_ORGANIZATION_REF,
            type: article.kind === "company-news" ? "Article" : "BlogPosting",
          }),
        ].filter((node) => node !== null),
      );

  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      <main className="mx-auto max-w-[1280px] px-5 pb-24 pt-10 sm:px-8 sm:pb-28 sm:pt-14">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-[14px] text-[#9aa3ad]"
        >
          <Link href="/" className="transition-colors hover:text-[#006d6e]">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-[#c2c8cf]" />
          <Link href="/newsroom" className="transition-colors hover:text-[#006d6e]">
            Newsroom
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-[#c2c8cf]" />
          {/* One line on a phone — a long headline repeated in full turns the
              breadcrumb into a second deck. */}
          <span className="line-clamp-1 text-[#1a2433] sm:line-clamp-none">
            {article.title}
          </span>
        </nav>

        {/* A single reading column — the article is prose, not a dashboard. */}
        <article className="mx-auto mt-10 max-w-[760px]">
          <ArticleHeader article={article} />

          {article.keyTakeaways && <KeyTakeaways points={article.keyTakeaways} />}
          {showsTableOfContents(article.body) && (
            <ArticleTableOfContents entries={headings} />
          )}

          <div className="mt-10">
            <ArticleBody body={article.body} />
          </div>

          {article.sources && <ArticleSources sources={article.sources} />}
          {/* Long-form pieces close with a short note on who stands behind
              them; announcements and linked coverage do not need one. */}
          {(article.kind === "educational" || article.kind === "market") && (
            <ArticleContributors article={article} />
          )}
          {showsDisclaimer(article) && (
            <ArticleDisclaimer additional={article.additionalDisclosure} />
          )}
          <ArticleRelated articles={related} services={article.relatedServices} />
        </article>

        {schema && <JsonLd data={schema} />}
      </main>

      <ServiceCta
        heading="Talk it through with an advisor."
        body="Reading is a starting point. A Keybase advisor can tell you how any of this applies to your own circumstances, and what — if anything — is worth acting on."
      />

      <SiteFooter />
    </div>
  );
}
