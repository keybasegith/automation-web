import {
  Wallet,
  PiggyBank,
  LineChart,
  Landmark,
  ShieldCheck,
  Compass,
} from "lucide-react";
import Reveal from "@/components/home/Reveal";
import ServiceSection from "@/components/services/ServiceSection";
import ServiceFaq, { type FaqItem } from "@/components/services/ServiceFaq";
import ServiceCta from "@/components/services/ServiceCta";

const PILLARS = [
  {
    icon: Wallet,
    title: "Retirement Income Planning",
    body: "Turn a lifetime of savings into dependable, tax-efficient income — so you know what you can spend, and for how long.",
  },
  {
    icon: PiggyBank,
    title: "RRSP & TFSA Strategy",
    body: "Make the most of registered and tax-free accounts, balancing contributions and withdrawals to keep more of what you've earned.",
  },
  {
    icon: Landmark,
    title: "Government Benefits",
    body: "Coordinate CPP and OAS timing alongside your savings to maximize lifetime benefits and reduce clawbacks where possible.",
  },
  {
    icon: LineChart,
    title: "Investment Strategy",
    body: "Invest with a strategy built for longevity — balancing growth, income, and stability as you move from saving to spending.",
  },
  {
    icon: ShieldCheck,
    title: "Protecting Your Income",
    body: "Plan for inflation, market downturns, and longevity, so a long retirement never outlasts the money meant to fund it.",
  },
  {
    icon: Compass,
    title: "The Path to Retirement",
    body: "Whether retirement is decades away or just around the corner, we help you map the road and stay on track at every stage.",
  },
];

const STEPS = [
  {
    title: "Picture retirement",
    body: "We define the lifestyle you want, when you want it, and what it will realistically cost to support.",
  },
  {
    title: "Build the plan",
    body: "We project your savings, benefits, and income sources, then close any gap with a disciplined savings and investment strategy.",
  },
  {
    title: "Create income",
    body: "As retirement nears, we structure tax-efficient withdrawals across your accounts and time government benefits.",
  },
  {
    title: "Review & adjust",
    body: "We revisit the plan as markets, tax rules, and your life change, keeping your income secure for the long term.",
  },
];

const FAQ: FaqItem[] = [
  {
    question: "When should I start retirement planning?",
    answer: [
      "Earlier gives a plan more room to work: contributions have longer to compound, and there is more time to change course. Planning becomes most concrete in the ten to fifteen years before retirement, when income needs, savings, and a target date can finally be tested against each other.",
      "There is no point at which it is too late to build a plan — only a different set of options at each stage.",
    ],
  },
  {
    question: "How much money will I need for retirement?",
    answer: [
      "It depends on the retirement you are planning for rather than on any universal figure. The work starts from the lifestyle you want and what it is likely to cost, then works back through your savings, expected government benefits, and any workplace pension to identify the gap your own investments have to close.",
      "Because the answer is specific to your circumstances, it is worth modelling properly rather than estimating with a rule of thumb.",
    ],
  },
  {
    question: "How do RRSPs and TFSAs fit into retirement planning?",
    answer: [
      "They behave differently at both ends. RRSP contributions are deductible and growth is tax-deferred, with withdrawals taxed as income. A TFSA is funded with after-tax money, and qualifying withdrawals are not taxed.",
      "That difference is why the mix between them — and the order you eventually draw from them — affects your taxable income in retirement, and can affect income-tested benefits along the way.",
    ],
  },
  {
    question: "When should I start CPP or OAS?",
    answer: [
      "Benefit timing is a planning decision, not a default. Starting later generally increases the monthly amount, while starting earlier provides income sooner. The right choice depends on your other income sources, your tax position, your health and family longevity, and whether you are still working.",
      "Because higher income can affect OAS, benefit timing is usually decided alongside your withdrawal strategy rather than in isolation.",
    ],
  },
  {
    question: "How do I create income in retirement?",
    answer: [
      "Retirement income is normally assembled from several sources rather than one: government benefits, any workplace pension, withdrawals from registered accounts, and non-registered investments.",
      "The plan sets how much is drawn from each and in what order, so the total meets your spending needs at a reasonable tax cost while the portfolio stays positioned for a retirement that may run several decades.",
    ],
  },
  {
    question: "What risks should a retirement plan account for?",
    answer: [
      "Three come up in almost every plan: inflation eroding purchasing power across a long retirement, market downturns arriving early while withdrawals are already underway, and longevity — living well beyond the period your savings were built to cover.",
      "A plan addresses these through the asset mix, the pace of withdrawals, and the balance between predictable income sources such as government benefits and market-based investments.",
    ],
  },
];

/**
 * The retirement-planning page body — every section below the hero.
 *
 * Lives apart from the route so both the standalone /retirement-planning page and the
 * tabbed /services/retirement-planning view render exactly the same content.
 */
export default function RetirementPlanningBody() {
  return (
    <>
      {/* ---------- What it is (direct answer) ---------- */}
      <ServiceSection
        eyebrow="In Short"
        heading="What is retirement planning?"
        tone="muted"
        divider={false}
      >
        <p>
          Retirement planning is the work of turning savings into income that
          lasts. It coordinates registered and non-registered savings, workplace
          and personal investments, and Canadian government benefits such as CPP
          and OAS into a schedule of withdrawals designed to fund the retirement
          you actually want.
        </p>
        <p>
          Because the order and timing of those withdrawals carry tax
          consequences, a retirement plan covers not only how much you
          accumulate but how and when you draw on it.
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
              Income that lasts as long as you do.
            </h2>
          </Reveal>
          <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
            <p>
              Retirement is one of the most significant financial transitions of
              your life. After decades of building wealth, the focus shifts from
              saving to spending — and that requires a different kind of plan.
            </p>
            <p>
              Canadians are living longer, and a comfortable retirement can span
              thirty years or more. The right strategy makes the most of your
              savings, coordinates government benefits, and turns it all into
              steady, tax-efficient income you can count on.
            </p>
            <p>
              At Keybase Financial Group, our advisors work with you to create a
              retirement plan aligned with your goals, timeline, and the lifestyle
              you&rsquo;ve worked so hard to enjoy.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- Plan for the life you want ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Plan Ahead
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Plan for the Life You Want
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                Retirement looks different for everyone — travel, time with family,
                a second act, or simply the freedom to slow down. Whatever yours
                looks like, we help you evaluate the savings and income options
                available and determine which approach best supports your goals.
              </p>
              <p>
                Together, we can build a strategy designed to give you the freedom,
                security, and peace of mind to enjoy retirement on your own terms.
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
              A complete retirement strategy.
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
              Four steps to a plan you can count on.
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
      <ServiceSection eyebrow="Who We Work With" heading="Who retirement planning is for" tone="white">
        <p>
          Retirement planning earns its keep in the years when the decisions
          become concrete: mid-career savers deciding how much to set aside and
          where, people within a decade of retiring who need to know whether
          their target date is realistic, those weighing when to start CPP and
          OAS, and retirees converting registered savings into income they can
          rely on.
        </p>
        <p>
          Business owners and professionals without a workplace pension often
          have the most to coordinate, since their retirement income depends
          entirely on what they build themselves.
        </p>
      </ServiceSection>

      <ServiceFaq heading="Questions about retirement." items={FAQ} tone="muted" />

      <ServiceCta
        heading="Find out whether your retirement date works."
        body="A Keybase advisor can model your savings, government benefits, and income needs together, then build a withdrawal strategy designed to last."
        related={[
          {
            href: "/rrsp",
            label: "RRSPs",
            note: "How registered retirement savings work, and where they fit.",
          },
          {
            href: "/tfsa",
            label: "TFSAs",
            note: "Tax-free growth and withdrawals alongside registered savings.",
          },
          {
            href: "/wealth-building",
            label: "Wealth Planning",
            note: "Coordinating retirement with tax, investment, and estate decisions.",
          },
        ]}
      />
    </>
  );
}
