"use client";

import { useEffect, useRef } from "react";

const DURATION = 1600; // ms

// easeOutCubic — fast start, gentle settle.
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

export type StatValueProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  /** Thousands separators. Turn off for figures like a year. */
  grouping?: boolean;
};

/** Deterministic grouping, so the server and the browser format identically. */
const format = (n: number, grouping: boolean) =>
  grouping ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : String(n);

/**
 * The numeric half of a stat. The true figure is what renders — on the server,
 * and on the client's first render too — so it is in the initial HTML and in
 * the accessibility tree from the start. The count-up is layered on afterwards
 * by writing straight to the text node rather than through state: React never
 * re-renders this text, so there is nothing for hydration to disagree about and
 * no chance of the DOM being left holding a placeholder. Assistive tech reads
 * the visually hidden copy, so intermediate values are never announced, and the
 * animation is skipped entirely under `prefers-reduced-motion`.
 */
export default function StatValue({
  value,
  prefix = "",
  suffix = "",
  grouping = true,
}: StatValueProps) {
  const ref = useRef<HTMLSpanElement>(null);

  const final = format(value, grouping);

  // Count up once the figure scrolls into view, matching the reveal beside it.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const step = (ts: number, startTs = ts) => {
      const progress = Math.min((ts - startTs) / DURATION, 1);
      el.textContent =
        progress < 1 ? format(Math.round(ease(progress) * value), grouping) : final;
      if (progress < 1) raf = requestAnimationFrame((next) => step(next, startTs));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        raf = requestAnimationFrame((ts) => step(ts));
      },
      { threshold: 0.3 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      // Never leave a half-counted figure behind.
      el.textContent = final;
    };
  }, [value, grouping, final]);

  return (
    <>
      <span className="sr-only">{`${prefix}${final}${suffix}`}</span>
      <span aria-hidden="true">
        {prefix && (
          <span className="align-top text-3xl sm:text-4xl">{prefix}</span>
        )}
        <span ref={ref}>{final}</span>
        {suffix}
      </span>
    </>
  );
}
