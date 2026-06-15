"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const NAVY = "#0a1f33";

// Each slide pairs a background clip with its headline + subtext. The text
// changes in sync with the clip currently playing.
const SLIDES = [
  {
    src: "/hero-section-vid1.mp4",
    title: "Building and preserving wealth for generations.",
    subtext:
      "Keybase Financial Group partners with individuals, families, and institutions to deliver disciplined, independent financial advice — grounded in trust and built for the long term.",
  },
  {
    src: "/hero-section-vid2.mp4",
    title: "AI in Focus",
    subtext:
      "Timely analysis tracking the latest innovations and developments in artificial intelligence and their impact on global markets.",
  },
];

export default function Hero() {
  const ref = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  // The `key` remount gives a fresh element per clip; this is a safety net for
  // browsers that need an explicit play() after the source swaps.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const played = v.play();
    if (played && typeof played.catch === "function") played.catch(() => {});
  }, [index]);

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, #0e2a45 55%, #0a3d3e 130%)`,
      }}
    >
      {/* background videos — drop files at public/hero-section-vid1.mp4 and
          public/hero-section-vid2.mp4 (they play back-to-back and loop). */}
      <video
        key={index}
        ref={ref}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        playsInline
        aria-hidden
        onEnded={() => setIndex((i) => (i + 1) % SLIDES.length)}
      >
        <source src={slide.src} type="video/mp4" />
      </video>

      {/* teal glow */}
      <div
        className="pointer-events-none absolute -right-40 top-1/2 h-[520px] w-[520px] -translate-y-1/2 rounded-full opacity-30 blur-3xl"
        aria-hidden
        style={{ background: "radial-gradient(circle, #00a3a4 0%, transparent 70%)" }}
      />
      {/* monogram watermark */}
      <div
        className="pointer-events-none absolute -right-6 top-1/2 hidden -translate-y-1/2 select-none text-[420px] font-bold leading-none text-white/[0.04] md:block"
        aria-hidden
      >
        K
      </div>

      <div className="relative mx-auto flex min-h-[560px] max-w-[1280px] items-center px-5 py-24 sm:min-h-[640px] sm:px-8 sm:py-32 lg:min-h-[720px] lg:py-40">
        <div className="max-w-3xl">
          <h1
            className="mt-6 text-[44px] font-semibold leading-[1.06] tracking-tight text-white sm:text-[60px] lg:text-[72px]"
            style={{ textShadow: "0 2px 28px rgba(0,0,0,0.5)" }}
          >
            {slide.title}
          </h1>
          <p
            className="mt-7 max-w-2xl text-lg leading-relaxed text-white/90 sm:text-xl"
            style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
          >
            {slide.subtext}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="#what-we-do"
              className="group inline-flex items-center gap-2 bg-white px-7 py-4 text-[15px] font-semibold text-[#0a1f33] transition-colors hover:bg-[#e6f1f1]"
            >
              Explore Our Services
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 border border-white/40 px-7 py-4 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
            >
              Speak with an Advisor
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
