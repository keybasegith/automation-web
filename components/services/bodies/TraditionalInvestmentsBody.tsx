import {
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
import Reveal from "@/components/home/Reveal";
import ServiceSection from "@/components/services/ServiceSection";
import ServiceFaq, { type FaqItem } from "@/components/services/ServiceFaq";
import ServiceCta from "@/components/services/ServiceCta";

/* The building blocks of a traditional portfolio. */
const ASSET_CLASSES = [
  "Stocks",
  "Bonds",
  "Cash",
  "Mutual Funds",
  "ETFs (Mutual Fund ETFs)",
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

const FAQ: FaqItem[] = [
  {
    question: "What is an investment strategy?",
    answer: [
      "An investment strategy is the set of decisions that connect a portfolio to a purpose: what the money is for, when it will be needed, how much fluctuation you can accept along the way, and therefore how it is divided among equities, fixed income, and cash equivalents.",
      "It also sets the rules you intend to follow when markets move — how often to rebalance, and what would genuinely justify changing course.",
    ],
  },
  {
    question: "How is risk tolerance determined?",
    answer: [
      "Through a structured conversation rather than a single score. It weighs your financial capacity to absorb a loss — your time horizon, the stability of your income, and how much of your wealth is at stake — against your willingness to live through one.",
      "The two do not always agree. Where they differ, a plan generally respects the more conservative of the pair, because a strategy abandoned partway through a downturn will not deliver what it was designed to.",
    ],
  },
  {
    question: "What is diversification?",
    answer: [
      "Spreading investments across different companies, sectors, asset classes, and regions so that no single holding or market determines the outcome.",
      "It does not remove the risk of loss, and in a broad market decline most holdings can fall together. What it reduces is concentration — the damage that one disappointing company, industry, or country can do to a portfolio as a whole.",
    ],
  },
  {
    question: "What is the difference between mutual funds and ETFs?",
    answer: [
      "Both pool money from many investors into a diversified portfolio. The difference lies in how they are structured and traded: conventional exchange-traded funds trade on a stock exchange throughout the day, at prices that move with it.",
      "The ETF solutions offered through Keybase are mutual fund ETFs — mutual funds that hold ETFs as their underlying investments — so they are typically priced once per day at net asset value rather than trading continuously.",
    ],
  },
  {
    question: "Where can GICs fit into a portfolio?",
    answer: [
      "A guaranteed investment certificate provides a set return over a fixed term, which suits the part of a portfolio that should not fluctuate — a near-term goal, or the conservative fixed-income component of a longer-term strategy. Staggering maturity dates can help manage access to cash across changing interest rate environments.",
      "The trade-off is commitment: funds are generally tied up for the term, so a GIC is chosen for stability rather than flexibility.",
    ],
  },
];

/**
 * The traditional-investments page body — every section below the hero.
 *
 * Lives apart from the route so both the standalone /traditional-investments page and the
 * tabbed /services/traditional-investments view render exactly the same content.
 */
export default function TraditionalInvestmentsBody() {
  return (
    <>
      {/* ---------- What they are (direct answer) ---------- */}
      <ServiceSection
        eyebrow="In Short"
        heading="What are traditional investments?"
        tone="muted"
        divider={false}
      >
        <p>
          Traditional investments are the long-established asset classes most
          portfolios are built from — equities, fixed income, and cash
          equivalents — usually accessed through pooled solutions such as mutual
          funds, mutual fund ETFs, and guaranteed investment certificates.
        </p>
        <p>
          They trade in public markets or through regulated deposit products,
          are generally straightforward to buy and sell, and are valued and
          reported on a regular basis. How much of each belongs in a portfolio
          depends on your goals, your time horizon, and your tolerance for risk.
        </p>
      </ServiceSection>

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
                  <p className="mt-3 text-lg text-white/60">
                    (Mutual Fund ETFs)
                  </p>
                </div>
                <div className="space-y-6 text-lg leading-relaxed text-white/80 lg:pt-2">
                  <p>
                    The ETF solutions offered through Keybase are mutual fund ETFs
                    — mutual funds that hold ETFs as their underlying investments.
                    The fund manager selects and manages those underlying ETFs
                    within a single, professionally managed portfolio, offered
                    through our fund company partners.
                  </p>
                  <p>
                    Because they are structured as mutual funds, they are typically
                    priced once per day at net asset value (NAV), rather than
                    trading on a stock exchange with prices that change throughout
                    the trading day.
                  </p>
                  <p>
                    For investors who want the diversification and cost efficiency
                    of ETFs with the guidance of a managed portfolio, mutual fund
                    ETFs can provide a practical and streamlined approach.
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

      {/* ---------- Matching investments to goals ---------- */}
      <ServiceSection eyebrow="Matching Investments to Goals" heading="How the right mix is chosen">
        <p>
          No asset class is right or wrong on its own — suitability depends on
          what the money is for and when you will need it. A goal a decade or
          more away can generally tolerate more short-term fluctuation in
          exchange for growth potential, while money needed within a year or two
          is usually held in something far less volatile.
        </p>
        <p>
          From there, portfolio construction is a question of proportion: how
          much in equity funds for growth, how much in fixed income for
          stability and income, and how much in cash-equivalent or guaranteed
          holdings for near-term needs. Diversifying across companies, sectors,
          and regions limits how much any single holding can affect the result.
        </p>
        <p>
          These solutions tend to suit investors building long-term wealth
          through regular contributions, those consolidating scattered accounts
          into one coherent strategy, investors seeking income from their
          portfolio, and people who would rather have a professional manage the
          day-to-day decisions. A Keybase Financial Group advisor works through
          your goals, time horizon, and risk tolerance with you, then recommends
          a mix suited to that assessment and revisits it as circumstances
          change.
        </p>
      </ServiceSection>

      <ServiceFaq heading="Questions about investing." items={FAQ} tone="muted" />

      <ServiceCta
        heading="Build a portfolio with a purpose behind it."
        body="A Keybase advisor can review your goals, time horizon, and tolerance for risk, then recommend a mix of traditional investments suited to them."
        related={[
          {
            href: "/alternative-investments",
            label: "Alternative Investments",
            note: "Private market strategies beyond public equities and bonds.",
          },
          {
            href: "/non-registered-investments",
            label: "Non-Registered Investments",
            note: "Investing beyond the limits of registered plans.",
          },
          {
            href: "/wealth-building",
            label: "Wealth Planning",
            note: "Setting the goals a portfolio is built to serve.",
          },
        ]}
      />
    </>
  );
}
