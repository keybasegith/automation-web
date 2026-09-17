import {
  Check,
  ShieldCheck,
  Building2,
  Activity,
  Briefcase,
  Landmark,
  Droplets,
  Gem,
  Waves,
} from "lucide-react";
import Reveal from "@/components/home/Reveal";
import ServiceSection from "@/components/services/ServiceSection";
import ServiceFaq, { type FaqItem } from "@/components/services/ServiceFaq";
import ServiceCta from "@/components/services/ServiceCta";

/* The strategies that fall outside traditional asset classes. */
const STRATEGIES = [
  "Private Real Estate",
  "Private Equity",
  "Private Debt",
  "Hedge Funds",
  "Precious Metals",
  "Flow-Through Shares",
  "Liquid Alternatives",
  "Exempt Market Products",
];

/* Ways alternatives may strengthen a portfolio. */
const REASONS = [
  "Diversify beyond traditional stocks and bonds",
  "Reduce overall portfolio correlation to public markets",
  "Access private market opportunities",
  "Support income, growth, or capital preservation objectives",
  "Strengthen a broader long-term investment strategy",
];

/* The specific opportunities Keybase advisors can explore. */
const OPTIONS = [
  { icon: Building2, title: "Private Real Estate" },
  { icon: Activity, title: "Hedge Funds" },
  { icon: Briefcase, title: "Private Equity" },
  { icon: Landmark, title: "Private Debt", note: "Including mortgage pools" },
  { icon: Droplets, title: "Flow-Through Shares" },
  {
    icon: Gem,
    title: "Precious Metals",
    note: "Gold, silver, and platinum bullion",
  },
  { icon: Waves, title: "Liquid Alternatives" },
];

/* Considerations that set alternatives apart. */
const RISK_FACTORS = [
  "Liquidity restrictions",
  "Valuation complexity",
  "Higher risk",
  "Different regulatory considerations",
];

const FAQ: FaqItem[] = [
  {
    question: "What makes an investment \u201calternative\u201d?",
    answer: [
      "The label covers strategies and assets that sit outside the traditional public-market categories of equities, fixed income, and cash. Through Keybase that includes private real estate, private equity, private debt, hedge funds, precious metals, flow-through shares, liquid alternatives, and other exempt market products.",
      "What they have in common is that their returns can behave differently from public markets — not that they behave like one another.",
    ],
  },
  {
    question: "What is the exempt market?",
    answer: [
      "The exempt market is the part of the securities market where certain investments may be offered without a prospectus, often involving private companies or opportunities that are not publicly traded.",
      "Keybase Financial Group is registered as an Exempt Market Dealer, which is what allows us to provide access to those products. Because the disclosure available differs from public markets, these investments call for closer review.",
    ],
  },
  {
    question: "What risks do alternative investments carry?",
    answer: [
      "They differ by strategy, but the considerations that recur are liquidity restrictions — capital may be committed for a defined period — valuation complexity, higher risk, and different regulatory considerations from publicly traded investments.",
      "These are the reasons alternatives warrant deeper due diligence and a formal suitability assessment rather than a straightforward comparison of expected returns.",
    ],
  },
  {
    question: "How much of a portfolio should be in alternatives?",
    answer: [
      "There is no standard proportion. An appropriate allocation depends on the rest of your portfolio, your time horizon, how much liquidity you need, and your capacity to absorb risk.",
      "Alternatives are generally used as a diversifying component alongside a traditional core, rather than as a replacement for one.",
    ],
  },
  {
    question: "Can anyone invest in exempt market products?",
    answer: [
      "No. Eligibility is set out in securities regulation and depends on criteria relating to an investor\u2019s circumstances, and every recommendation is subject to a suitability assessment.",
      "Part of an advisor\u2019s role is establishing whether a given opportunity is appropriate for you at all, before any discussion of whether it looks attractive.",
    ],
  },
];

/**
 * The alternative-investments page body — every section below the hero.
 *
 * Lives apart from the route so both the standalone /alternative-investments page and the
 * tabbed /services/alternative-investments view render exactly the same content.
 */
export default function AlternativeInvestmentsBody() {
  return (
    <>
      {/* ---------- Overview ---------- */}
      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Overview
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              A Different Kind of Opportunity
            </h2>
          </Reveal>
          <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
            <p>
              Alternative investments refer to opportunities outside of
              traditional asset classes. These strategies may include private real
              estate, private equity, private debt, hedge funds, precious metals,
              flow-through shares, liquid alternatives, and other exempt market
              products.
            </p>
            <p>The alternative universe spans a wide range of strategies:</p>
            <ul className="flex flex-wrap gap-2.5 pt-1">
              {STRATEGIES.map((item) => (
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

      {/* ---------- Exempt Market Dealer ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal>
            <div className="overflow-hidden rounded-sm bg-[#0a1f33] px-8 py-12 text-white sm:px-12 sm:py-14">
              <div className="grid gap-10 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-16">
                <div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-[#4fd1c5]">
                    <ShieldCheck className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <p className="mt-6 text-[13px] font-semibold uppercase tracking-[0.22em] text-white/60">
                    A Registered Credential
                  </p>
                  <h2 className="mt-4 font-serif text-[32px] font-normal leading-[1.12] tracking-tight sm:text-[40px]">
                    Exempt Market Dealer
                  </h2>
                </div>
                <div className="space-y-6 text-lg leading-relaxed text-white/80 lg:pt-2">
                  <p>
                    Keybase Financial Group is registered as an Exempt Market
                    Dealer, allowing us to provide access to certain exempt market
                    investment products.
                  </p>
                  <p>
                    The exempt market allows eligible securities to be offered
                    without a prospectus, often involving private companies or
                    opportunities that are not publicly traded. Because these
                    investments can be more complex and may carry unique risks,
                    they require careful review, proper suitability assessment, and
                    professional guidance.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Why Consider Alternative Investments ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                The Rationale
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Why Consider Alternative Investments
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
                Alternatives are an increasingly important part of modern portfolio
                construction, helping investors access opportunities not available
                through public markets alone. When used appropriately, they may
                help:
              </p>
            </Reveal>

            <Reveal delay={120}>
              <ul className="grid border-t border-black/10 sm:grid-cols-2 sm:gap-x-14">
                {REASONS.map((item) => (
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

      {/* ---------- Alternative Investment Options ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              What We Can Explore
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Alternative Investment Options
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
              Keybase advisors can help you explore a range of alternative
              opportunities, including:
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {OPTIONS.map((item, i) => (
              <Reveal
                key={item.title}
                delay={(i % 3) * 80}
                className="flex items-center gap-4 rounded-sm border border-black/10 bg-white p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#006d6e]/30 hover:shadow-lg hover:shadow-black/[0.06]"
              >
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-[#e6f1f1] text-[#006d6e]">
                  <item.icon className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <div>
                  <h3 className="text-[18px] font-semibold leading-snug text-[#0a1f33]">
                    {item.title}
                  </h3>
                  {item.note && (
                    <p className="mt-0.5 text-[14px] leading-snug text-[#5b6573]">
                      {item.note}
                    </p>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Our Expertise ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Due Diligence
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Our Expertise
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-7 text-lg leading-relaxed text-[#5b6573]">
              <p>
                Alternative investments can offer meaningful opportunities, but
                they also require a deeper level of due diligence. Compared to
                traditional investments, these products may involve:
              </p>
              <ul className="flex flex-wrap gap-2.5">
                {RISK_FACTORS.map((item) => (
                  <li
                    key={item}
                    className="inline-flex items-center rounded-full border border-[#c9522c]/25 bg-[#fbf1ec] px-4 py-2 text-[14px] font-medium text-[#9a3f1f]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
              <p>
                At Keybase Financial Group, our advisors help clients understand how
                alternative investments work, assess suitability, and determine
                whether they fit within the client&rsquo;s overall portfolio and
                financial goals.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Diversifying with Alternatives ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                The Bigger Picture
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Diversifying with Alternatives
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                A well-structured portfolio is not only about chasing returns. It
                is about building the right mix of investments for your goals, risk
                tolerance, and time horizon. Alternatives may provide another layer
                of diversification through exposure to assets that can behave
                differently from traditional public markets.
              </p>
              <p>
                At Keybase Financial Group, we help you evaluate alternative
                investment opportunities with clarity, discipline, and confidence.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Who it is for ---------- */}
      <ServiceSection eyebrow="Who We Work With" heading="Who alternative investments may suit" tone="muted">
        <p>
          Alternatives are not a general-purpose holding. They are typically
          considered by investors who already have a diversified base of
          traditional investments in place, who have a long enough time horizon
          to accept that capital may be committed for extended periods, and who
          can absorb the possibility of loss on part of their portfolio.
        </p>
        <p>
          Access is also a regulatory matter. Exempt market products are offered
          under prospectus exemptions, and eligibility depends on criteria set
          out in securities regulation as well as on a suitability assessment. A
          Keybase advisor works through both before any alternative investment
          is recommended.
        </p>
      </ServiceSection>

      <ServiceFaq heading="Questions about alternatives." items={FAQ} tone="white" />

      <ServiceCta
        heading="Assess alternatives with the right scrutiny."
        body="A Keybase advisor can help you understand how a given strategy actually works, assess suitability, and decide whether it belongs in your portfolio at all."
        tone="muted"
        related={[
          {
            href: "/traditional-investments",
            label: "Traditional Investments",
            note: "The public-market core alternatives are meant to complement.",
          },
          {
            href: "/non-registered-investments",
            label: "Non-Registered Investments",
            note: "The account type many alternative holdings sit in.",
          },
          {
            href: "/wealth-building",
            label: "Wealth Planning",
            note: "Setting the goals and risk tolerance behind the allocation.",
          },
        ]}
      />
    </>
  );
}
