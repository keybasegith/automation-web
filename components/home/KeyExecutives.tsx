"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ArrowRight } from "lucide-react";

export type Executive = {
  name: string;
  title: string;
  photo?: string;
  comingSoon?: boolean;
  ceoMessage?: boolean;
  lead: string;
  paragraphs: string[];
  href?: string;
};

const ROW_SIZE = 3;

export default function KeyExecutives({ people }: { people: Executive[] }) {
  const [active, setActive] = useState<number | null>(0);

  // Split into rows so the expanded bio can drop directly beneath the row that
  // contains the selected person — not at the bottom of the whole grid.
  const rows: Executive[][] = [];
  for (let i = 0; i < people.length; i += ROW_SIZE) {
    rows.push(people.slice(i, i + ROW_SIZE));
  }

  return (
    <div className="space-y-8 sm:space-y-12">
      {rows.map((row, rowIndex) => {
        const rowStart = rowIndex * ROW_SIZE;
        const activeInRow =
          active !== null && active >= rowStart && active < rowStart + row.length;

        return (
          <div key={rowIndex}>
            {/* Portrait row */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 lg:gap-12">
              {row.map((exec, j) => {
                const i = rowStart + j;
                const open = active === i;
                return (
                  <button
                    key={exec.name}
                    type="button"
                    aria-expanded={open}
                    onClick={() => setActive(open ? null : i)}
                    className="group flex flex-col items-center text-center focus:outline-none"
                  >
                    <span className="mx-auto block w-full max-w-[210px] overflow-hidden bg-[#f1f3f9] ring-1 ring-black/[0.04]">
                      {exec.comingSoon ? (
                        <span className="flex aspect-[6/7] w-full flex-col items-center justify-center bg-[#eef1f4] px-3 text-center">
                          <span className="font-serif text-[15px] text-[#9aa3ad] sm:text-[17px]">
                            Coming
                          </span>
                          <span className="font-serif text-[15px] text-[#9aa3ad] sm:text-[17px]">
                            Soon
                          </span>
                        </span>
                      ) : (
                        <img
                          src={exec.photo}
                          alt={`${exec.name} portrait`}
                          className="aspect-[6/7] w-full object-cover object-top"
                        />
                      )}
                    </span>

                    <span
                      className={`mt-5 font-serif text-[18px] font-normal transition-colors sm:text-[22px] ${
                        open
                          ? "text-[#006d6e] underline decoration-1 underline-offset-[6px]"
                          : "text-[#0a1f33] group-hover:text-[#006d6e]"
                      }`}
                    >
                      {exec.name}
                    </span>
                    <span className="mt-1.5 text-[13px] text-[#5b6573] sm:text-[15px]">
                      {exec.title}
                    </span>

                    <ChevronDown
                      className={`mt-2.5 h-5 w-5 transition-all ${
                        open ? "rotate-180 text-[#006d6e]" : "text-[#1a2433]"
                      }`}
                      strokeWidth={1.75}
                    />
                  </button>
                );
              })}
            </div>

            {/* Expanded bio — rendered beneath the row holding the active person */}
            {activeInRow && active !== null && (
              <div className="mt-8 border-t-2 border-[#006d6e]">
                <div className="bg-[#f5f6f8] px-6 py-8 sm:px-10 sm:py-9">
                  <h3 className="font-serif text-[19px] font-normal text-[#0a1f33] sm:text-[22px]">
                    {people[active].lead}
                  </h3>

                  <div className="mt-4 max-w-3xl space-y-3 text-[15px] leading-relaxed text-[#5b6573]">
                    {people[active].paragraphs.map((para, idx) => (
                      <p key={idx}>{para}</p>
                    ))}
                  </div>

                  {people[active].ceoMessage && (
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        href="/ceo-message"
                        className="inline-flex items-center gap-2 bg-[#0a1f33] px-6 py-3 text-[13px] font-semibold tracking-wide text-white transition-colors hover:bg-[#0e2a45]"
                      >
                        Read a message from our CEO
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
