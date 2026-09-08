"use client";

import NewQuestionButton from "@/components/keybase-answer/NewQuestionButton";
import { ANSWER_PAGE_COPY, RATE_LIMIT_COPY } from "@/lib/keybase-answer/copy";

/** The hourly limit, reached. The page stays usable; it just cannot ask again yet. */
export default function RateLimitState({ onReset }: { onReset: () => void }) {
  return (
    <div className="ka-reveal" role="status">
      <h1 className="max-w-[38rem] font-serif text-[26px] font-normal leading-[1.24] text-[#0a1f33] sm:text-[32px]">
        {RATE_LIMIT_COPY.heading}
      </h1>
      <p className="mt-4 text-[17px] leading-relaxed text-[#5b6573]">
        {RATE_LIMIT_COPY.body}
      </p>
      <div className="mt-10">
        <NewQuestionButton label={ANSWER_PAGE_COPY.newQuestionLabel} onClick={onReset} />
      </div>
    </div>
  );
}
