import Link from "next/link";
import {
  ArrowRight,
  Check,
  MapPin,
  Users,
  PlaneLanding,
  GraduationCap,
} from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import Reveal from "@/components/home/Reveal";
import ServiceHero from "@/components/home/ServiceHero";
import { getPublishedServicePage } from "@/lib/cms/public";

export async function generateMetadata() {
  const page = await getPublishedServicePage("travel-insurance");
  return { title: page.seoTitle, description: page.seoDescription };
}

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

export default async function TravelInsurancePage() {
  const page = await getPublishedServicePage("travel-insurance");
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      {/* ---------- Hero ---------- */}
      <ServiceHero content={page} scrimClassName="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/80 via-[#0a1f33]/40 to-transparent" />

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

      {/* ---------- CTA ---------- */}
      <section className="relative overflow-hidden border-t border-black/10 bg-[#0a1f33]">
        <img
          src="/wealth-planning1.jpg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/85 via-[#0a1f33]/50 to-transparent"
          aria-hidden
        />

        <div className="relative mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-3xl">
            <h2
              className="font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-white sm:text-[44px]"
              style={{ textShadow: "0 2px 28px rgba(0,0,0,0.5)" }}
            >
              Plan Your Coverage Before You Go
            </h2>
            <p
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85"
              style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
            >
              A little planning goes a long way. Speak with a Keybase Financial
              Advisor to find a travel insurance plan that fits your destination,
              your trip, and your peace of mind.
            </p>
            <div className="mt-9">
              <Link
                href="/contact"
                className="group inline-flex items-center gap-2 bg-white px-7 py-4 text-[15px] font-semibold text-[#0a1f33] shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e6f1f1] hover:shadow-xl"
              >
                Speak with an Advisor
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
