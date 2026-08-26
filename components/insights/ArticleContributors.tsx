import Link from "next/link";
import { resolvePerson } from "@/lib/people/leadership";
import { isProfileReady, profilePath } from "@/lib/people/people";
import type { PersonProfile } from "@/lib/people/types";
import type { InsightArticle } from "@/lib/insights/types";
import PersonPortrait from "@/components/people/PersonPortrait";

/**
 * The short "about the author" note at the foot of a long-form piece.
 *
 * Optional by design: a company announcement or a two-paragraph market note
 * does not need one, so the article page decides whether to render it. It shows
 * only what the person record already holds — portrait, name, title, and the
 * one-line introduction — and a person with no introduction to show is skipped
 * rather than padded out. The biography itself lives on the profile, not
 * duplicated into every article the person writes.
 */
async function contributors(article: InsightArticle) {
  const ids = [article.authorId, article.reviewerId].filter(
    (id, index, all): id is string => Boolean(id) && all.indexOf(id) === index,
  );

  const people = await Promise.all(
    ids.map(async (id) => {
      const person = await resolvePerson(id);
      if (!person?.shortBio) return null;
      const roles: string[] = [];
      if (id === article.authorId) roles.push("Author");
      if (id === article.reviewerId) roles.push("Reviewer");
      return { person, roles };
    }),
  );

  return people.filter((entry): entry is { person: PersonProfile; roles: string[] } =>
    Boolean(entry),
  );
}

export default async function ArticleContributors({
  article,
}: {
  article: InsightArticle;
}) {
  const entries = await contributors(article);
  if (entries.length === 0) return null;

  return (
    <section
      aria-labelledby="article-contributors"
      className="mt-14 border-t border-black/10 pt-10"
    >
      <h2
        id="article-contributors"
        className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]"
      >
        {entries.length > 1 ? "Contributors" : "About the Author"}
      </h2>

      <ul className="mt-6 space-y-8">
        {entries.map(({ person, roles }) => {
          const href = isProfileReady(person) ? profilePath(person.id) : undefined;
          return (
            <li key={person.id} className="flex flex-col gap-5 sm:flex-row sm:gap-6">
              {person.image && (
                <PersonPortrait
                  image={person.image}
                  sizes="96px"
                  ratio="aspect-square"
                  className="w-24 shrink-0 rounded-full"
                />
              )}
              <div className="max-w-2xl">
                {entries.length > 1 && (
                  <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#006d6e]">
                    {roles.join(" and ")}
                  </p>
                )}
                <p className="mt-1 font-serif text-[22px] font-normal text-[#0a1f33]">
                  {href ? (
                    <Link
                      href={href}
                      className="transition-colors hover:text-[#006d6e] focus-visible:text-[#006d6e]"
                    >
                      {person.name}
                    </Link>
                  ) : (
                    person.name
                  )}
                </p>
                {person.role && (
                  <p className="mt-1 text-[14px] text-[#7a828d]">{person.role}</p>
                )}
                <p className="mt-3 text-[15px] leading-relaxed text-[#5b6573]">
                  {person.shortBio}
                </p>
                {href && (
                  <Link
                    href={href}
                    className="mt-3 inline-block text-[14px] font-semibold text-[#006d6e] underline decoration-[#006d6e]/30 underline-offset-4 transition-colors hover:text-[#0a1f33]"
                  >
                    Read full profile
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
