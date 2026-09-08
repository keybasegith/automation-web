"use client";

import Link from "next/link";

import { sourceElementId } from "@/components/keybase-answer/CitationMarker";
import { ANSWER_PAGE_COPY } from "@/lib/keybase-answer/copy";
import { trackClientEvent } from "@/lib/keybase-answer/client-analytics";
import type { AnswerSource } from "@/lib/keybase-answer/types";

/**
 * One source behind an answer.
 *
 * Everything on this card comes from the knowledge index — the real title, the
 * real Keybase path, the real publication date. None of it was produced by a
 * model: the model only ever returned an opaque id, which the server checked
 * against what retrieval supplied before any of this was assembled.
 */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Formatted by hand rather than through toLocaleDateString, for the reason the
 * newsroom does the same: locale formatting makes the rendered date depend on
 * the renderer's timezone, which is how a server date ends up a day off the
 * client's.
 */
function formatDate(iso: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const [, year, month, day] = match;
  const name = MONTHS[Number(month) - 1];
  return name ? `${name} ${Number(day)}, ${year}` : null;
}

export default function SourceCard({ source }: { source: AnswerSource }) {
  const date = source.publishedAt ? formatDate(source.publishedAt) : null;

  return (
    <li>
      <Link
        id={sourceElementId(source.marker)}
        href={source.url}
        tabIndex={0}
        onClick={() =>
          trackClientEvent("keybase_answer_source_click", {
            sourceId: source.id,
            sourceUrl: source.url,
            position: source.marker,
          })
        }
        className="group flex h-full flex-col rounded-2xl border border-black/[0.07] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#006d6e]/25 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_rgba(15,23,42,0.07)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006d6e] target:border-[#006d6e]/50"
      >
        <span className="flex items-baseline gap-2.5">
          <span className="font-mono text-[12px] font-medium tabular-nums text-[#006d6e]">
            {String(source.marker).padStart(2, "0")}
          </span>
          <span className="text-[12px] uppercase tracking-[0.14em] text-[#8a93a0]">
            {source.category}
          </span>
        </span>

        <span className="mt-3 block font-serif text-[19px] font-normal leading-snug text-[#0a1f33] transition-colors duration-300 group-hover:text-[#006d6e]">
          {source.title}
        </span>

        <span className="mt-auto flex items-end justify-between gap-4 pt-6">
          <span className="text-[13px] leading-relaxed text-[#5b6573]">
            {ANSWER_PAGE_COPY.attribution}
            {date && (
              <>
                <br />
                <time dateTime={source.publishedAt}>{date}</time>
              </>
            )}
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
        </span>
      </Link>
    </li>
  );
}
