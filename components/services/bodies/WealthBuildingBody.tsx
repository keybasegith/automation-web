import {
  Compass,
  TrendingUp,
  PiggyBank,
  ShieldCheck,
  Landmark,
  Users,
} from "lucide-react";
import Reveal from "@/components/home/Reveal";
import ServiceSection from "@/components/services/ServiceSection";
import ServiceFaq, { type FaqItem } from "@/components/services/ServiceFaq";
import ServiceCta from "@/components/services/ServiceCta";

const PILLARS = [
  {
    icon: Compass,
    title: "Financial Planning",
    body: "A clear, written roadmap that connects your goals, timeline, and resources — the foundation every other decision builds on.",
  },
  {
    icon: TrendingUp,
    title: "Investment Strategy",
    body: "A disciplined, diversified portfolio aligned to your goals and risk tolerance, designed to grow your wealth over time.",
  },
  {
    icon: PiggyBank,
    title: "Retirement Income",
    body: "Turn a lifetime of saving into dependable, tax-efficient income that supports the lifestyle you've worked toward.",
  },
  {
    icon: Landmark,
    title: "Tax Efficiency",
    body: "Coordinate accounts, income, and investments to reduce what you owe and keep more of what you earn working for you.",
  },
  {
    icon: ShieldCheck,
    title: "Risk & Protection",
    body: "Insurance and contingency planning that shields your family and your wealth from the unexpected.",
  },
  {
    icon: Users,
    title: "Estate & Legacy",
    body: "Plan the orderly, tax-aware transfer of your wealth so more of it reaches the people and causes you care about.",
  },
];

const STEPS = [
  {
    title: "Understand your goals",
    body: "We start by listening — to your priorities, your timeline, and what financial success means to you and your family.",
  },
  {
    title: "Build the plan",
    body: "We bring investments, retirement, tax, and estate strategy together into one coordinated, written wealth plan.",
  },
  {
    title: "Put it to work",
    body: "We implement the strategy across your accounts, keeping every piece aligned and pulling in the same direction.",
  },
  {
    title: "Review & adapt",
    body: "As markets, tax rules, and your life evolve, we revisit the plan to keep it on course over the long term.",
  },
];

const FAQ: FaqItem[] = [
  {
    question: "What does a wealth plan include?",
    answer: [
      "A wealth plan starts from your goals and timeline, then works through the areas that support them: a written financial plan, an investment strategy matched to your risk tolerance, a retirement income approach, tax-efficient structuring of accounts and income, insurance and contingency planning, and an estate strategy.",
      "The weight given to each area depends on your circumstances. Not every plan needs equal attention on every front.",
    ],
  },
  {
    question: "How are investments and tax planning connected?",
    answer: [
      "Where an investment is held affects what you ultimately keep. Interest, dividends, and capital gains are taxed differently, and registered accounts such as RRSPs and TFSAs treat growth and withdrawals differently again.",
      "Deciding which assets sit in which accounts — and, later, the order income is drawn from them — is part of building the plan rather than something handled at year end.",
    ],
  },
  {
    question: "How often should a financial plan be reviewed?",
    answer: [
      "At least annually, and sooner whenever something material changes: a new job or business, a marriage or separation, a birth, an inheritance, a property purchase, or a shift in your intended retirement date. Tax rules and market conditions move as well.",
      "Reviews are what keep a plan accurate. Without them it becomes a document you filed once rather than a strategy you are actually following.",
    ],
  },
  {
    question: "Is wealth planning the same as investment management?",
    answer: [
      "No — investment management is one component of it. A wealth plan sets the objectives the portfolio is meant to serve, then coordinates it with retirement income, tax, protection, and estate decisions.",
      "Put simply: the portfolio answers how your money is invested, and the plan answers what it is for.",
    ],
  },
  {
    question: "When should I work with a financial advisor?",
    answer: [
      "There is no single trigger. People often begin when decisions start interacting — when saving, tax, and investment choices affect one another, when retirement moves from an idea to a date, or when a business, property, or inheritance adds complexity.",
      "Starting earlier gives a plan more time to work, but a plan can be built at any stage.",
    ],
  },
];

/**
 * The wealth-building page body — every section below the hero.
 *
 * Lives apart from the route so both the standalone /wealth-building page and the
 * tabbed /services/wealth-building view render exactly the same content.
 */
export default function WealthBuildingBody() {
  return (
    <>
      {/* ---------- What it is (direct answer) ---------- */}
      <ServiceSection
        eyebrow="In Short"
        heading="What is wealth planning?"
        tone="muted"
        divider={false}
      >
        <p>
          Wealth planning is the coordinated management of your whole financial
          life. Rather than treating investments, retirement income, tax
          strategy, and estate planning as separate decisions, a wealth plan
          measures them against your goals and timeline and keeps them working
          together.
        </p>
        <p>
          At Keybase Financial Group that plan is written down, put into effect
          across your accounts, and revisited as your circumstances and the
          markets change.
        </p>
      </ServiceSection>

      {/* ---------- Why it matters ---------- */}
      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Why It Matters
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              One plan, working together.
            </h2>
          </Reveal>
          <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
            <p>
              Most people&rsquo;s finances are a collection of separate
              decisions — an investment here, a savings account there, insurance
              bought years ago. Each may be reasonable on its own, yet without a
              plan tying them together, opportunities are missed and risks go
              unmanaged.
            </p>
            <p>
              Wealth planning brings every piece into focus. By coordinating your
              investments, retirement income, tax strategy, and estate plan, we
              help each decision reinforce the others — so your money works
              harder and your plan stays resilient through every stage of life.
            </p>
            <p>
              At Keybase Financial Group, our advisors build that plan with you,
              and stand beside you to keep it on track as your life and the
              markets change.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- A plan built around you ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Built Around You
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                A Plan Built Around Your Life
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                No two financial lives are the same. Whether you&rsquo;re building
                your career, growing a business, approaching retirement, or
                planning the wealth you&rsquo;ll leave behind, your plan should
                reflect where you are and where you want to go.
              </p>
              <p>
                Together, we craft a strategy designed to give you clarity today
                and confidence in the future — so you can make decisions with
                purpose, knowing every part of your plan is working toward the
                same goals.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- How We Help ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              How We Help
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Every part of your financial life.
            </h2>
          </Reveal>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((pillar, i) => {
              const Icon = pillar.icon;
              return (
                <Reveal
                  key={pillar.title}
                  delay={(i % 3) * 110}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#0a1f33]/20 hover:shadow-[0_28px_60px_-32px_rgba(10,31,51,0.45)]"
                >
                  {/* top accent bar reveals on hover */}
                  <span
                    className="pointer-events-none absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#0a1f33] to-[#006d6e] transition-transform duration-300 group-hover:scale-x-100"
                    aria-hidden
                  />
                  <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#0a1f33] text-white transition-colors duration-300 group-hover:bg-[#006d6e]">
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-7 font-serif text-2xl font-normal text-[#0a1f33]">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 flex-1 text-[15px] leading-relaxed text-[#5b6573]">
                    {pillar.body}
                  </p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- The Process (timeline) ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              The Process
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Four steps to an integrated plan.
            </h2>
          </Reveal>

          <div className="mt-16 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <Reveal
                key={step.title}
                delay={i * 110}
                className="flex flex-col lg:border-l lg:border-black/15 lg:pl-12"
              >
                <span className="font-serif text-[44px] leading-none text-[#0a1f33]/20">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-6 font-serif text-2xl font-normal text-[#0a1f33]">
                  {step.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[#5b6573]">
                  {step.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Who it is for ---------- */}
      <ServiceSection eyebrow="Who We Work With" heading="Who wealth planning is for">
        <p>
          Wealth planning matters most once several financial decisions start
          affecting one another at the same time. That includes professionals
          building career earnings, families balancing long-term saving against
          day-to-day commitments, business owners whose personal and corporate
          finances are intertwined, people approaching retirement who need
          savings to become income, and families preparing to transfer wealth to
          the next generation.
        </p>
        <p>
          It is not a service reserved for one level of wealth. What it asks for
          is a willingness to look at the whole picture rather than one account
          at a time.
        </p>
      </ServiceSection>

      <ServiceFaq heading="Questions about wealth planning." items={FAQ} />

      <ServiceCta
        heading="Build a plan that works as one."
        body="A Keybase advisor can review where you stand today and show you how investments, retirement income, tax, and estate decisions fit together in a single written plan."
        related={[
          {
            href: "/retirement-planning",
            label: "Retirement Planning",
            note: "Turning savings and benefits into income that lasts.",
          },
          {
            href: "/tax-planning",
            label: "Tax Planning",
            note: "Structuring accounts and income to improve what you keep.",
          },
          {
            href: "/estate-planning",
            label: "Estate Planning",
            note: "Passing wealth on with less cost and more clarity.",
          },
        ]}
      />
    </>
  );
}
