"use client";

import NewQuestionButton from "@/components/keybase-answer/NewQuestionButton";
import RelatedInsights from "@/components/keybase-answer/RelatedInsights";
import { ANSWER_PAGE_COPY, NO_ANSWER_COPY } from "@/lib/keybase-answer/copy";
import type { KeybaseAnswerResult } from "@/lib/keybase-answer/types";

/**
 * The honest empty state.
 *
 * This is what the feature does instead of answering from a model's memory
 * when Keybase has published nothing that supports the question. It is a
 * deliberate outcome, not a failure, so it is written and set as one: the
 * reason, what the corpus does cover, and a way back.
 */
export default function InsufficientEvidence({
  result,
  onReset,
}: {
  result: KeybaseAnswerResult;
  onReset: () => void;
}) {
  return (
    <div className="ka-reveal">
      <h1 className="max-w-[42rem] font-serif text-[26px] font-normal leading-[1.24] text-[#0a1f33] sm:text-[32px]">
        {result.summary || NO_ANSWER_COPY.heading}
      </h1>

      <p className="mt-8 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#0a1f33]">
        {NO_ANSWER_COPY.tryPrompt}
      </p>
      <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-2.5">
        {NO_ANSWER_COPY.topics.map((topic) => (
          <li
            key={topic}
            className="flex items-center gap-2.5 text-[16px] text-[#3d4855]"
          >
            <span className="h-1 w-1 rounded-full bg-[#006d6e]" aria-hidden="true" />
            {topic}
          </li>
        ))}
      </ul>

      <div className="mt-10">
        <NewQuestionButton label={ANSWER_PAGE_COPY.askAnotherLabel} onClick={onReset} />
      </div>

      {result.relatedInsights.length > 0 && (
        <div className="mt-12">
          <RelatedInsights insights={result.relatedInsights} />
        </div>
      )}
    </div>
  );
}
