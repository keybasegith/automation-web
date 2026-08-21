"use client";

import { useEffect, useRef, useState } from "react";

// NOTE: Illustrative figures for layout. Replace with verified firm metrics before launch.
const STATS = [
  {
    prefix: "",
    value: 1989,
    suffix: "",
    grouping: false,
    label: "Year founded, advising Canadian families ever since",
  },
  {
    prefix: "$",
    value: 3,
    suffix: "B+",
    label: "Client assets under administration as of May 1, 2026",
    note: "Assets under administration reflect the total value of client accounts administered across Keybase advisors, including managed portfolios, registered plans, and insurance solutions held with the firm.",
  },
  {
    prefix: "",
    value: 100,
    suffix: "%",
    label: "Independent — advice aligned to your goals, not ours",
    note: "As an independent firm, Keybase advisors are free from product-sale quotas and proprietary mandates, recommending only what genuinely fits each client's circumstances and long-term objectives.",
  },
];

const DURATION = 1600; // ms

// easeOutCubic — fast start, gentle settle.
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

function useCountUp(target: number, active: boolean) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active || startedRef.current) return;
    startedRef.current = true;

    let raf = 0;
    let startTs = 0;
    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const progress = Math.min((ts - startTs) / DURATION, 1);
      setValue(Math.round(ease(progress) * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target]);

  return value;
}

function Stat({
  stat,
  active,
  index,
}: {
  stat: (typeof STATS)[number];
  active: boolean;
  index: number;
}) {
  const count = useCountUp(stat.value, active);
  return (
    <div
      className="reveal lg:border-l lg:border-black/15 lg:pl-12"
      data-shown={active}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      <div className="font-serif text-6xl font-normal leading-none tracking-tight text-[#0a1f33] sm:text-7xl">
        {stat.prefix && (
          <span className="align-top text-3xl sm:text-4xl">{stat.prefix}</span>
        )}
        {stat.grouping === false ? count : count.toLocaleString("en-US")}
        {stat.suffix}
      </div>
      <p className="mt-8 max-w-[260px] text-lg leading-snug text-[#5b6573]">
        {stat.label}
      </p>
      {stat.note && (
        <p className="mt-8 max-w-[300px] text-[15px] leading-relaxed text-[#7a828d]">
          {stat.note}
        </p>
      )}
    </div>
  );
}

export default function StatsBand() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);

  // Kick off the count-up once the band scrolls into view.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="bg-white">
      <div className="mx-auto grid max-w-[1280px] gap-y-12 px-5 pb-12 pt-20 sm:px-8 sm:pb-14 sm:pt-28 lg:grid-cols-3 lg:gap-x-16">
        {STATS.map((stat, i) => (
          <Stat key={stat.label} stat={stat} active={active} index={i} />
        ))}
      </div>
    </section>
  );
}
