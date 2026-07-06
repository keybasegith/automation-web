import Link from "next/link";
import {
  ChevronRight,
  ArrowRight,
  PieChart,
  TrendingUp,
  ShieldCheck,
  Banknote,
  Layers,
  Briefcase,
  Unlock,
  SlidersHorizontal,
  Anchor,
  CalendarClock,
  PiggyBank,
  LineChart,
} from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import Reveal from "@/components/home/Reveal";

export const metadata = {
  title: "Traditional Investments — Keybase Financial Group",
  description:
    "Traditional investments — stocks, bonds, cash, mutual funds, ETFs, and GICs — used to build portfolios for growth, income, and capital preservation. Keybase advisors help you choose solutions aligned with your goals, time horizon, and risk tolerance.",
};

/* The building blocks of a traditional portfolio. */
const ASSET_CLASSES = [
  "Stocks",
  "Bonds",
  "Cash",
  "Mutual Funds",
  "ETFs",
  "GICs",
];

/* Common fund types. */
const TYPES = [
  {
    icon: PieChart,
    title: "Mutual Funds",
    body: "Pool money from many investors into a diversified portfolio of securities — a simple, professionally managed way to build diversification across asset classes, sectors, and regions.",
  },
  {
    icon: TrendingUp,
    title: "Equity Funds",
    body: "Invest primarily in shares of publicly traded companies. Designed for investors seeking long-term growth and higher return potential, while accepting greater market risk.",
  },
  {
    icon: ShieldCheck,
    title: "Fixed Income Funds",
    body: "Invest primarily in bonds and other income-generating securities — often used to provide stability, generate income, and reduce overall portfolio volatility.",
  },
  {
    icon: Banknote,
    title: "Money Market Funds",
    body: "Invest in short-term debt securities. May suit investors looking to preserve capital, maintain liquidity, and earn income with lower risk.",
  },
];

/* Why mutual funds are so widely used. */
const MF_BENEFITS = [
  {
    icon: Layers,
    title: "Diversification",
    body: "Access a broad mix of investments, reducing the risk of relying too heavily on one company, sector, or asset class.",
  },
  {
    icon: Briefcase,
    title: "Professional Management",
    body: "Each fund is managed by investment professionals who monitor market conditions, holdings, and opportunities.",
  },
  {
    icon: Unlock,
    title: "Accessibility",
    body: "Easy to buy and sell, and many allow investors to start with relatively low minimum investment amounts.",
  },
  {
    icon: SlidersHorizontal,
    title: "Flexibility",
    body: "Choose from a wide range of funds based on your goals, risk profile, and investment timeline.",
  },
];

/* How GICs fit into a broader plan. */
const GIC_FIT = [
  {
    icon: Anchor,
    title: "Portfolio Stability",
    body: "A conservative fixed-income component within a broader investment strategy.",
  },
  {
    icon: CalendarClock,
    title: "Staggered Maturities",
    body: "Different maturity dates can help manage cash flow and adapt to changing interest rate environments.",
  },
  {
    icon: PiggyBank,
    title: "Short-Term Savings",
    body: "Short-term GICs may suit a near-term goal while seeking a higher return than a traditional savings account.",
  },
];

export default function TraditionalInvestmentsPage() {
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden border-b border-black/10 bg-[#0a1f33] text-white">
        <img
          src="/estate-planning1.jpg"
          alt=""
          aria-hidden
          className="ken-burns pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        {/* left-side scrim keeps the copy legible without darkening the image */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/85 via-[#0a1f33]/45 to-transparent"
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
            <span className="text-white">Traditional Investments</span>
          </nav>

          <p className="mt-9 text-[13px] font-semibold uppercase tracking-[0.22em] text-white/70">
            Investment Solutions
          </p>
          <h1
            className="mt-5 max-w-3xl font-serif text-[42px] font-normal leading-[1.06] tracking-tight sm:text-[60px]"
            style={{ textShadow: "0 2px 28px rgba(0,0,0,0.5)" }}
          >
            Time-tested ways to build wealth.
          </h1>
          <p
            className="mt-7 max-w-2xl text-lg leading-relaxed text-white/85"
            style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
          >
            Traditional investments include publicly traded stocks, bonds, cash,
            mutual funds, ETFs, and guaranteed investment certificates — used to
            build portfolios focused on growth, income, capital preservation, or a
            combination of all three.
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
              A Foundation You Can Build On
            </h2>
          </Reveal>
          <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
            <p>
              At Keybase Financial Group, we offer access to a wide range of
              traditional investment options. The right approach depends on your
              goals, time horizon, risk tolerance, and overall financial plan.
              Working with an advisor can help you choose solutions that align with
              your needs and long-term objectives.
            </p>
            <p>These portfolios are commonly built from:</p>
            <ul className="flex flex-wrap gap-2.5 pt-1">
              {ASSET_CLASSES.map((item) => (
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

      {/* ---------- Common Types ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              The Building Blocks
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Common Types of Traditional Investments
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-px overflow-hidden rounded-sm border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-4">
            {TYPES.map((item, i) => (
              <Reveal
                key={item.title}
                delay={(i % 4) * 80}
                className="flex flex-col bg-white p-8"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f1f1] text-[#006d6e]">
                  <item.icon className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <h3 className="mt-6 text-[19px] font-semibold leading-snug text-[#0a1f33]">
                  {item.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[#5b6573]">
                  {item.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Key Benefits of Mutual Funds ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Why Mutual Funds
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Key Benefits of Mutual Funds
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
                A structured, professionally managed solution suited to both new
                and experienced investors.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <div className="grid gap-x-10 gap-y-9 sm:grid-cols-2">
                {MF_BENEFITS.map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#e6f1f1] text-[#006d6e]">
                      <item.icon className="h-[22px] w-[22px]" strokeWidth={1.75} />
                    </span>
                    <div>
                      <h3 className="text-[18px] font-semibold leading-snug text-[#0a1f33]">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-[15px] leading-relaxed text-[#5b6573]">
                        {item.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Guaranteed Investment Certificates ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Low-Risk, Guaranteed
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Guaranteed Investment Certificates
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
              A GIC is a low-risk investment that provides a guaranteed return over
              a set period. GICs can be useful for investors who want stability,
              predictable income, and protection of their principal.
            </p>
            <p className="mt-8 text-[13px] font-semibold uppercase tracking-[0.16em] text-[#0a1f33]">
              How GICs Can Fit Into a Portfolio
            </p>
          </Reveal>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {GIC_FIT.map((item, i) => (
              <Reveal
                key={item.title}
                delay={i * 100}
                className="flex flex-col rounded-sm border border-black/10 bg-white p-8"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f1f1] text-[#006d6e]">
                  <item.icon className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <h3 className="mt-6 text-[19px] font-semibold leading-snug text-[#0a1f33]">
                  {item.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[#5b6573]">
                  {item.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- ETF Portfolios ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal>
            <div className="overflow-hidden rounded-sm bg-[#0a1f33] px-8 py-12 text-white sm:px-12 sm:py-14">
              <div className="grid gap-10 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-16">
                <div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-[#4fd1c5]">
                    <LineChart className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <p className="mt-6 text-[13px] font-semibold uppercase tracking-[0.22em] text-white/60">
                    Managed &amp; Streamlined
                  </p>
                  <h2 className="mt-4 font-serif text-[32px] font-normal leading-[1.12] tracking-tight sm:text-[40px]">
                    ETF Portfolios
                  </h2>
                </div>
                <div className="space-y-6 text-lg leading-relaxed text-white/80 lg:pt-2">
                  <p>
                    ETF portfolios provide exposure to exchange-traded funds within
                    a managed investment structure. They can offer diversification,
                    cost efficiency, and access to different markets or asset
                    classes.
                  </p>
                  <p>
                    For investors who want the benefits of ETFs with the guidance of
                    a managed portfolio, ETF-based solutions can provide a practical
                    and streamlined approach.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Build a Portfolio with Purpose ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                The Bigger Picture
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Build a Portfolio with Purpose
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                Traditional investments can play an important role in building
                wealth, generating income, and supporting long-term financial
                security.
              </p>
              <p>
                At Keybase Financial Group, our advisors can help you assess your
                options and create an investment strategy that reflects your goals,
                risk tolerance, and future plans.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="relative overflow-hidden border-t border-black/10 bg-[#0a1f33]">
        <img
          src="/careers-hero.jpg"
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
              Build a Strategy That Fits You
            </h2>
            <p
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85"
              style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
            >
              The right mix of traditional investments depends on your goals and
              risk tolerance. Speak with a Keybase Financial Advisor to design a
              portfolio built around your objectives.
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
