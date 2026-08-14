import { Check, MapPin, Users, PlaneLanding, GraduationCap } from "lucide-react";
import Reveal from "@/components/home/Reveal";

/* The situations travel insurance is built for. */
const SCENARIOS = [
  "Travelling internationally",
  "Visiting another province",
  "Welcoming family to Canada",
  "Studying away from home",
];

/* Who Keybase advisors can help through provider partners. */
const TRAVELLERS = [
  { icon: MapPin, title: "Canadian Residents" },
  { icon: Users, title: "Seniors" },
  { icon: PlaneLanding, title: "Visitors to Canada" },
  { icon: GraduationCap, title: "Students" },
];

/* Available coverage options. */
const COVERAGE = [
  "Emergency Medical Insurance",
  "Trip Cancellation & Trip Interruption Insurance",
  "Accidental Death & Dismemberment Coverage",
  "Baggage Insurance",
  "Rental Car Protection",
  "All-Inclusive Travel Packages",
  "Non-Medical Travel Packages",
  "Sports & Activities Coverage",
  "Cancel For Any Reason Coverage",
  "Visitor to Canada Insurance",
  "Student Travel Insurance",
];

/**
 * The travel-insurance page body — every section below the hero.
 *
 * Lives apart from the route so both the standalone /travel-insurance page and the
 * tabbed /services/travel-insurance view render exactly the same content.
 */
export default function TravelInsuranceBody() {
  return (
    <>
      {/* ---------- Why It Matters ---------- */}
      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Why It Matters
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Protection Before &amp; During Your Trip
            </h2>
          </Reveal>
          <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
            <p>
              Unexpected medical emergencies, cancelled trips, lost baggage, or
              travel disruptions can create significant financial stress. The right
              coverage can help protect you before and during your trip, so you can
              travel with greater confidence.
            </p>
            <p>Travel insurance can support you across many kinds of trips:</p>
            <ul className="flex flex-wrap gap-2.5 pt-1">
              {SCENARIOS.map((item) => (
                <li
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#f7f9fa] px-4 py-2 text-[14px] font-medium text-[#1a2433]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#006d6e]" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ---------- Coverage Options ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Coverage Options
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Solutions for Every Traveller
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
              Through our provider partners, Keybase advisors can help a range of
              travellers explore coverage that fits their needs.
            </p>
          </Reveal>

          {/* Who we help */}
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRAVELLERS.map((item, i) => (
              <Reveal
                key={item.title}
                delay={(i % 4) * 80}
                className="flex items-center gap-4 rounded-sm border border-black/10 bg-white p-6"
              >
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-[#e6f1f1] text-[#006d6e]">
                  <item.icon className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <h3 className="text-[17px] font-semibold leading-snug text-[#0a1f33]">
                  {item.title}
                </h3>
              </Reveal>
            ))}
          </div>

          {/* Coverage list */}
          <Reveal delay={120} className="mt-14">
            <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#0a1f33]">
              Available Coverage May Include
            </p>
            <ul className="mt-6 grid border-t border-black/10 sm:grid-cols-2 sm:gap-x-14 lg:grid-cols-3 lg:gap-x-12">
              {COVERAGE.map((item) => (
                <li
                  key={item}
                  className="flex items-baseline gap-4 border-b border-black/10 py-[18px]"
                >
                  <Check
                    className="relative top-[3px] h-[18px] w-[18px] flex-none text-[#006d6e]"
                    strokeWidth={2.25}
                  />
                  <span className="text-[16px] leading-snug text-[#1a2433]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-8 max-w-3xl border-l-2 border-black/15 pl-5 text-[14px] leading-relaxed text-[#5b6573]">
              Coverage availability may vary depending on your destination, age,
              health, travel purpose, and eligibility.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- Travel with Peace of Mind ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Tailored to Your Trip
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Travel with Peace of Mind
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                Every trip is different, and your insurance should reflect where you
                are going, how long you are travelling, and what kind of protection
                you may need.
              </p>
              <p>
                A Keybase advisor can help you review your options and choose a
                travel insurance plan that supports your travel plans with clarity
                and confidence.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

    </>
  );
}
