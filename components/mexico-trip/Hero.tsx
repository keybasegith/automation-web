"use client";

import { useRef, useState } from "react";
import { ChevronDown, Volume2, VolumeX } from "lucide-react";
import { TRIP } from "@/lib/mexico-trip/config";
import { Countdown } from "./Countdown";
import { PrimaryButton, SEA_GRADIENT } from "./ui";

/** Tail of the clip to skip — it loops back before these final seconds. */
const TRIM_END_SECONDS = 3;

export function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  // timeupdate fires several times a second, so guard against issuing the
  // rewind repeatedly while the seek is still in flight.
  const rewinding = useRef(false);
  // The clip is optional scenery, not load-bearing: if public/mexico-trip.mp4
  // is missing or the codec is unsupported, we drop it and the sea gradient
  // underneath carries the hero on its own.
  const [videoFailed, setVideoFailed] = useState(false);
  // Browsers only allow autoplay while muted; sound starts on a user tap.
  const [muted, setMuted] = useState(true);

  function restart(v: HTMLVideoElement) {
    if (rewinding.current) return;
    rewinding.current = true;
    v.currentTime = 0;
    const played = v.play();
    if (played && typeof played.catch === "function") played.catch(() => {});
  }

  function toggleSound() {
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    setMuted(next);
    if (!next) {
      // The unmute gesture doubles as the play gesture where needed.
      const played = v.play();
      if (played && typeof played.catch === "function") played.catch(() => {});
    }
  }

  return (
    <section
      className="relative flex min-h-[100svh] flex-col overflow-hidden"
      style={{ background: SEA_GRADIENT }}
    >
      {!videoFailed && (
        <video
          ref={videoRef}
          className="ken-burns pointer-events-none absolute inset-0 h-full w-full object-cover"
          src={TRIP.heroVideo}
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-hidden
          onError={() => setVideoFailed(true)}
          onSeeked={() => {
            rewinding.current = false;
          }}
          onTimeUpdate={(e) => {
            // Manual loop instead of the `loop` attribute: cut back to the
            // start before the final seconds ever play.
            const v = e.currentTarget;
            if (!Number.isFinite(v.duration)) return;
            if (v.currentTime >= v.duration - TRIM_END_SECONDS) restart(v);
          }}
          // Fallback for the case where duration never resolves and the clip
          // runs all the way out.
          onEnded={(e) => restart(e.currentTarget)}
        />
      )}

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
          <div className="flex items-center gap-4">
            <span className="hidden text-xs font-medium uppercase tracking-[0.22em] text-white/70 sm:block">
              {TRIP.region} · Mexico
            </span>
            {!videoFailed && (
              <button
                type="button"
                onClick={toggleSound}
                aria-label={muted ? "Turn sound on" : "Turn sound off"}
                title={muted ? "Turn sound on" : "Turn sound off"}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 text-white/85 backdrop-blur-sm transition hover:border-white/60 hover:bg-white/10 hover:text-white"
              >
                {muted ? (
                  <VolumeX className="h-4 w-4" strokeWidth={1.75} />
                ) : (
                  <Volume2 className="h-4 w-4" strokeWidth={1.75} />
                )}
              </button>
            )}
          </div>
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

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl">
            You worked for it. You earned it. Now it&rsquo;s time to celebrate
            it — a week at {TRIP.resort}.
          </p>

          <div className="mt-9">
            <PrimaryButton href="#rsvp">Count me in</PrimaryButton>
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
              November 21, 2026 · seven nights
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
