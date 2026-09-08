import AnswerCta from "@/components/keybase-answer/AnswerCta";
import KeybaseAnswerDemo from "@/components/keybase-answer/KeybaseAnswerDemo";
import { isFeatureEnabled } from "@/lib/keybase-answer/config";
import { HOME_SECTION_COPY } from "@/lib/keybase-answer/copy";

/** A quiet introduction to the research tool, with real questions to explore. */
export default function KeybaseAnswerHomeSection() {
  if (!isFeatureEnabled()) return null;

  return (
    <section
      id="keybase-answer"
      aria-labelledby="keybase-answer-heading"
      className="bg-white"
    >
      <div className="mx-auto max-w-[1280px] px-5 py-14 sm:px-8 sm:py-20 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
          <div>
            <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#006d6e]">
              {HOME_SECTION_COPY.eyebrow}
            </p>
            <h2
              id="keybase-answer-heading"
              className="font-serif text-[44px] font-normal leading-[1.08] tracking-[-0.035em] text-[#0a1f33] sm:text-[56px]"
            >
              {HOME_SECTION_COPY.title}
            </h2>
            <p className="mt-6 max-w-[25rem] text-[17px] leading-[1.75] text-[#5b6573]">
              {HOME_SECTION_COPY.body}
            </p>
            <div className="mt-8 sm:mt-10">
              <AnswerCta href={HOME_SECTION_COPY.ctaHref} label={HOME_SECTION_COPY.ctaLabel} />
            </div>
          </div>

          <KeybaseAnswerDemo />
        </div>
      </div>
    </section>
  );
}
