"use client";

import { useEffect, useMemo, useState } from "react";
import { TRIP } from "@/lib/mexico-trip/config";

const SLIDE_MS = 2800;

/**
 * Auto-advancing photo slider for the gallery under the invitation.
 *
 * Slides live on one horizontal track moved with translateX, so the advance
 * reads as a glide rather than a swap. Photos that fail to load (not uploaded
 * yet, bad name) are dropped from the rotation, and the whole component
 * renders nothing when no photo survives — the page never shows broken tiles.
 * Rotation pauses while hovered or when the tab is hidden, and the dots allow
 * manual navigation.
 */
export function PhotoSlider() {
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const photos = useMemo(
    () => TRIP.photos.filter((src) => !failed.has(src)),
    [failed],
  );

  // Derived rather than clamped in an effect: if failed photos shrink the
  // list under the current position, rendering falls back to the first slide
  // and the next tick's modulo keeps the rotation consistent from there.
  const current = index < photos.length ? index : 0;

  useEffect(() => {
    if (paused || photos.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      setIndex((i) => (i + 1) % photos.length);
    }, SLIDE_MS);
    return () => clearInterval(id);
  }, [paused, photos.length]);

  if (photos.length === 0) return null;

  return (
    <section
      className="px-5 pb-24 sm:px-8 sm:pb-32"
      aria-label="A look at Playa del Carmen"
    >
      <div
        className="group relative mx-auto max-w-6xl overflow-hidden rounded-2xl bg-[#E8F0F8]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className="flex transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {photos.map((src, i) => (
            <div key={src} className="relative w-full shrink-0">
              {/* Plain <img>: next/image would 400 on files that aren't
                  uploaded yet instead of firing onError with the raw path. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Playa del Carmen preview ${i + 1} of ${photos.length}`}
                loading={i === 0 ? "eager" : "lazy"}
                draggable={false}
                onError={() =>
                  setFailed((prev) => new Set(prev).add(src))
                }
                className="aspect-[4/3] w-full select-none object-cover sm:aspect-[16/8]"
              />
            </div>
          ))}
        </div>

        {photos.length > 1 && (
          <>
            {/* Position dots */}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 sm:bottom-5">
              {photos.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Go to photo ${i + 1}`}
                  aria-current={i === current}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === current
                      ? "w-7 bg-white"
                      : "w-3 bg-white/45 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>

            {/* Counter */}
            <span className="absolute bottom-4 right-4 rounded-full bg-[#0B2237]/45 px-2.5 py-1 text-[11px] font-semibold tabular-nums tracking-[0.14em] text-white backdrop-blur-sm sm:bottom-5 sm:right-5">
              {current + 1} / {photos.length}
            </span>
          </>
        )}
      </div>
    </section>
  );
}
