import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import Reveal from "@/components/home/Reveal";

export type RelatedLink = {
  href: string;
  label: string;
  /** One clause on why this page is worth reading next. */
  note: string;
};

/**
 * The closing band on a service page: one advisor call to action, plus the
 * handful of neighbouring service pages a reader is most likely to want next.
 *
 * The label is deliberately the site-wide "Speak with an Advisor" rather than
 * the page's own hero CTA ("Start a Retirement Plan", …) — the hero already
 * carries the page-specific ask, and repeating it verbatim at the foot would put
 * two identical primary CTAs on one page.
 *
 * Related links are real routes only. Nothing here is a placeholder.
 */
export default function ServiceCta({
  heading,
  body,
  related = [],
  tone = "white",
}: {
  heading: string;
  body: string;
  related?: RelatedLink[];
  tone?: "white" | "muted";
}) {
  return (
    <section
      className={`border-t border-black/10 ${
        tone === "muted" ? "bg-[#f7f9fa]" : "bg-white"
      }`}
    >
      <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
        <Reveal>
          <div className="overflow-hidden rounded-sm bg-[#0a1f33] px-8 py-12 text-white sm:px-12 sm:py-14">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-16">
              <div>
                <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-white/60">
                  Next Step
                </p>
                <h2 className="mt-4 max-w-xl font-serif text-[32px] font-normal leading-[1.12] tracking-tight sm:text-[40px]">
                  {heading}
                </h2>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">
                  {body}
                </p>
                <Link
                  href="/contact"
                  className="group mt-9 inline-flex items-center gap-2 bg-white px-7 py-4 text-[15px] font-semibold text-[#0a1f33] shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e6f1f1] hover:shadow-xl hover:shadow-black/20"
                >
                  Speak with an Advisor
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              {related.length > 0 && (
                <div className="lg:border-l lg:border-white/15 lg:pl-16">
                  <h3 className="text-[13px] font-semibold uppercase tracking-[0.22em] text-white/60">
                    Explore Next
                  </h3>
                  <ul className="mt-6 space-y-5">
                    {related.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href} className="group block">
                          <span className="inline-flex items-center gap-1.5 font-serif text-xl font-normal text-white transition-colors group-hover:text-[#5ed3c6]">
                            {link.label}
                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </span>
                          <span className="mt-1 block text-[15px] leading-relaxed text-white/60">
                            {link.note}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
