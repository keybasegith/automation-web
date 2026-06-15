"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const NAVY = "#0a1f33";

const SLIDES = [
  {
    category: "Whitepaper",
    title: "Building durable retirement income in a higher-for-longer world",
    image: "/wealth-offering.jpg",
  },
  {
    category: "Family Wealth",
    title: "A family's guide to tax-efficient wealth transfer across generations",
    image: "/consult-advisors.jpg",
  },
  {
    category: "Market Outlook",
    title: "Positioning portfolios for the year ahead amid shifting rates",
    image: "/profile-backgroundpic.jpg",
  },
];

const INTERVAL = 6000;

export default function FeaturedCarousel() {
  const [index, setIndex] = useState(0);
  const count = SLIDES.length;

  const go = (next: number) => setIndex((next + count) % count);

  // Auto-advance; resets whenever the index changes (so manual nav restarts the timer).
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL);
    return () => clearInterval(id);
  }, [index, count]);

  const slide = SLIDES[index];

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 sm:py-28">
        {/* Header */}
        <div className="flex items-end justify-between gap-6">
          <h2 className="max-w-3xl font-serif text-[34px] font-normal leading-[1.08] tracking-tight text-[#0a1f33] sm:text-[44px]">
            Explore the possibilities for reshaping your financial future
          </h2>
          <Link
            href="#insights"
            className="inline-flex flex-shrink-0 items-center gap-1.5 text-[15px] font-semibold text-[#0a1f33] transition-colors hover:text-[#0e2a45]"
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Slide */}
        <div className="mt-12 grid items-stretch overflow-hidden lg:grid-cols-2">
          <div className="flex flex-col justify-center bg-[#f4f4f6] p-10 sm:p-14">
            <p className="text-[15px] font-semibold text-[#0a1f33]">
              {slide.category}
            </p>
            <h3 className="mt-6 font-serif text-2xl font-normal leading-snug text-[#0a1f33] sm:text-[28px]">
              {slide.title}
            </h3>
            <Link
              href="#insights"
              className="mt-12 inline-flex w-fit items-center rounded-full border border-[#0a1f33] px-8 py-3 text-[15px] font-semibold text-[#0a1f33] transition-colors hover:bg-[#0a1f33] hover:text-white"
            >
              Learn More
            </Link>
          </div>
          <div
            className="relative min-h-[320px] bg-cover bg-center lg:min-h-[460px]"
            style={{ backgroundImage: `url(${slide.image})` }}
            role="img"
            aria-label={slide.title}
          />
        </div>

        {/* Controls */}
        <div className="mt-10 flex items-center gap-6">
          <div className="relative h-px flex-1 bg-black/10">
            <span
              className="absolute left-0 top-0 h-px transition-all duration-500"
              style={{
                width: `${((index + 1) / count) * 100}%`,
                background: NAVY,
              }}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef0f4] text-[#0a1f33] transition-colors hover:bg-[#0a1f33] hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef0f4] text-[#0a1f33] transition-colors hover:bg-[#0a1f33] hover:text-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
