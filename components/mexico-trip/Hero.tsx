"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
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

/**
 * The two marks that sit side by side in the hero's top bar — the house logos,
 * white knockout lockups. Both share a 3:1 frame, so one height carries them.
 */
const HEADER_LOGOS = [
  { src: "/keybase-logowhite.jpg", alt: "Keybase Financial Group" },
  { src: "/argosy-logowhite.jpg", alt: "Argosy Securities Inc." },
];

/**
 * Top-bar lockup. The marks are white on transparency, so they sit straight on
 * the photo; a soft shadow is all they need to hold up over a bright frame.
 * Same rule as the hero photos: a file that isn't uploaded yet drops out on
 * error instead of leaving a broken box, and if neither survives the stacked
 * wordmark carries the bar on its own.
 */
function HeaderLogos() {
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const logos = HEADER_LOGOS.filter(({ src }) => !failed.has(src));

  if (logos.length === 0) {
    return (
      <span className="font-franklin flex flex-col text-sm font-semibold leading-[1.35] tracking-[0.18em] text-white">
        <span>ARGOSY KEYBASE</span>
        <span>WEALTH MANAGEMENT</span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-3 sm:gap-4">
      {logos.map(({ src, alt }, i) => (
        <Fragment key={src}>
          {i > 0 && (
            <span className="h-6 w-px bg-white/25 sm:h-8" aria-hidden />
          )}
          {/* Plain <img>: next/image would 400 on a mark that isn't uploaded
              yet instead of firing onError with the raw path. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            draggable={false}
            onError={() => setFailed((prev) => new Set(prev).add(src))}
            className="h-8 w-auto select-none object-contain drop-shadow-[0_2px_8px_rgba(6,20,36,0.55)] sm:h-10"
          />
        </Fragment>
      ))}
    </span>
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
            "linear-gradient(180deg, rgba(9,28,45,0.50) 0%, rgba(9,28,45,0.10) 30%, rgba(8,26,42,0.58) 62%, rgba(5,18,32,0.92) 100%)",
        }}
        aria-hidden
      />

      {/* Top bar */}
      <div className="relative border-b border-white/15">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <HeaderLogos />
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
            Playa del
            <br />
            Carmen
          </h1>

          <p
            className="font-franklin font-display mt-7 text-[clamp(1.4rem,3.2vw,2rem)] font-semibold leading-tight tracking-tight text-[#FFCB45]"
            style={{ textShadow: "0 2px 18px rgba(5,18,32,0.85)" }}
          >
            We can&rsquo;t wait to see you there!
          </p>

          <p
            className="mt-4 max-w-xl text-lg leading-relaxed text-white sm:text-xl"
            style={{ textShadow: "0 2px 16px rgba(5,18,32,0.8)" }}
          >
            You worked for it. You earned it. Now it&rsquo;s time to celebrate
            it.
            <br />A week at {TRIP.resort}.
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
              Saturday, November 21, 2026 · seven nights
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
