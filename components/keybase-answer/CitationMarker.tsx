"use client";

import { Fragment, type ReactNode } from "react";

import { revealText } from "@/lib/keybase-answer/typing";
import type { AnswerSource } from "@/lib/keybase-answer/types";

/**
 * Inline citations.
 *
 * A marker is a real button, not a superscript with a click handler, so it is
 * reachable by keyboard and announced as a control. Activating one moves focus
 * to the matching source card and highlights it — a reader who wants to check a
 * claim should not have to hunt for the source that supports it.
 *
 * Markers only ever appear for sources that survived citation validation; a
 * number with nothing behind it is stripped before the text reaches here.
 */

export function sourceElementId(marker: number): string {
  return `keybase-answer-source-${marker}`;
}

export function CitationMarker({
  marker,
  title,
}: {
  marker: number;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        const target = document.getElementById(sourceElementId(marker));
        if (!target) return;
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.focus({ preventScroll: true });
      }}
      aria-label={`Source ${marker}: ${title}`}
      className="mx-[1px] inline-flex min-w-[1.15rem] translate-y-[-0.35em] justify-center rounded-[4px] bg-[#006d6e]/10 px-[3px] align-baseline text-[0.62em] font-semibold leading-[1.5] text-[#006d6e] transition-colors hover:bg-[#006d6e]/20 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#006d6e]"
    >
      {marker}
    </button>
  );
}

/**
 * Prose with its `[n]` markers turned into {@link CitationMarker} controls.
 * Paragraph breaks in the model's plain text become real paragraphs.
 *
 * `maxChars` reveals only the leading characters, for the typewriter; `caret`
 * parks a blinking rule at the end of the last visible paragraph.
 */
export function CitedText({
  text,
  sources,
  className = "",
  maxChars,
  caret = false,
}: {
  text: string;
  sources: AnswerSource[];
  className?: string;
  maxChars?: number;
  caret?: boolean;
}) {
  const byMarker = new Map(sources.map((source) => [source.marker, source]));

  const paragraphs = revealText(text, maxChars)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  // Nothing typed yet: render the caret alone so the block still has a line of
  // height and the answer does not jump as the first character lands.
  if (paragraphs.length === 0) {
    return caret ? (
      <p className={className}>
        <span className="ka-caret" aria-hidden="true" />
      </p>
    ) : null;
  }

  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={className}>
          {paragraph.split(/(\[\d{1,2}\])/g).map((part, i): ReactNode => {
            const match = /^\[(\d{1,2})\]$/.exec(part);
            if (!match) return <Fragment key={i}>{part}</Fragment>;
            const source = byMarker.get(Number(match[1]));
            if (!source) return null;
            return (
              <CitationMarker
                key={i}
                marker={source.marker}
                title={source.title}
              />
            );
          })}
          {caret && index === paragraphs.length - 1 && (
            <span className="ka-caret" aria-hidden="true" />
          )}
        </p>
      ))}
    </>
  );
}
