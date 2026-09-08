"use client";

import { ANSWER_PAGE_COPY } from "@/lib/keybase-answer/copy";

/**
 * Follow-ups the sources could also answer.
 *
 * Selecting one starts a fresh, independent query — there is no thread here,
 * and the new question is not answered "in light of" the last one.
 */
export default function RelatedQuestions({
  questions,
  onSelect,
  disabled = false,
}: {
  questions: string[];
  onSelect: (question: string) => void;
  disabled?: boolean;
}) {
  if (questions.length === 0) return null;

  return (
    <section
      aria-labelledby="keybase-answer-related-questions"
      className="border-t border-black/[0.08] pt-8 sm:pt-10"
    >
      <h2
        id="keybase-answer-related-questions"
        className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#0a1f33]"
      >
        {ANSWER_PAGE_COPY.relatedQuestionsHeading}
      </h2>
      <ul className="mt-4 flex flex-wrap gap-3">
        {questions.map((question) => (
          <li key={question}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(question)}
              className="rounded-full border border-black/[0.09] bg-white px-5 py-3 text-left text-[14px] leading-snug text-[#3d4855] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#006d6e]/30 hover:text-[#0a1f33] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006d6e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {question}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
