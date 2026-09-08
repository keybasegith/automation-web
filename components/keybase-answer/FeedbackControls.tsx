"use client";

import { useState } from "react";

import { ANSWER_PAGE_COPY } from "@/lib/keybase-answer/copy";
import type { KeybaseAnswerResult } from "@/lib/keybase-answer/types";

/**
 * "Was this helpful?"
 *
 * What is sent is the response id, the question's hash, the verdict, and the
 * source ids — never the question itself, and never the model, which the
 * feedback route reads from its own configuration rather than trusting a
 * browser to name. The hash is computed server-side and handed back with the
 * result, so feedback ties to the answer without the question travelling twice.
 */
export default function FeedbackControls({
  result,
}: {
  result: KeybaseAnswerResult;
}) {
  const [sent, setSent] = useState<null | boolean>(null);
  const [failed, setFailed] = useState(false);

  const submit = async (helpful: boolean) => {
    setSent(helpful);
    try {
      const response = await fetch("/api/keybase-answer/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          responseId: result.responseId,
          questionHash: result.questionHash,
          helpful,
          sourceIds: result.sources.map((source) => source.id),
        }),
      });
      if (!response.ok) setFailed(true);
    } catch {
      setFailed(true);
    }
  };

  if (sent !== null && !failed) {
    return (
      <p role="status" className="text-[14px] text-[#5b6573]">
        {ANSWER_PAGE_COPY.feedbackThanks}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <p id="keybase-answer-feedback-label" className="text-[14px] text-[#5b6573]">
        {ANSWER_PAGE_COPY.feedbackPrompt}
      </p>
      <div
        role="group"
        aria-labelledby="keybase-answer-feedback-label"
        className="flex items-center gap-2"
      >
        {[
          { label: "Yes", helpful: true },
          { label: "No", helpful: false },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => void submit(option.helpful)}
            className="rounded-full border border-black/[0.09] bg-white px-5 py-2 text-[13px] font-medium text-[#3d4855] transition-all duration-300 hover:border-[#006d6e]/35 hover:text-[#0a1f33] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006d6e]"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
