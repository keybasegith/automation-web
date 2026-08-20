"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";
import { TRIP } from "@/lib/mexico-trip/config";
import { Countdown } from "./Countdown";
import { PrimaryButton, SEA_GRADIENT } from "./ui";

/** How long each hero photo holds before the next one fades in. */
const SLIDE_MS = 3000;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Live `prefers-reduced-motion` reading. Server-rendered as `false` so the
 * markup matches the animated default, then corrected on hydration.
 */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

export function Hero() {
  const [index, setIndex] = useState(0);
  // The photos are optional scenery, not load-bearing: any file that is
  // missing or unreadable drops out of the rotation, and if none survive the
  // sea gradient underneath carries the hero on its own.
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  // Mirrors the gallery slider: readers who ask for reduced motion get the
  // first photo, held still, instead of a rotation they didn't ask for.
  const reducedMotion = usePrefersReducedMotion();

  const photos = useMemo(
    () => TRIP.heroPhotos.filter((src) => !failed.has(src)),
    [failed],
  );

  // Derived rather than clamped in an effect: if failed photos shrink the
  // list under the current position, we fall back to the first slide and the
  // next tick's modulo keeps the rotation consistent from there.
  const current = index < photos.length ? index : 0;

  useEffect(() => {
    if (reducedMotion || photos.length < 2) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      setIndex((i) => (i + 1) % photos.length);
    }, SLIDE_MS);
    return () => clearInterval(id);
  }, [reducedMotion, photos.length]);

  return (
    <section
      className="relative flex min-h-[100svh] flex-col overflow-hidden"
      style={{ background: SEA_GRADIENT }}
    >
      {/* Cross-fading photo stack. Every slide stays mounted so the outgoing
          frame can fade under the incoming one rather than blinking out. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {photos.map((src, i) => (
          /* Plain <img>: next/image would 400 on a file that isn't uploaded
             yet instead of firing onError with the raw path. */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={src}
            src={src}
            alt=""
            loading={i === 0 ? "eager" : "lazy"}
            draggable={false}
            onError={() => setFailed((prev) => new Set(prev).add(src))}
            className="absolute inset-0 h-full w-full select-none object-cover transition-[opacity,transform] ease-out"
            style={{
              opacity: i === current ? 1 : 0,
              // Slow push-in on the visible frame; the reset happens while
              // the slide is invisible, so the drift never reads as a snap.
              transform: reducedMotion
                ? undefined
                : `scale(${i === current ? 1.1 : 1.02})`,
              transitionDuration: reducedMotion
                ? "0s"
                : i === current
                  ? "1200ms, 7000ms"
                  : "1200ms",
            }}
          />
        ))}
      </div>

      {/* One quiet scrim, heavier at the base where the text sits. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(9,28,45,0.45) 0%, rgba(9,28,45,0.06) 38%, rgba(8,26,42,0.32) 68%, rgba(6,20,36,0.82) 100%)",
        }}
        aria-hidden
      />

      {/* Top bar */}
      <div className="relative border-b border-white/15">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <span className="font-franklin text-sm font-semibold tracking-[0.18em] text-white">
            KEYBASE FINANCIAL GROUP
          </span>
          <span className="hidden text-xs font-medium uppercase tracking-[0.22em] text-white/70 sm:block">
            {TRIP.region} · Mexico
          </span>
        </div>
      </div>

      {/* Headline block — anchored low, editorial left alignment. */}
      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-5 pb-20 pt-16 sm:px-8 sm:pb-24">
        <div className="hero-rise max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#FFCB45]">
            {TRIP.eyebrow} · {TRIP.dateLabel}
          </p>

          <h1 className="font-franklin font-display mt-5 text-[clamp(3rem,8.5vw,5.75rem)] font-semibold leading-[1.0] tracking-[-0.02em] text-white">
            Huatulco,
            <br />
            Mexico
          </h1>

          {/* Social proof — solid navy chip so it stays legible over the photo. */}
          <p className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#0B2237] py-2.5 pl-4 pr-5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.75)] ring-1 ring-white/15">
            <span className="font-franklin text-xl font-semibold tabular-nums tracking-tight text-[#FFCB45] sm:text-2xl">
              {TRIP.joining.value}
            </span>
            <span className="text-[13px] font-medium leading-tight text-white sm:text-sm">
              {TRIP.joining.label}
            </span>
          </p>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl">
            You worked for it. You earned it. Now it&rsquo;s time to celebrate
            it — a week at {TRIP.resort}.
          </p>

          <div className="mt-9">
            <PrimaryButton href="#save-the-date">Save the date</PrimaryButton>
          </div>
        </div>

        {/* Departure counter, tucked along the base like a flight board. */}
        <div
          className="hero-rise mt-14 flex flex-col gap-5 border-t border-white/15 pt-7 sm:flex-row sm:items-end sm:justify-between"
          style={{ animationDelay: "200ms" }}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/50">
              Departure
            </p>
            <p className="mt-1 font-franklin text-lg font-medium text-white">
              Friday, November 20, 2026 · seven nights
            </p>
          </div>
          <Countdown />
        </div>
      </div>

      {/* Scroll cue — visible on every screen size. */}
      <a
        href="#invitation"
        className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-white/70 transition hover:text-white"
        aria-label="Scroll down to read the invitation"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.26em]">
          Scroll
        </span>
        <ChevronDown className="scroll-cue h-5 w-5" />
      </a>
    </section>
  );
}
