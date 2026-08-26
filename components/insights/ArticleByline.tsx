import Link from "next/link";
import type { PersonByline } from "@/lib/people/types";
import { formatArticleDate } from "@/lib/insights/articles";
import { articleAuthor, articleReviewer } from "@/lib/insights/attribution";
import type { InsightArticle } from "@/lib/insights/types";

function Attribution({ label, person }: { label: string; person: PersonByline }) {
  const name = person.profilePath ? (
    <Link
      href={person.profilePath}
      className="font-semibold text-[#0a1f33] underline decoration-[#0a1f33]/25 underline-offset-4 transition-colors hover:text-[#006d6e] focus-visible:text-[#006d6e]"
    >
      {person.name}
    </Link>
  ) : (
    <span className="font-semibold text-[#0a1f33]">{person.name}</span>
  );

  return (
    <span>
      {label} {name}
      {person.role && <span className="text-[#5b6573]">, {person.role}</span>}
    </span>
  );
}

/**
 * Who wrote an article, who reviewed it, and when — one restrained line above
 * the piece, not a box competing with it.
 *
 * Every part is conditional and resolved from the people registry. A company
 * announcement with no named author renders a date and nothing else: no
 * fallback byline, and never a "Reviewed by the Keybase team" line standing in
 * for a review that did not happen. A name links to a profile only when that
 * person actually has one.
 */
export default function ArticleByline({ article }: { article: InsightArticle }) {
  const author = articleAuthor(article);
  const reviewer = articleReviewer(article);
  const { publishedAt, modifiedAt, reviewedAt } = article;

  return (
    <div className="flex flex-col gap-2 text-[15px] leading-relaxed text-[#5b6573]">
      {(author || reviewer) && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          {author && <Attribution label="Written by" person={author} />}
          {reviewer && <Attribution label="Reviewed by" person={reviewer} />}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[14px] text-[#7a828d]">
        <span>
          Published <time dateTime={publishedAt}>{formatArticleDate(publishedAt)}</time>
        </span>
        {modifiedAt && (
          <span>
            Last updated <time dateTime={modifiedAt}>{formatArticleDate(modifiedAt)}</time>
          </span>
        )}
        {/* Only meaningful next to a named reviewer. A review date with nobody
            behind it is a claim the site cannot support. */}
        {reviewer && reviewedAt && (
          <span>
            Last reviewed <time dateTime={reviewedAt}>{formatArticleDate(reviewedAt)}</time>
          </span>
        )}
      </div>
    </div>
  );
}
