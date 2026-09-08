"use client";

import { CitedText } from "@/components/keybase-answer/CitationMarker";
import type { AnswerSection, AnswerSource } from "@/lib/keybase-answer/types";

/**
 * One numbered part of an answer.
 *
 * Set as research, not as chat: an index number in the margin, a short heading
 * in the house serif, and the prose on a narrow measure. The rule above each
 * section does the separating, so the blocks need no cards or borders of their
 * own.
 *
 * `maxChars` and `caret` are the typewriter's: the heading lands whole the
 * moment the section begins, and the body writes itself underneath.
 */
export default function FinancialAnswerSection({
  index,
  section,
  sources,
  maxChars,
  caret = false,
}: {
  index: number;
  section: AnswerSection;
  sources: AnswerSource[];
  maxChars?: number;
  caret?: boolean;
}) {
  return (
    <section className="grid gap-3 border-t border-black/[0.08] pt-8 sm:grid-cols-[64px_1fr] sm:gap-8 sm:pt-10">
      <p
        aria-hidden="true"
        className="font-mono text-[13px] font-medium tabular-nums tracking-[0.12em] text-[#006d6e]"
      >
        {String(index).padStart(2, "0")}
      </p>
      <div>
        <h2 className="font-serif text-[22px] font-normal leading-snug text-[#0a1f33] sm:text-[26px]">
          {section.heading}
        </h2>
        <div className="mt-4 space-y-4">
          <CitedText
            text={section.body}
            sources={sources}
            maxChars={maxChars}
            caret={caret}
            className="text-[16px] leading-[1.72] text-[#3d4855] sm:text-[17px]"
          />
        </div>
      </div>
    </section>
  );
}
