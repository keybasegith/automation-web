import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { InsightArticle, RelatedService } from "@/lib/insights/types";
import { formatArticleDate } from "@/lib/insights/articles";

/**
 * What to read next: curated related articles, and the service pages the
 * article's subject actually maps to.
 *
 * Both lists are declared on the article record — nothing is recommended by
 * similarity scoring, and a section with nothing in it does not render.
 */
export default function ArticleRelated({
  articles,
  services,
}: {
  articles: InsightArticle[];
  services?: RelatedService[];
}) {
  const hasArticles = articles.length > 0;
  const hasServices = Boolean(services?.length);
  if (!hasArticles && !hasServices) return null;

  return (
    <section
      aria-labelledby="read-next"
      className="mt-14 border-t border-black/10 pt-10"
    >
      <h2
        id="read-next"
        className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]"
      >
        Read Next
      </h2>

      {hasArticles && (
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <li key={article.slug}>
              <Link
                href={`/newsroom/${article.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-black/10 p-6 transition-shadow hover:shadow-[0_24px_60px_-32px_rgba(10,31,51,0.35)]"
              >
                <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#006d6e]">
                  {article.category}
                </span>
                <span className="mt-3 flex-1 font-serif text-[20px] font-normal leading-snug text-[#0a1f33] transition-colors group-hover:text-[#006d6e]">
                  {article.title}
                </span>
                <time
                  dateTime={article.publishedAt}
                  className="mt-4 text-[14px] text-[#9aa3ad]"
                >
                  {formatArticleDate(article.publishedAt)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hasServices && (
        <div className={hasArticles ? "mt-10" : "mt-6"}>
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#7a828d]">
            Related Services
          </h3>
          <ul className="mt-4 space-y-3">
            {services?.map((service) => (
              <li key={service.href}>
                <Link href={service.href} className="group inline-flex flex-col">
                  <span className="inline-flex items-center gap-1.5 font-serif text-xl font-normal text-[#0a1f33] transition-colors group-hover:text-[#006d6e]">
                    {service.label}
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                  {service.note && (
                    <span className="mt-1 text-[15px] leading-relaxed text-[#5b6573]">
                      {service.note}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
