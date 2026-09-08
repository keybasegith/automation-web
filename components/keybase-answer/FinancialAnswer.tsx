"use client";

import { CitedText } from "@/components/keybase-answer/CitationMarker";
import FeedbackControls from "@/components/keybase-answer/FeedbackControls";
import FinancialAnswerSection from "@/components/keybase-answer/FinancialAnswerSection";
import FinancialDisclaimer from "@/components/keybase-answer/FinancialDisclaimer";
import KeybaseAnswerMark from "@/components/keybase-answer/KeybaseAnswerMark";
import NewQuestionButton from "@/components/keybase-answer/NewQuestionButton";
import RelatedInsights from "@/components/keybase-answer/RelatedInsights";
import RelatedQuestions from "@/components/keybase-answer/RelatedQuestions";
import SourceList from "@/components/keybase-answer/SourceList";
import { useAnswerTypewriter } from "@/components/keybase-answer/useAnswerTypewriter";
import { ANSWER_PAGE_COPY, GENERATING_COPY } from "@/lib/keybase-answer/copy";
import type { KeybaseAnswerResult } from "@/lib/keybase-answer/types";

/**
 * A completed answer.
 *
 * Set as research: the reader's question as the headline, a summary in the
 * house serif at a size that invites reading, then numbered sections, then the
 * sources it was built from. No bubbles, no avatar, no sender, nothing that
 * suggests a correspondent on the other side — the page is publishing a short
 * piece of research, not replying to a message.
 *
 * The prose writes itself out on arrival (see useAnswerTypewriter for why it
 * types validated text rather than raw model tokens). Three consequences worth
 * naming:
 *
 *   - The sources, further reading, disclaimer, and controls are held back
 *     until the writing finishes, the way a citation list lands at the end of a
 *     piece rather than assembling itself alongside it.
 *   - A skip control is always offered. Nobody should have to wait to read
 *     something the browser already has.
 *   - Assistive technology is given the finished text immediately, in one
 *     block, while the animated copy is hidden from it. A screen reader
 *     encountering a half-typed paragraph — or being interrupted on every
 *     frame — would be strictly worse off for the effect.
 */
export default function FinancialAnswer({
  result,
  onReset,
  onAskRelated,
  busy = false,
}: {
  result: KeybaseAnswerResult;
  onReset: () => void;
  onAskRelated: (question: string) => void;
  busy?: boolean;
}) {
  // One counter across the summary and every section body, in reading order.
  const blocks = [result.summary, ...result.sections.map((section) => section.body)];
  const typewriter = useAnswerTypewriter(blocks, result.responseId);

  return (
    <article className="ka-reveal">
      {/* The question, billed as the headline of the piece. */}
      <h1 className="max-w-[46rem] font-serif text-[30px] font-normal leading-[1.16] tracking-tight text-[#0a1f33] sm:text-[40px] lg:text-[44px]">
        {result.question}
      </h1>

      {/* The whole answer, at once, for anything that reads rather than looks. */}
      {typewriter.typing && (
        <div className="sr-only">
          {blocks.filter(Boolean).map((block, i) => (
            <p key={i}>{block}</p>
          ))}
        </div>
      )}

      <div aria-hidden={typewriter.typing || undefined}>
        {/* The answer proper. */}
        <div className="mt-12 sm:mt-14">
          <p className="flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#006d6e]">
            <KeybaseAnswerMark size={18} />
            {ANSWER_PAGE_COPY.title}
          </p>
          <div className="mt-5 max-w-[46rem] space-y-5">
            <CitedText
              text={result.summary}
              sources={result.sources}
              maxChars={typewriter.visible(0)}
              caret={typewriter.typing && typewriter.visible(0) < result.summary.length}
              className="font-serif text-[20px] leading-[1.6] text-[#1f2a37] sm:text-[23px]"
            />
          </div>
        </div>

        {result.sections.length > 0 && (
          <div className="mt-12 space-y-8 sm:mt-14 sm:space-y-10">
            {result.sections.map((section, i) => {
              // Block 0 is the summary, so section i lives at block i + 1.
              const block = i + 1;
              if (!typewriter.started(block)) return null;
              const shown = typewriter.visible(block);
              return (
                <FinancialAnswerSection
                  key={`${section.heading}-${i}`}
                  index={i + 1}
                  section={section}
                  sources={result.sources}
                  maxChars={shown}
                  caret={typewriter.typing && shown < section.body.length}
                />
              );
            })}
          </div>
        )}
      </div>

      {typewriter.typing ? (
        <div className="mt-10">
          <button
            type="button"
            onClick={typewriter.finish}
            className="text-[13px] font-medium text-[#5b6573] underline-offset-4 transition-colors hover:text-[#006d6e] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006d6e]"
          >
            {ANSWER_PAGE_COPY.skipTypingLabel}
          </button>
        </div>
      ) : (
        <div className="mt-12 space-y-10 sm:mt-14 sm:space-y-12">
          {/* Announced once, when there is something complete to read. */}
          <p role="status" className="sr-only">
            {GENERATING_COPY.done}
          </p>

          <SourceList sources={result.sources} />
          <RelatedInsights insights={result.relatedInsights} />
          <RelatedQuestions
            questions={result.relatedQuestions}
            onSelect={onAskRelated}
            disabled={busy}
          />
          <FinancialDisclaimer text={result.disclaimer} />

          <div className="flex flex-wrap items-center justify-between gap-6 border-t border-black/[0.08] pt-8">
            <FeedbackControls result={result} />
            <NewQuestionButton
              label={ANSWER_PAGE_COPY.newQuestionLabel}
              onClick={onReset}
            />
          </div>
        </div>
      )}
    </article>
  );
}
