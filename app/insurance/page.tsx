import Link from "next/link";
import {
  ChevronRight,
  ArrowRight,
  Check,
  Umbrella,
  HeartPulse,
  Coins,
  SlidersHorizontal,
  Wallet,
  TrendingUp,
} from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import Reveal from "@/components/home/Reveal";

export const metadata = {
  title: "Insurance — Keybase Financial Group",
  description:
    "Insurance is an essential part of a strong financial plan — protecting your income, preserving wealth, and providing security for the people who matter most. Through Keybase Insurance Agency Ltd., advisors help you tailor coverage for individuals, families, and business owners.",
};

/* The full range of solutions, organized by what they protect. */
const SOLUTION_GROUPS = [
  {
    icon: Umbrella,
    category: "Life Insurance",
    items: [
      "Term Life Insurance",
      "Whole Life Insurance",
      "Universal Life Insurance",
    ],
  },
  {
    icon: HeartPulse,
    category: "Living Benefits & Health",
    items: [
      "Critical Illness Insurance",
      "Disability Insurance",
      "Long-Term Care Insurance",
      "Travel Insurance",
      "Health and Dental Insurance",
    ],
  },
  {
    icon: Coins,
    category: "Wealth & Income",
    items: ["Segregated Funds", "Annuities", "Guaranteed Interest Accounts"],
  },
];

/* Ways insurance supports business owners specifically. */
const BUSINESS_NEEDS = [
  "Continuity planning",
  "Key person protection",
  "Shareholder agreements",
  "Succession planning",
];

/* What sets a Keybase insurance strategy apart. */
const PILLARS = [
  {
    icon: SlidersHorizontal,
    title: "Flexibility",
    body: "Coverage shaped around your lifestyle, responsibilities, and long-term objectives — never one-size-fits-all.",
  },
  {
    icon: Wallet,
    title: "Affordability",
    body: "Solutions that fit your budget today while still protecting the future you are working toward.",
  },
  {
    icon: TrendingUp,
    title: "Long-Term Value",
    body: "A strategy built to keep supporting your plan as your income, family, and goals evolve.",
  },
];

export default function InsurancePage() {
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden border-b border-black/10 bg-[#0a1f33] text-white">
        <img
          src="/tax-planning1.jpg"
          alt=""
          aria-hidden
          className="ken-burns pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        {/* left-side scrim keeps the copy legible without darkening the image */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/70 via-[#0a1f33]/25 to-transparent"
          aria-hidden
        />

        <div className="relative mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-2 text-[14px] text-white/70"
          >
            <Link href="/" className="transition-colors hover:text-white">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-white/40" />
            <Link href="/#what-we-do" className="transition-colors hover:text-white">
              Preservation Strategies
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-white/40" />
            <span className="text-white">Insurance</span>
          </nav>

          <p className="mt-9 text-[13px] font-semibold uppercase tracking-[0.22em] text-white/70">
            Preservation Strategies
          </p>
          <h1
            className="mt-5 max-w-3xl font-serif text-[42px] font-normal leading-[1.06] tracking-tight sm:text-[60px]"
            style={{ textShadow: "0 2px 28px rgba(0,0,0,0.5)" }}
          >
            Protect what you&rsquo;ve built.
          </h1>
          <p
            className="mt-7 max-w-2xl text-lg leading-relaxed text-white/85"
            style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
          >
            Insurance helps protect your income, preserve wealth, and provide
            financial security for the people and responsibilities that matter
            most — a safety net for life&rsquo;s unexpected moments.
          </p>
          <div className="mt-10">
            <Link
              href="/contact"
              className="group inline-flex items-center gap-2 bg-white px-7 py-4 text-[15px] font-semibold text-[#0a1f33] shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e6f1f1] hover:shadow-xl hover:shadow-black/20"
            >
              Speak with an Advisor
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Keybase Insurance Agency Ltd. ---------- */}
      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Our Agency
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Keybase Insurance Agency Ltd.
            </h2>
          </Reveal>
          <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
            <p>
              At Keybase Insurance Agency Ltd., our advisors take the time to
              understand your needs, goals, family situation, and business
              priorities. Insurance is not one-size-fits-all — the right strategy
              should be tailored to your lifestyle, financial responsibilities, and
              long-term objectives.
            </p>
            <p>
              Whether your focus is income protection, estate planning, business
              continuity, or wealth transfer, we can help you explore coverage
              options designed to support your plan.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- Individual and Business Insurance Solutions ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              What We Offer
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Individual &amp; Business Insurance Solutions
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
              Keybase Insurance Agency Ltd. offers access to a wide range of
              insurance solutions across three core areas of protection.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {SOLUTION_GROUPS.map((group, i) => (
              <Reveal
                key={group.category}
                delay={i * 110}
                className="flex flex-col rounded-sm border border-black/10 bg-white p-8"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f1f1] text-[#006d6e]">
                  <group.icon className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <h3 className="mt-6 text-[20px] font-semibold leading-snug text-[#0a1f33]">
                  {group.category}
                </h3>
                <ul className="mt-5 space-y-3 border-t border-black/10 pt-5">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-baseline gap-3">
                      <Check
                        className="relative top-[3px] h-[17px] w-[17px] flex-none text-[#006d6e]"
                        strokeWidth={2.25}
                      />
                      <span className="text-[16px] leading-snug text-[#1a2433]">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Protection for Every Stage ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Every Chapter of Life
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Protection for Every Stage
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-7 text-lg leading-relaxed text-[#5b6573]">
              <p>
                Insurance is valuable at every stage of life. Whether you are
                starting your career, raising a family, building a business,
                preparing for retirement, or planning your estate, the right
                coverage can help reduce financial risk and protect your long-term
                plan.
              </p>
              <div className="rounded-sm border border-black/10 bg-[#f7f9fa] p-7">
                <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#0a1f33]">
                  For Business Owners
                </p>
                <p className="mt-3 text-[16px] leading-relaxed text-[#5b6573]">
                  Insurance can also support key elements of running and protecting
                  a business:
                </p>
                <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {BUSINESS_NEEDS.map((item) => (
                    <li key={item} className="flex items-baseline gap-3">
                      <Check
                        className="relative top-[3px] h-[17px] w-[17px] flex-none text-[#006d6e]"
                        strokeWidth={2.25}
                      />
                      <span className="text-[16px] leading-snug text-[#1a2433]">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- The Keybase Difference ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Why Keybase
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              The Keybase Difference
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
              A Keybase advisor can help you identify potential gaps in your current
              protection and recommend solutions that align with your financial
              goals.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-px overflow-hidden rounded-sm border border-black/10 bg-black/10 lg:grid-cols-3">
            {PILLARS.map((item, i) => (
              <Reveal
                key={item.title}
                delay={i * 100}
                className="flex flex-col bg-white p-8 sm:p-9"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f1f1] text-[#006d6e]">
                  <item.icon className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <h3 className="mt-6 text-[20px] font-semibold leading-snug text-[#0a1f33]">
                  {item.title}
                </h3>
                <p className="mt-3 text-[16px] leading-relaxed text-[#5b6573]">
                  {item.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Protect What Matters (CTA) ---------- */}
      <section className="relative overflow-hidden border-t border-black/10 bg-[#0a1f33]">
        <img
          src="/education-planning1.jpg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_30%]"
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
              Protect What Matters
            </h2>
            <p
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85"
              style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
            >
              Life can change quickly. A thoughtful insurance strategy can help
              bridge the financial gap when income, health, family, or business
              circumstances change unexpectedly. Let us help you build protection
              into your financial plan with clarity and confidence.
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
