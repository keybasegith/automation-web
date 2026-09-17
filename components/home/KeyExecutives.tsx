"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ArrowRight } from "lucide-react";

/**
 * The card's view of a person. Built from a `PersonProfile` by the page above
 * (see app/key-executives/page.tsx) — this component holds no biography of its
 * own, so there is nothing here to drift out of step with the person record.
 */
export type Executive = {
  name: string;
  title: string;
  photo?: string;
  photoAlt?: string;
  photoClassName?: string;
  comingSoon?: boolean;
  ceoMessage?: boolean;
  lead: string;
  paragraphs: string[];
  /** Present only when this person has a published profile page. */
  profilePath?: string;
};

const ROW_SIZE = 3;

export default function KeyExecutives({ people }: { people: Executive[] }) {
  const [active, setActive] = useState<number | null>(null);

  // Split into rows so the expanded bio can drop directly beneath the row that
  // contains the selected person — not at the bottom of the whole grid.
  // The first person (CEO) gets a row to themselves; everyone else flows in
  // rows of ROW_SIZE.
  const rows: Executive[][] = [];
  if (people.length > 0) {
    rows.push([people[0]]);
    for (let i = 1; i < people.length; i += ROW_SIZE) {
      rows.push(people.slice(i, i + ROW_SIZE));
    }
  }

  // Cumulative start index of each row, so portrait/bio lookups stay correct
  // even though rows have different lengths.
  let acc = 0;
  const rowStarts = rows.map((row) => {
    const start = acc;
    acc += row.length;
    return start;
  });

  return (
    <div className="space-y-8 sm:space-y-12">
      {rows.map((row, rowIndex) => {
        const rowStart = rowStarts[rowIndex];
        const activeInRow =
          active !== null && active >= rowStart && active < rowStart + row.length;

        // The CEO's row holds one centred card, so — unlike a grid column —
        // nothing gives it a width. The portrait inside is an absolutely
        // positioned fill image and contributes none either, so without this
        // the card would shrink to the width of the name beneath it.
        const cardWidth = row.length === 1 ? "w-[210px]" : "w-full";

        return (
          <div key={rowIndex}>
            {/* Portrait row */}
            <div
              className={
                row.length === 1
                  ? "flex justify-center"
                  : "grid grid-cols-3 gap-4 sm:gap-8 lg:gap-12"
              }
            >
              {row.map((exec, j) => {
                const i = rowStart + j;
                const open = active === i;
                return (
                  <div
                    key={exec.name}
                    className={`flex flex-col items-center ${cardWidth}`}
                  >
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setActive(open ? null : i)}
                      className="group flex w-full flex-col items-center text-center focus:outline-none"
                    >
                      {/* The frame reserves its own space, so the row does not
                          shift as portraits load. */}
                      <span className="relative mx-auto block aspect-[6/7] w-full max-w-[210px] overflow-hidden bg-[#f1f3f9] ring-1 ring-black/[0.04]">
                        {exec.comingSoon || !exec.photo ? (
                          <span className="flex h-full w-full flex-col items-center justify-center bg-[#eef1f4] px-3 text-center">
                            <span className="font-serif text-[15px] text-[#9aa3ad] sm:text-[17px]">
                              Coming
                            </span>
                            <span className="font-serif text-[15px] text-[#9aa3ad] sm:text-[17px]">
                              Soon
                            </span>
                          </span>
                        ) : (
                          <Image
                            src={exec.photo}
                            alt={exec.photoAlt ?? `Portrait of ${exec.name}`}
                            fill
                            sizes="(min-width: 640px) 210px, 30vw"
                            // A portrait replaced through the CMS is served from
                            // an env-configured origin that cannot be listed in
                            // images.remotePatterns; skip the optimizer for those
                            // rather than throwing on an unconfigured host.
                            unoptimized={/^https?:\/\//i.test(exec.photo)}
                            className={`object-cover object-top ${exec.photoClassName ?? ""}`}
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

                    {/* Rendered in the initial HTML, not only once a card is
                        expanded, so a profile page is reachable by a reader who
                        never clicks and by a crawler that cannot. Present only
                        for people who have a profile, so it never 404s. */}
                    {exec.profilePath && (
                      <Link
                        href={exec.profilePath}
                        className="mt-2 text-[13px] text-[#5b6573] underline decoration-[#5b6573]/30 underline-offset-4 transition-colors hover:text-[#006d6e] hover:decoration-[#006d6e]/50"
                      >
                        View profile
                        <span className="sr-only"> of {exec.name}</span>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Expanded bio — rendered beneath the row holding the active person */}
            {activeInRow && active !== null && (
              <div className="mt-8 border-t-2 border-[#006d6e]">
                <div className="bg-[#f5f6f8] px-6 py-8 sm:px-10 sm:py-9">
                  <h2 className="font-serif text-[19px] font-normal text-[#0a1f33] sm:text-[22px]">
                    {people[active].lead}
                  </h2>

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
