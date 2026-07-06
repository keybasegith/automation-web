import Link from "next/link";
import {
  ChevronRight,
  ArrowRight,
  Check,
  X,
  Infinity as InfinityIcon,
  Unlock,
  CalendarClock,
  LineChart,
  PieChart,
  Landmark,
  Layers,
} from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import Reveal from "@/components/home/Reveal";

export const metadata = {
  title: "Non-Registered Investments — Keybase Financial Group",
  description:
    "A non-registered account is a flexible investment account with no contribution limits, withdrawal restrictions, or maturity requirements — an ideal way to grow wealth beyond RRSPs and TFSAs. Keybase advisors help you invest with a tax-aware, goals-first strategy.",
};

/* Freedom the account gives you — the three defining characteristics. */
const FREEDOMS = [
  {
    icon: InfinityIcon,
    title: "No contribution limits",
    body: "Invest as much as you want, whenever you want. There are no annual caps to work around.",
  },
  {
    icon: Unlock,
    title: "No withdrawal restrictions",
    body: "Access your money on your own terms, with no penalties for withdrawing when life calls for it.",
  },
  {
    icon: CalendarClock,
    title: "No maturity requirements",
    body: "Keep contributing for as long as you wish. There are no age-based rules forcing a wind-down.",
  },
];

/* What you can hold inside the account. */
const PRODUCTS = [
  {
    icon: PieChart,
    title: "Mutual Funds",
    body: "Professionally managed, diversified portfolios aligned to your risk profile and goals.",
  },
  {
    icon: LineChart,
    title: "Exchange-Traded Funds",
    body: "Low-cost, market-tracking funds that offer broad diversification and daily liquidity.",
  },
  {
    icon: Landmark,
    title: "GICs",
    body: "Guaranteed investment certificates for a secure, predictable return on part of your plan.",
  },
  {
    icon: Layers,
    title: "Other Investment Solutions",
    body: "Additional traditional and alternative solutions to round out a well-balanced strategy.",
  },
];

/* Registered vs. non-registered, at a glance. */
const COMPARISON = [
  {
    feature: "Contribution limits",
    registered: "Annual limits set by the CRA",
    nonRegistered: "No contribution limits",
  },
  {
    feature: "Withdrawals",
    registered: "May be restricted or taxable on withdrawal",
    nonRegistered: "Withdraw anytime, with no penalties",
  },
  {
    feature: "Maturity & age rules",
    registered: "RRSPs must mature by age 71",
    nonRegistered: "No age-based maturity rules",
  },
  {
    feature: "Tax treatment",
    registered: "Tax-sheltered or tax-free growth",
    nonRegistered: "Income may be taxable — interest, dividends, capital gains",
  },
  {
    feature: "Best suited for",
    registered: "Core, tax-sheltered retirement and savings goals",
    nonRegistered: "Investing beyond registered limits with added flexibility",
  },
];

/* Factors that shape the right mix for you. */
const FACTORS = [
  "Your current and future marginal tax rate",
  "The type of investment income you expect to earn",
  "How much you plan to invest",
  "Your withdrawal needs and timeline",
  "The purpose of the investment",
  "How it complements your RRSP and TFSA",
];

export default function NonRegisteredInvestmentsPage() {
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden border-b border-black/10 bg-[#0a1f33] text-white">
        <img
          src="/wealth-planning1.jpg"
          alt=""
          aria-hidden
          className="ken-burns pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        {/* left-side scrim keeps the copy legible without darkening the image */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/70 via-[#0a1f33]/35 to-transparent"
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
              Investment Solutions
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-white/40" />
            <span className="text-white">Non-Registered Investments</span>
          </nav>

          <p className="mt-9 text-[13px] font-semibold uppercase tracking-[0.22em] text-white/70">
            Investment Solutions
          </p>
          <h1
            className="mt-5 max-w-3xl font-serif text-[42px] font-normal leading-[1.06] tracking-tight sm:text-[60px]"
            style={{ textShadow: "0 2px 28px rgba(0,0,0,0.5)" }}
          >
            Grow wealth beyond registered plans.
          </h1>
          <p
            className="mt-7 max-w-2xl text-lg leading-relaxed text-white/85"
            style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
          >
            A non-registered account is a flexible investment account designed to
            help you grow and manage wealth outside of registered plans such as
            RRSPs and TFSAs — with no contribution limits, withdrawal
            restrictions, or maturity requirements.
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

      {/* ---------- Overview ---------- */}
      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Overview
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              What Is a Non-Registered Account
            </h2>
          </Reveal>
          <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
            <p>
              Unlike registered accounts, non-registered accounts do not have
              contribution limits, withdrawal restrictions, or maturity
              requirements. This makes them a practical option for investors who
              want greater flexibility, have already maximized their registered
              accounts, or are building a long-term investment strategy beyond
              tax-sheltered savings.
            </p>
            <p>
              Through a non-registered account, you can invest in a range of
              products, including mutual funds, exchange-traded funds, GICs, and
              other investment solutions. Income earned within the account may be
              taxable — including interest, dividends, and capital gains — so tax
              planning should be considered as part of your overall strategy.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- The Freedom It Offers (feature cards) ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              The Freedom It Offers
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Flexibility on your terms
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-px overflow-hidden rounded-sm border border-black/10 bg-black/10 sm:grid-cols-3">
            {FREEDOMS.map((item, i) => (
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

      {/* ---------- What You Can Invest In (product grid) ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                What You Can Hold
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                A Range of Investment Solutions
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
                A non-registered account can hold a broad mix of investments,
                letting your advisor tailor a portfolio to your goals, timeline,
                and comfort with risk.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <div className="grid gap-5 sm:grid-cols-2">
                {PRODUCTS.map((item) => (
                  <div
                    key={item.title}
                    className="group rounded-sm border border-black/10 bg-white p-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#006d6e]/30 hover:shadow-lg hover:shadow-black/[0.06]"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e6f1f1] text-[#006d6e]">
                      <item.icon className="h-[22px] w-[22px]" strokeWidth={1.75} />
                    </span>
                    <h3 className="mt-5 text-[19px] font-semibold leading-snug text-[#0a1f33]">
                      {item.title}
                    </h3>
                    <p className="mt-2.5 text-[15px] leading-relaxed text-[#5b6573]">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Key Benefits ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Key Benefits
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Room to Invest, Freedom to Adapt
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                A non-registered account gives you the freedom to invest without
                annual contribution limits or penalties for withdrawals. You can
                continue contributing for as long as you wish, with no age-based
                maturity rules.
              </p>
              <p>
                It can also complement your registered accounts by giving you
                additional room to invest once RRSP or TFSA limits have been
                reached. For many investors, it becomes an important part of a
                balanced financial plan.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Registered vs. Non-Registered (comparison table) ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              How They Compare
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Registered vs. Non-Registered Accounts
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
              Choosing between the two depends on your personal financial
              situation, tax position, investment goals, and time horizon. Here is
              how they compare at a glance.
            </p>
          </Reveal>

          <Reveal delay={120} className="mt-14">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-black/15">
                    <th className="w-[26%] py-4 pr-6 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#5b6573]">
                      Feature
                    </th>
                    <th className="w-[37%] py-4 pr-6 text-[15px] font-semibold text-[#0a1f33]">
                      Registered (RRSP / TFSA)
                    </th>
                    <th className="w-[37%] py-4 pl-6 text-[15px] font-semibold text-[#006d6e]">
                      Non-Registered
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr
                      key={row.feature}
                      className="border-b border-black/10 align-top"
                    >
                      <td className="py-5 pr-6 text-[15px] font-semibold text-[#1a2433]">
                        {row.feature}
                      </td>
                      <td className="py-5 pr-6 text-[15px] leading-relaxed text-[#5b6573]">
                        {row.registered}
                      </td>
                      <td className="bg-[#f4faf9] py-5 pl-6 pr-6 text-[15px] leading-relaxed text-[#1a2433]">
                        {row.nonRegistered}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Factors to Consider ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                What We Consider
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Factors That Shape Your Strategy
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
                Every plan is different. These are some of the areas our advisors
                review to determine the right balance for you.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <ul className="grid border-t border-black/10 sm:grid-cols-2 sm:gap-x-14">
                {FACTORS.map((item) => (
                  <li
                    key={item}
                    className="flex items-baseline gap-4 border-b border-black/10 py-[18px]"
                  >
                    <Check
                      className="relative top-[3px] h-[18px] w-[18px] flex-none text-[#006d6e]"
                      strokeWidth={2.25}
                    />
                    <span className="text-[17px] leading-snug text-[#1a2433]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Invest Today for Tomorrow ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                The Long View
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Invest Today for Tomorrow
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                Building wealth does not require waiting for the perfect moment.
                Starting early, even with a modest amount, can create meaningful
                progress over time.
              </p>
              <p>
                At Keybase Financial Group, we help you understand your options and
                choose an investment strategy that aligns with your goals,
                lifestyle, and long-term financial plan.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="relative overflow-hidden border-t border-black/10 bg-[#0a1f33]">
        <img
          src="/retirement-planning2.jpg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/80 via-[#0a1f33]/45 to-transparent"
          aria-hidden
        />

        <div className="relative mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-3xl">
            <h2
              className="font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-white sm:text-[44px]"
              style={{ textShadow: "0 2px 28px rgba(0,0,0,0.5)" }}
            >
              Start Building, Today
            </h2>
            <p
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85"
              style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
            >
              A non-registered account can be a powerful complement to your
              registered plans. Speak with a Keybase Financial Advisor today to
              explore how it fits into a strategy built around your goals.
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
