"use client";

import SourceCard from "@/components/keybase-answer/SourceCard";
import { ANSWER_PAGE_COPY } from "@/lib/keybase-answer/copy";
import type { AnswerSource } from "@/lib/keybase-answer/types";

/** The sources an answer was built from. Nothing is listed that was not cited. */
export default function SourceList({ sources }: { sources: AnswerSource[] }) {
  if (sources.length === 0) return null;

  return (
    <section aria-labelledby="keybase-answer-sources" className="border-t border-black/[0.08] pt-8 sm:pt-10">
      <h2
        id="keybase-answer-sources"
        className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#0a1f33]"
      >
        {ANSWER_PAGE_COPY.sourcesHeading}
      </h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sources.map((source) => (
          <SourceCard key={source.id} source={source} />
        ))}
      </ul>
    </section>
  );
}
