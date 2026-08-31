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
import { MemoriesReel } from "@/components/mexico-trip/MemoriesReel";
import { PhotoSlider } from "@/components/mexico-trip/PhotoSlider";
import {
  Eyebrow,
  Rule,
  SEA_GRADIENT,
  SectionHeading,
} from "@/components/mexico-trip/ui";
import {
  FAQ,
  INCLUDED,
  PILLARS,
  PROGRAM,
  SESSIONS,
  STATS,
  TRIP,
} from "@/lib/mexico-trip/config";

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
              title="Seven nights on the Caribbean coast of Mexico"
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
                Beachfront · {TRIP.region}
              </p>
              <p className="mt-7 text-base leading-[1.8] text-[#0B2237]/70 sm:text-lg">
                Playa del Carmen sits at the middle of the Riviera Maya —
                white sand and turquoise water on one side, Fifth Avenue and its
                open-air cafés a block behind. The Mesoamerican reef lies just
                offshore, cenotes and Mayan ruins an easy drive inland, and
                Cozumel a short ferry across the channel.
              </p>
              <p className="mt-5 text-base leading-[1.8] text-[#0B2237]/70 sm:text-lg">
                The resort is adults-only and all-inclusive, set directly on
                the beach — everything is taken care of from the moment you
                land.
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
          The program — five sessions, framed as five questions.
      --------------------------------------------------------------- */}
      <section className="bg-[#F3F7FB] px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow={PROGRAM.eyebrow}
              title={PROGRAM.title}
              sub={PROGRAM.sub}
            />
          </Reveal>

          <Reveal delay={100}>
            <div className="mt-12 overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(11,34,55,0.06),0_18px_50px_-30px_rgba(11,34,55,0.35)] ring-1 ring-[#0B2237]/10">
              {/* Card header — the promise the five sessions add up to. */}
              <div className="flex flex-col gap-3 border-b border-[#0B2237]/10 bg-[#0B2237] px-7 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-10">
                <h3 className="font-franklin font-display text-xl font-semibold leading-tight tracking-tight text-white sm:text-2xl">
                  Building the Advisory Practice of the Future - AGENDA
                </h3>
                <span className="shrink-0 self-start rounded-full border border-white/25 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7FD6DD] sm:self-auto">
                  Five sessions
                </span>
              </div>

              <ol className="divide-y divide-[#0B2237]/10">
                {SESSIONS.map((session, i) => (
                  <Reveal key={session.key} delay={i * 70}>
                    <li className="grid gap-x-6 gap-y-2 px-7 py-6 transition-colors hover:bg-[#F3F7FB]/70 sm:grid-cols-[3.25rem_10rem_1fr] sm:items-baseline sm:px-10 sm:py-7">
                      <span className="font-franklin text-sm font-semibold tabular-nums tracking-[0.18em] text-[#C93A24]">
                        {session.number}
                      </span>
                      <span className="font-franklin text-sm font-semibold uppercase tracking-[0.16em] text-[#0A7A8C]">
                        {session.key}
                      </span>
                      <p className="font-display text-lg leading-snug text-[#0B2237] sm:text-xl">
                        {session.question}
                      </p>
                    </li>
                  </Reveal>
                ))}
              </ol>
            </div>
          </Reveal>

          {/* The refrain, then the line the whole week rests on. */}
          <Reveal delay={140}>
            <div className="mt-14 text-center">
              <p className="font-franklin text-sm font-semibold uppercase tracking-[0.24em] text-[#0B2237]/55 sm:text-[15px]">
                {PROGRAM.refrain}
              </p>
              <Rule className="mx-auto mt-8 w-16" />
              <p className="font-franklin font-display mx-auto mt-8 max-w-2xl text-[clamp(1.5rem,3.6vw,2.25rem)] font-semibold leading-[1.2] tracking-tight text-[#0B2237]">
                <span className="text-[#0A7A8C]">{PROGRAM.closing.lead}</span>{" "}
                {PROGRAM.closing.tail}
              </p>
            </div>
          </Reveal>

          <Reveal delay={180}>
            <p className="mt-10 text-center text-sm text-[#0B2237]/50">
              {TRIP.note}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------
          Questions people ask before they commit.
      --------------------------------------------------------------- */}
      <section className="px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <SectionHeading align="left" eyebrow="Ahead of the trip" title="Good to know" />
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
          Memories Made — a continuously scrolling reel of past trips.
      --------------------------------------------------------------- */}
      <Reveal>
        <MemoriesReel />
      </Reveal>

      {/* ---------------------------------------------------------------
          Sign-off — the dark closing band. No form yet; the formal
          confirmation carries the RSVP.
      --------------------------------------------------------------- */}
      <section
        id="save-the-date"
        className="scroll-mt-8 px-5 py-24 sm:px-8 sm:py-32"
        style={{ background: SEA_GRADIENT }}
      >
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <Eyebrow tone="dark">You qualified — mark your calendar</Eyebrow>
            <h2 className="font-franklin font-display mt-4 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-[2.75rem]">
              {TRIP.dateLabel}
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/70">
              Saturday to Saturday
              <br />
              {TRIP.resort}
              <br />
              {TRIP.region}
            </p>
          </Reveal>
        </div>
      </section>

    </main>
  );
}
