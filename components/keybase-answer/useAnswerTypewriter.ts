"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { typingDurationMs } from "@/lib/keybase-answer/typing";

/**
 * The typewriter that writes a finished answer out on screen.
 *
 * WHY THIS TYPES ALREADY-VALIDATED TEXT rather than piping model tokens
 * straight to the browser: an answer is only trustworthy after
 * `validateCitations` has run over the whole payload. Until then it may carry
 * internal `SRC_00n` handles and citations that refer to nothing, and the
 * server has not yet swapped those for real Keybase titles and URLs. Streaming
 * raw tokens would put that unchecked text in front of a reader, which for a
 * page making financial claims is the one thing this feature is built not to
 * do. So the network stream reports *progress* while the answer is being
 * written, and this types out the result once it has been checked.
 *
 * Blocks are typed in sequence — the summary, then each section's body — over a
 * single character counter, so a caller can ask "how much of block i is
 * visible?" and "has block i started?" without coordinating several timers.
 *
 * The pace is time-based rather than per-frame, so it is identical on a 60Hz
 * and a 120Hz display, and it compresses for long answers: a short answer types
 * at a readable clip, a long one still finishes inside a few seconds.
 */

function prefersReducedMotion(): boolean {
  // Treat a non-browser render as "no animation": the whole answer should be
  // present in the markup, never an empty shell waiting for a timer.
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface Typewriter {
  /** Characters typed so far, across every block. */
  typed: number;
  /** How much of block `index` is visible. */
  visible: (index: number) => number;
  /** Whether block `index` has begun, and so should be on screen at all. */
  started: (index: number) => boolean;
  /** True once everything has been written. */
  done: boolean;
  /** True while the animation is actually running (false under reduced motion). */
  typing: boolean;
  /** Finish immediately. Wired to the skip control. */
  finish: () => void;
}

export function useAnswerTypewriter(blocks: string[], resetKey: string): Typewriter {
  const lengths = blocks.map((block) => block.length);
  const total = lengths.reduce((sum, length) => sum + length, 0);

  // Offsets into the concatenation, so a block can locate itself in `typed`.
  const offsets: number[] = [];
  let running = 0;
  for (const length of lengths) {
    offsets.push(running);
    running += length;
  }

  const [typed, setTyped] = useState(() => (prefersReducedMotion() ? total : 0));
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    finishedRef.current = true;
    setTyped(total);
  }, [total]);

  useEffect(() => {
    finishedRef.current = false;
    if (total === 0 || prefersReducedMotion()) {
      setTyped(total);
      return;
    }

    const duration = typingDurationMs(total);
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      if (finishedRef.current) return;
      const progress = Math.min(1, (now - start) / duration);
      setTyped(Math.round(progress * total));
      if (progress < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
    // resetKey restarts the animation for a new answer; `typed` is deliberately
    // not a dependency, or every character would tear down its own timer.
  }, [total, resetKey]);

  return {
    typed,
    visible: (index) =>
      Math.min(lengths[index] ?? 0, Math.max(0, typed - (offsets[index] ?? 0))),
    // A block with nothing typed yet stays out of the document entirely, so an
    // empty heading never sits above an empty paragraph.
    started: (index) => typed > (offsets[index] ?? 0) || total === 0,
    done: typed >= total,
    typing: typed < total,
    finish,
  };
}
