"use client";

import KeybaseAnswerMark from "@/components/keybase-answer/KeybaseAnswerMark";
import { GENERATING_COPY } from "@/lib/keybase-answer/copy";
import type { AnswerStage } from "@/lib/keybase-answer/types";

/**
 * What the server is doing, while it is doing it.
 *
 * Every line here corresponds to a stage the pipeline has actually entered —
 * the source count is the number of sources that cleared the evidence
 * threshold, not a number chosen to look like progress. There is no fourth
 * invented stage and no progress bar pretending to know how long generation
 * will take.
 *
 * The block reserves its own height so the answer does not shift the page when
 * it arrives.
 */
export default function GeneratingState({ stage }: { stage: AnswerStage | null }) {
  const label =
    stage === null
      ? GENERATING_COPY.retrieving
      : stage.stage === "retrieving"
        ? GENERATING_COPY.retrieving
        : stage.stage === "reviewing"
          ? GENERATING_COPY.reviewing(stage.sourceCount)
          : GENERATING_COPY.generating;

  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-5 py-10 text-center">
      <span
        data-motion="running"
        className="text-[#006d6e]"
        aria-hidden="true"
      >
        <span className="ka-breathe block">
          <KeybaseAnswerMark size={38} />
        </span>
      </span>
      <p
        role="status"
        aria-live="polite"
        className="text-[15px] text-[#5b6573] transition-opacity duration-500"
      >
        {label}
      </p>
    </div>
  );
}
