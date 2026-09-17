import Link from "next/link";
import { formatArticleDate } from "@/lib/insights/articles";
import type { InsightArticle } from "@/lib/insights/types";

/**
 * A person's articles, listed on their profile.
 *
 * The list is derived from the article records — every article names its author
 * and reviewer, and this filters on that — so nobody has to keep a second copy
 * of it in step with the first.
 */
export default function PersonArticles({ articles }: { articles: InsightArticle[] }) {
  if (articles.length === 0) return null;

  return (
    <ul className="space-y-5">
      {articles.map((article) => (
        <li key={article.slug}>
          <Link href={`/newsroom/${article.slug}`} className="group block">
            <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#006d6e]">
              {article.category}
            </span>
            <span className="mt-1 block font-serif text-[20px] font-normal leading-snug text-[#0a1f33] transition-colors group-hover:text-[#006d6e]">
              {article.title}
            </span>
            <time
              dateTime={article.publishedAt}
              className="mt-1.5 block text-[14px] text-[#9aa3ad]"
            >
              {formatArticleDate(article.publishedAt)}
            </time>
          </Link>
        </li>
      ))}
    </ul>
  );
}
