"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

const NAVY = "#0a1f33";

// How long each headline holds before handing off to the next.
const SEGMENT_SECONDS = 7;

// Each segment carries its own background photo alongside its copy, so the
// picture changes with the headline rather than sitting fixed behind both.
const SLIDES = [
  {
    image: "/firstherosection1.jpg",
    title: "Building and preserving wealth for generations.",
    subtext:
      "Keybase Financial Group partners with individuals, families, and institutions to deliver disciplined, independent financial advice — grounded in trust and built for the long term.",
  },
  {
    image: "/firstherosection2.jpg",
    title: "Powered by AI, guided by people.",
    subtext:
      "As one of the first in our field to embrace artificial intelligence, Keybase pairs cutting-edge technology with seasoned judgment — sharpening every insight, decision, and recommendation we deliver.",
  },
];

export default function Hero() {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % SLIDES.length),
      SEGMENT_SECONDS * 1000,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, #0e2a45 55%, #0a3d3e 130%)`,
      }}
    >
      {/* Raw <img> (not next/image): a full-bleed ken-burns background layer.
          Keyed on the source so the slow zoom restarts with each segment
          instead of continuing mid-motion under a new photograph. */}
      <img
        key={slide.image}
        src={slide.image}
        alt=""
        className="ken-burns pointer-events-none absolute inset-0 h-full w-full object-cover"
        aria-hidden
      />

      {/* teal glow */}
      <div
        className="glow-drift pointer-events-none absolute -right-40 top-1/2 h-[520px] w-[520px] rounded-full blur-3xl"
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
          <p className="text-sm font-semibold uppercase tracking-widest text-white">Independent Wealth Management in Canada</p>
          {/* Keyed on the slide index so the headline + subtext softly
              cross-fade each time the copy changes. */}
          <div key={index}>
            <h1
              className="slide-fade mt-6 text-[44px] font-semibold leading-[1.06] tracking-tight text-white sm:text-[60px] lg:text-[72px]"
              style={{ textShadow: "0 2px 28px rgba(0,0,0,0.5)" }}
            >
              {slide.title}
            </h1>
            <p
              className="slide-fade mt-7 max-w-2xl text-lg leading-relaxed text-white/90 sm:text-xl"
              style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)", animationDelay: "120ms" }}
            >
              {slide.subtext}
            </p>
          </div>
          <div className="hero-rise mt-10 flex flex-wrap gap-4" style={{ animationDelay: "420ms" }}>
            <Link
              href="#what-we-do"
              className="group inline-flex items-center gap-2 bg-white px-7 py-4 text-[15px] font-semibold text-[#0a1f33] shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e6f1f1] hover:shadow-xl hover:shadow-black/20"
            >
              Explore Our Services
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/our-advisors"
              className="inline-flex items-center gap-2 border border-white/40 px-7 py-4 text-[15px] font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white/70 hover:bg-white/10"
            >
              Find an Advisor
            </Link>
          </div>
        </div>
      </div>

      {/* scroll cue */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-7 hidden justify-center sm:flex"
        aria-hidden
      >
        <ChevronDown className="scroll-cue h-7 w-7 text-white/70" strokeWidth={1.5} />
      </div>
    </section>
  );
}
