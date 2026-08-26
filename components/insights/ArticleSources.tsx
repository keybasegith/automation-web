import { ExternalLink } from "lucide-react";
import type { ArticleSource } from "@/lib/insights/types";

/**
 * The references an article cites, listed once at the end rather than scattered
 * through the prose as numbered markers.
 *
 * Nothing is generated: the list renders exactly what the article record
 * declares, and an article citing nothing renders nothing here. Suitable for
 * the sources financial writing actually leans on — the CRA, Government of
 * Canada, Bank of Canada, CIRO, Statistics Canada, provincial regulators —
 * though none is ever added automatically.
 */
export default function ArticleSources({ sources }: { sources: ArticleSource[] }) {
  if (sources.length === 0) return null;

  return (
    <section aria-labelledby="sources" className="mt-14 border-t border-black/10 pt-8">
      <h2
        id="sources"
        className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]"
      >
        Sources
      </h2>
      <ul className="mt-5 space-y-4">
        {sources.map((source) => (
          <li
            key={source.url ?? `${source.label}: ${source.title}`}
            className="text-[15px] leading-relaxed"
          >
            <span className="font-semibold text-[#0a1f33]">{source.label}</span>
            <span className="text-[#5b6573]">, </span>
            {/* A citation with no verified permanent link is still a citation.
                It reads as plain text rather than linking somewhere invented. */}
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-baseline gap-1 text-[#5b6573] underline decoration-[#5b6573]/30 underline-offset-4 transition-colors hover:text-[#006d6e] hover:decoration-[#006d6e]"
              >
                {source.title}
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 self-center" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : (
              <span className="text-[#5b6573]">{source.title}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
