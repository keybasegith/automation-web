import type { ReactNode } from "react";
import {
  Flower2,
  Hotel,
  Music,
  Plane,
  UtensilsCrossed,
  Waves,
} from "lucide-react";
import Reveal from "@/components/home/Reveal";
import { Hero } from "@/components/mexico-trip/Hero";
import { PhotoSlider } from "@/components/mexico-trip/PhotoSlider";
import { RsvpForm } from "@/components/mexico-trip/RsvpForm";
import {
  Eyebrow,
  Rule,
  SEA_GRADIENT,
  SectionHeading,
} from "@/components/mexico-trip/ui";
import { FAQ, INCLUDED, PILLARS, STATS, TRIP, WEEK } from "@/lib/mexico-trip/config";

const INCLUDED_ICONS: Record<string, ReactNode> = {
  hotel: <Hotel className="h-5 w-5" strokeWidth={1.75} />,
  utensils: <UtensilsCrossed className="h-5 w-5" strokeWidth={1.75} />,
  flower: <Flower2 className="h-5 w-5" strokeWidth={1.75} />,
  waves: <Waves className="h-5 w-5" strokeWidth={1.75} />,
  party: <Music className="h-5 w-5" strokeWidth={1.75} />,
  plane: <Plane className="h-5 w-5" strokeWidth={1.75} />,
};

export default function MexicoTripPage() {
  return (
    <main className="bg-white">
      <Hero />

      {/* ---------------------------------------------------------------
          The invitation — the note itself, given room to breathe.
      --------------------------------------------------------------- */}
      <section id="invitation" className="scroll-mt-16 px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <Eyebrow>{TRIP.greeting}</Eyebrow>
            <p className="mt-7 text-lg leading-[1.8] text-[#0B2237]/70 sm:text-xl">
              {TRIP.intro}
            </p>
          </Reveal>

          <Reveal delay={120}>
            <Rule className="my-12 w-16" />
            <h2 className="font-franklin font-display text-[clamp(1.9rem,5vw,3rem)] font-semibold leading-[1.15] tracking-tight text-[#0B2237]">
              You worked for it. You earned it.{" "}
              <span className="text-[#0A7A8C]">
                Now it&rsquo;s time to celebrate it.
              </span>
            </h2>
          </Reveal>

          <Reveal delay={220}>
            <p className="mt-7 text-lg leading-[1.8] text-[#0B2237]/70">
              {TRIP.promise}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------
          A first look — auto-sliding gallery.
      --------------------------------------------------------------- */}
      <Reveal>
        <PhotoSlider />
      </Reveal>

      {/* ---------------------------------------------------------------
          The four beats — numbered editorial columns on a seafoam band.
      --------------------------------------------------------------- */}
      <section className="bg-[#F3F7FB] px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="What's waiting"
              title="Seven nights on the Pacific coast of Oaxaca"
            />
          </Reveal>

          <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((pillar, i) => (
              <Reveal key={pillar.title} delay={i * 90}>
                <div className="border-t border-[#0B2237]/15 pt-6">
                  <span className="font-franklin text-sm font-semibold tracking-[0.2em] text-[#C93A24]">
                    {pillar.number}
                  </span>
                  <h3 className="font-franklin mt-3 text-xl font-semibold text-[#0B2237]">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-[#0B2237]/60">
                    {pillar.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------
          The destination — copy beside a quiet stat column.
      --------------------------------------------------------------- */}
      <section className="px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-14 lg:grid-cols-[1.2fr_0.8fr] lg:gap-24">
            <Reveal>
              <Eyebrow>The destination</Eyebrow>
              <h2 className="font-franklin font-display mt-4 text-3xl font-semibold leading-[1.12] tracking-tight text-[#0B2237] sm:text-4xl">
                {TRIP.resort}
              </h2>
              <p className="mt-2 text-base font-medium text-[#0A7A8C]">
                Conejos Bay · {TRIP.region}
              </p>
              <p className="mt-7 text-base leading-[1.8] text-[#0B2237]/70 sm:text-lg">
                Huatulco is the coast Mexico kept quiet about — nine bays and
                thirty-six beaches wrapped in a national park, with the Sierra
                Madre rising straight out of the water behind them. No high-rise
                strip, no crowds. Clear water, coffee country in the hills, and
                evenings that stay warm long after sunset.
              </p>
              <p className="mt-5 text-base leading-[1.8] text-[#0B2237]/70 sm:text-lg">
                The resort is adults-only and all-inclusive, set directly on the
                bay — everything is taken care of from the moment you land.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <div className="divide-y divide-[#0B2237]/10 border-y border-[#0B2237]/10">
                {STATS.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-baseline justify-between py-5"
                  >
                    <span className="text-sm font-medium uppercase tracking-[0.14em] text-[#0B2237]/55">
                      {stat.label}
                    </span>
                    <span className="font-franklin text-3xl font-semibold tabular-nums tracking-tight text-[#0B2237]">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* What's covered */}
          <Reveal delay={80}>
            <Rule className="mt-20" />
          </Reveal>
          <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {INCLUDED.map((item, i) => (
              <Reveal key={item.title} delay={i * 60}>
                <div className="flex gap-4">
                  <span className="mt-0.5 shrink-0 text-[#0A7A8C]">
                    {INCLUDED_ICONS[item.icon]}
                  </span>
                  <div>
                    <h3 className="font-franklin text-base font-semibold text-[#0B2237]">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#0B2237]/60">
                      {item.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------
          Shape of the week — a quiet timeline.
      --------------------------------------------------------------- */}
      <section className="bg-[#F3F7FB] px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="The week"
              title="How the seven days take shape"
              sub="A sketch, not a schedule — most of the week is yours."
            />
          </Reveal>

          <ol className="mt-12 divide-y divide-[#0B2237]/10 border-y border-[#0B2237]/10">
            {WEEK.map((entry, i) => (
              <Reveal key={entry.title} delay={i * 80}>
                <li className="grid gap-2 py-7 sm:grid-cols-[11rem_1fr] sm:gap-8">
                  <span className="text-sm font-semibold uppercase tracking-[0.16em] text-[#C93A24] sm:pt-0.5">
                    {entry.day}
                  </span>
                  <div>
                    <h3 className="font-franklin text-lg font-semibold text-[#0B2237]">
                      {entry.title}
                    </h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-[#0B2237]/60">
                      {entry.body}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>

          <Reveal delay={120}>
            <p className="mt-8 text-sm text-[#0B2237]/50">{TRIP.note}</p>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------
          Questions people ask before they commit.
      --------------------------------------------------------------- */}
      <section className="px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <SectionHeading align="left" eyebrow="Before you reply" title="Good to know" />
          </Reveal>
          <div className="mt-12 grid gap-x-14 gap-y-10 sm:grid-cols-2">
            {FAQ.map((item, i) => (
              <Reveal key={item.q} delay={i * 70}>
                <div className="border-t border-[#0B2237]/15 pt-5">
                  <h3 className="font-franklin text-base font-semibold text-[#0B2237]">
                    {item.q}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#0B2237]/60">
                    {item.a}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------
          RSVP — the point of the page.
      --------------------------------------------------------------- */}
      <section
        id="rsvp"
        className="scroll-mt-8 px-5 py-24 sm:px-8 sm:py-32"
        style={{ background: SEA_GRADIENT }}
      >
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <div className="text-center">
              <Eyebrow tone="dark">You qualified — mark your calendar</Eyebrow>
              <h2 className="font-franklin font-display mt-4 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-[2.75rem]">
                Will you be joining us?
              </h2>
              <p className="mx-auto mt-4 max-w-md text-base text-white/70">
                {TRIP.dateLabel} · {TRIP.resort}
              </p>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <div className="mt-12">
              <RsvpForm />
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
