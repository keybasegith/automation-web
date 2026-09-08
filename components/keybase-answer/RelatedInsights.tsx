"use client";

import Link from "next/link";

import { ANSWER_PAGE_COPY } from "@/lib/keybase-answer/copy";
import { trackClientEvent } from "@/lib/keybase-answer/client-analytics";
import type { RelatedInsight } from "@/lib/keybase-answer/types";

/**
 * Further reading.
 *
 * Drawn from what retrieval found, never from a model's idea of what Keybase
 * has published — asking a model to name articles is precisely the question it
 * answers plausibly and wrongly.
 */
export default function RelatedInsights({ insights }: { insights: RelatedInsight[] }) {
  if (insights.length === 0) return null;

  return (
    <section
      aria-labelledby="keybase-answer-related"
      className="border-t border-black/[0.08] pt-8 sm:pt-10"
    >
      <h2
        id="keybase-answer-related"
        className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#0a1f33]"
      >
        {ANSWER_PAGE_COPY.relatedHeading}
      </h2>
      <ul className="mt-4">
        {insights.map((insight, i) => (
          <li key={insight.url}>
            <Link
              href={insight.url}
              onClick={() =>
                trackClientEvent("keybase_answer_source_click", {
                  sourceUrl: insight.url,
                  surface: "related",
                  position: i + 1,
                })
              }
              className={`group flex items-center justify-between gap-6 py-5 transition-colors ${
                i > 0 ? "border-t border-black/[0.06]" : ""
              }`}
            >
              <span>
                <span className="block text-[12px] uppercase tracking-[0.14em] text-[#8a93a0]">
                  {insight.category}
                </span>
                <span className="mt-2 block font-serif text-[19px] font-normal leading-snug text-[#0a1f33] transition-colors duration-300 group-hover:text-[#006d6e] sm:text-[21px]">
                  {insight.title}
                </span>
              </span>
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#0a1f33]/15 text-[#0a1f33] transition-all duration-300 group-hover:border-[#006d6e] group-hover:bg-[#006d6e] group-hover:text-white">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path
                    d="M1 7h11M8.5 3.5L12 7l-3.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
