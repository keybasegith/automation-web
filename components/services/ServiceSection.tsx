import Reveal from "@/components/home/Reveal";

/**
 * The two-column editorial band the service pages already use for their prose
 * sections: eyebrow + serif heading on the left, copy on the right. Extracted so
 * the newer content blocks (definitions, audience) match the existing sections
 * exactly instead of re-typing the same class strings in sixteen files.
 */
export default function ServiceSection({
  eyebrow,
  heading,
  tone = "white",
  divider = true,
  children,
}: {
  eyebrow: string;
  heading: string;
  /** Alternating page band. Match the section above so the rhythm holds. */
  tone?: "white" | "muted";
  /** Off for the first band under the hero — the hero already draws that rule. */
  divider?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`${divider ? "border-t border-black/10" : ""} ${
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
          <Reveal
            delay={120}
            className="space-y-6 text-lg leading-relaxed text-[#5b6573]"
          >
            {children}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
