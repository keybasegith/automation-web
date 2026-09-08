"use client";

import type { SuggestedQuestion } from "@/config/keybase-answer";

/**
 * The curated prompts.
 *
 * Long, quiet rows: the whole row is one button, the question sits at the left
 * on a generous line height, and the only ornament is an arrow that arrives on
 * hover. No icons — each row already says what it is.
 *
 * A suggested prompt is not a shortcut to a canned page. It goes through the
 * same engine as a typed question; it is simply likely to have been warmed into
 * the answer cache already, which is why it usually returns immediately.
 */
export default function SuggestedFinancialQuestions({
  questions,
  onSelect,
  disabled = false,
}: {
  questions: SuggestedQuestion[];
  onSelect: (question: SuggestedQuestion) => void;
  disabled?: boolean;
}) {
  if (questions.length === 0) return null;

  return (
    <ul className="space-y-3 sm:space-y-3.5">
      {questions.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect(item)}
            className="group flex w-full items-center justify-between gap-5 rounded-2xl border border-black/[0.06] bg-white px-6 py-5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.03),0_6px_18px_rgba(15,23,42,0.035)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#006d6e]/22 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_32px_rgba(15,23,42,0.07)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006d6e] disabled:cursor-not-allowed disabled:opacity-60 sm:px-8 sm:py-6"
          >
            <span className="text-[16px] leading-[1.5] text-[#1f2a37] sm:text-[18px]">
              {item.question}
            </span>
            <span
              aria-hidden="true"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#8a93a0] transition-all duration-300 group-hover:bg-[#006d6e]/8 group-hover:text-[#006d6e]"
            >
              <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 7h11M8.5 3.5L12 7l-3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
