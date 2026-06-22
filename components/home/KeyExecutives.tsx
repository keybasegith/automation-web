"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ArrowRight } from "lucide-react";

export type Executive = {
  name: string;
  title: string;
  photo: string;
  lead: string;
  paragraphs: string[];
  href?: string;
};

export default function KeyExecutives({ people }: { people: Executive[] }) {
  const [active, setActive] = useState<number | null>(0);

  return (
    <div>
      {/* Portrait row */}
      <div className="grid grid-cols-3 gap-4 sm:gap-10 lg:gap-16">
        {people.map((exec, i) => {
          const open = active === i;
          return (
            <button
              key={exec.name}
              type="button"
              aria-expanded={open}
              onClick={() => setActive(open ? null : i)}
              className="group flex flex-col items-center text-center focus:outline-none"
            >
              <span className="block w-full overflow-hidden rounded-full bg-[#f1f3f9] ring-1 ring-black/[0.04]">
                <img
                  src={exec.photo}
                  alt={`${exec.name} portrait`}
                  className="aspect-square w-full object-cover object-top"
                />
              </span>

              <span
                className={`mt-6 font-serif text-[20px] font-normal transition-colors sm:text-[26px] ${
                  open
                    ? "text-[#006d6e] underline decoration-1 underline-offset-[6px]"
                    : "text-[#0a1f33] group-hover:text-[#006d6e]"
                }`}
              >
                {exec.name}
              </span>
              <span className="mt-1.5 text-[13px] text-[#5b6573] sm:text-[16px]">
                {exec.title}
              </span>

              <ChevronDown
                className={`mt-4 h-6 w-6 transition-all ${
                  open ? "rotate-180 text-[#006d6e]" : "text-[#1a2433]"
                }`}
                strokeWidth={1.75}
              />
            </button>
          );
        })}
      </div>

      {/* Expanded bio */}
      {active !== null && (
        <div className="mt-8 border-t-2 border-[#006d6e]">
          <div className="bg-[#f5f6f8] px-6 py-12 sm:px-12 sm:py-14">
            <h3 className="font-serif text-[22px] font-normal text-[#0a1f33] sm:text-[26px]">
              {people[active].lead}
            </h3>

            <div className="mt-7 max-w-4xl space-y-5 text-[17px] leading-relaxed text-[#5b6573]">
              {people[active].paragraphs.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/ceo-message"
                className="inline-flex items-center gap-2 bg-[#0a1f33] px-7 py-3.5 text-[14px] font-semibold tracking-wide text-white transition-colors hover:bg-[#0e2a45]"
              >
                Read a message from our CEO
                <ArrowRight className="h-4 w-4" />
              </Link>
              {people[active].href && (
                <Link
                  href={people[active].href!}
                  className="inline-flex items-center gap-2 border border-[#1a2433] px-7 py-3.5 text-[14px] font-semibold tracking-wide text-[#1a2433] transition-colors hover:bg-[#1a2433] hover:text-white"
                >
                  View full profile
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
