import { Plus } from "lucide-react";
import Reveal from "@/components/home/Reveal";

export type FaqItem = {
  question: string;
  /** One paragraph per entry. Kept as plain strings so the copy stays reviewable. */
  answer: string[];
};

/**
 * Frequently-asked questions for a service page.
 *
 * Built on native <details>/<summary>: the question is a real, keyboard-operable
 * control without a line of JavaScript or a single ARIA attribute, and every
 * answer ships inside the server-rendered HTML whether or not the entry is open,
 * so crawlers and answer engines can read all of it. <summary> is one of the few
 * elements whose content model explicitly allows a heading, which keeps each
 * question in the page's heading outline.
 */
export default function ServiceFaq({
  heading,
  eyebrow = "Common Questions",
  tone = "muted",
  items,
}: {
  heading: string;
  eyebrow?: string;
  tone?: "white" | "muted";
  items: FaqItem[];
}) {
  return (
    <section
      className={`border-t border-black/10 ${
        tone === "muted" ? "bg-[#f7f9fa]" : "bg-white"
      }`}
    >
      <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              {eyebrow}
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              {heading}
            </h2>
          </Reveal>

          <Reveal delay={120}>
            {items.map((item) => (
              <details
                key={item.question}
                className="group border-b border-black/10 first:border-t first:border-black/10"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006d6e] [&::-webkit-details-marker]:hidden">
                  <h3 className="font-serif text-[21px] font-normal leading-snug text-[#0a1f33] transition-colors group-hover:text-[#006d6e] group-focus-visible:text-[#006d6e] sm:text-[24px]">
                    {item.question}
                  </h3>
                  <span
                    className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-[#0a1f33]/25 text-[#0a1f33] transition-transform duration-300 group-open:rotate-45"
                    aria-hidden
                  >
                    <Plus className="h-4 w-4" strokeWidth={2} />
                  </span>
                </summary>
                <div className="max-w-2xl space-y-4 pb-7 text-[16px] leading-relaxed text-[#5b6573]">
                  {item.answer.map((para) => (
                    <p key={para}>{para}</p>
                  ))}
                </div>
              </details>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
