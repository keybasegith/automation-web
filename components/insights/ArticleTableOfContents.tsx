import type { TocEntry } from "@/lib/insights/articles";

/**
 * Anchor links to the article's own headings.
 *
 * A plain <nav> of ordinary links — server-rendered, keyboard-operable because
 * links already are, and functional with JavaScript disabled. Only rendered for
 * articles long enough to need it.
 */
export default function ArticleTableOfContents({ entries }: { entries: TocEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <nav
      aria-labelledby="on-this-page"
      className="my-12 border-y border-black/10 py-7"
    >
      <h2
        id="on-this-page"
        className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]"
      >
        On This Page
      </h2>
      <ol className="mt-5 space-y-2.5">
        {entries.map((entry) => (
          <li key={entry.id} className={entry.level === 3 ? "pl-5" : undefined}>
            <a
              href={`#${entry.id}`}
              className="text-[16px] leading-snug text-[#5b6573] underline decoration-transparent underline-offset-4 transition-colors hover:text-[#006d6e] hover:decoration-[#006d6e] focus-visible:text-[#006d6e]"
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
