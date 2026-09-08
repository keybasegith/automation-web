"use client";

import { ANSWER_PAGE_COPY, ERROR_COPY } from "@/lib/keybase-answer/copy";

/**
 * The failure state.
 *
 * Says what happened and offers to try again. It never shows the provider's
 * message, an HTTP status, a request id, or anything about how the feature is
 * configured — all of which stay in the server log where an operator can use
 * them.
 */
export default function AnswerError({
  message,
  onRetry,
  onReset,
}: {
  message?: string;
  onRetry: () => void;
  onReset: () => void;
}) {
  return (
    <div className="ka-reveal" role="alert">
      <h1 className="max-w-[38rem] font-serif text-[26px] font-normal leading-[1.24] text-[#0a1f33] sm:text-[32px]">
        {message || ERROR_COPY.heading}
      </h1>
      <div className="mt-10 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-3 rounded-full bg-[#0a1f33] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0e2a45] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006d6e]"
        >
          {ANSWER_PAGE_COPY.tryAgainLabel}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="text-[13px] font-medium text-[#5b6573] underline-offset-4 transition-colors hover:text-[#006d6e] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006d6e]"
        >
          {ANSWER_PAGE_COPY.askAnotherLabel}
        </button>
      </div>
    </div>
  );
}
