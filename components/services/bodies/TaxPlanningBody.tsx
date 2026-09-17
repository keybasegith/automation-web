import { Check } from "lucide-react";
import Reveal from "@/components/home/Reveal";
import ServiceSection from "@/components/services/ServiceSection";
import ServiceFaq, { type FaqItem } from "@/components/services/ServiceFaq";
import ServiceCta from "@/components/services/ServiceCta";

const CONSIDERATIONS = [
  "Investment income allocation",
  "Registered investments",
  "Tax-Free Savings Accounts",
  "RRSP and RRIF strategies",
  "Borrowing to invest",
  "Income splitting opportunities",
  "Education funding strategies",
  "Estate preservation strategies",
  "Capital gains planning",
  "Tax shelter considerations",
];

const FAQ: FaqItem[] = [
  {
    question: "When should tax planning happen?",
    answer: [
      "Throughout the year, rather than at year end. By the time a return is being prepared, most of the decisions that shape it — where an investment was held, when a gain was realised, which account income was drawn from — have already been made.",
      "Building tax considerations into the plan from the start is what keeps those choices open.",
    ],
  },
  {
    question: "Why are different types of investment income taxed differently?",
    answer: [
      "Canadian tax rules treat interest, eligible dividends, and capital gains under different sets of rules, so two investments producing the same return can leave you with different amounts once tax is applied.",
      "Registered accounts add a further layer: growth inside them is sheltered, and what happens on withdrawal depends on the type of account. Which kind of income a holding produces is therefore part of deciding where to hold it.",
    ],
  },
  {
    question: "What is asset location?",
    answer: [
      "Asset location is the decision about which account an investment sits in — as distinct from asset allocation, which is the decision about what to hold in the first place.",
      "Because account types shelter and tax income differently, placing holdings thoughtfully across registered and non-registered accounts can improve after-tax returns without changing the overall investment mix at all.",
    ],
  },
  {
    question: "How does tax planning connect to retirement?",
    answer: [
      "Retirement is where years of accumulated decisions come due. The order in which registered, tax-free, and non-registered accounts are drawn affects your taxable income each year, which in turn can affect income-tested government benefits.",
      "Planning that sequence in advance is generally more effective than reacting to it once withdrawals are already underway.",
    ],
  },
  {
    question: "Does tax-efficient investing mean paying no tax?",
    answer: [
      "No. The aim is coordination rather than avoidance — reducing unnecessary tax so that more of your return stays invested and working toward the plan.",
      "Tax outcomes depend on your individual circumstances and on rules that change over time, which is why a strategy is reviewed periodically rather than set once and left alone.",
    ],
  },
];

/**
 * The tax-planning page body — every section below the hero.
 *
 * Lives apart from the route so both the standalone /tax-planning page and the
 * tabbed /services/tax-planning view render exactly the same content.
 */
export default function TaxPlanningBody() {
  return (
    <>
      {/* ---------- What it is (direct answer) ---------- */}
      <ServiceSection
        eyebrow="In Short"
        heading="What is tax-efficient investing?"
        tone="muted"
        divider={false}
      >
        <p>
          Tax-efficient investing means structuring a portfolio around what you
          keep after tax rather than what it earns before it. Different kinds of
          investment income — interest, dividends, and capital gains — are taxed
          under different rules, and registered accounts treat growth and
          withdrawals differently again.
        </p>
        <p>
          Coordinating which assets are held where, when gains are realised, and
          in what order income is drawn is what turns a set of individual
          investment decisions into a tax-aware strategy.
        </p>
      </ServiceSection>

      {/* ---------- Keep More of What You Earn ---------- */}
      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Why It Matters
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Keep More of What You Earn
            </h2>
          </Reveal>
          <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
            <p>
              Tax-efficient investing is a critical part of building and
              preserving wealth. Every investment decision has potential tax
              implications, and without a coordinated strategy, unnecessary taxes
              can reduce long-term returns and limit the impact of your financial
              plan.
            </p>
            <p>
              At Keybase Financial Group, our advisors help structure investment
              strategies with tax efficiency in mind. By aligning your portfolio,
              income needs, retirement goals, and estate objectives, we help you
              make more informed decisions about where and how your money is
              invested.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- A Strategic Advantage ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                The Approach
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                A Strategic Advantage
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                Tax planning should not begin at year-end. It should be built
                into your financial strategy from the start.
              </p>
              <p>
                Different types of investment income are taxed differently.
                Interest income, dividends, capital gains, registered
                investments, and tax-free accounts can each play a different role
                in your overall plan. A thoughtful approach can help reduce costs,
                improve after-tax returns, and support more efficient wealth
                accumulation over time.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Building and Preserving Wealth ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                The Long View
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Building and Preserving Wealth
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                Tax-efficient investing is not only about reducing taxes today.
                It is about creating a stronger foundation for tomorrow.
              </p>
              <p>
                With the right strategy, investors can better manage taxable
                income, maximize registered account opportunities, preserve
                retirement assets, and support the future transfer of wealth to
                loved ones.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Tax-Efficient Planning Considerations ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                What We Consider
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Tax-Efficient Planning Considerations
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
                Every plan is different. These are some of the areas our advisors
                review to build a strategy tailored to your goals.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <ul className="grid border-t border-black/10 sm:grid-cols-2 sm:gap-x-14">
                {CONSIDERATIONS.map((item) => (
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

      {/* ---------- Integrated Advice for Long-Term Goals ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Integrated Advice
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Advice for Long-Term Goals
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                A strong financial plan looks beyond investment performance alone.
                It considers how taxes, retirement income, estate planning, and
                long-term wealth preservation work together.
              </p>
              <p>
                Our advisors review your financial position and help identify
                tax-efficient strategies designed to support your retirement and
                estate planning objectives.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Where it makes the most difference ---------- */}
      <ServiceSection eyebrow="Who We Work With" heading="Where tax planning makes the most difference" tone="muted">
        <p>
          Tax planning has the largest effect where income is high, uneven, or
          drawn from several sources at once. That includes investors holding
          assets outside registered accounts, people whose registered
          contribution room is already used, business owners and incorporated
          professionals balancing salary against dividends, those close enough to
          retirement that withdrawal order starts to matter, and anyone planning
          the transfer of assets to the next generation.
        </p>
        <p>
          It also matters earlier than most people expect. Decisions about where
          an investment is held are easiest to make when an account is opened —
          changing course years later can itself trigger tax.
        </p>
      </ServiceSection>

      <ServiceFaq heading="Questions about tax planning." items={FAQ} tone="white" />

      <ServiceCta
        heading="Keep more of what your portfolio earns."
        body="A Keybase advisor can review how your accounts, income, and investments are currently structured, and show you where a more tax-aware approach would make a difference."
        tone="muted"
        related={[
          {
            href: "/retirement-planning",
            label: "Retirement Planning",
            note: "Where withdrawal order and benefit timing meet tax.",
          },
          {
            href: "/non-registered-investments",
            label: "Non-Registered Investments",
            note: "Investing outside registered plans, with tax in mind.",
          },
          {
            href: "/estate-planning",
            label: "Estate Planning",
            note: "The tax an estate triggers, and how it is planned for.",
          },
        ]}
      />
    </>
  );
}
