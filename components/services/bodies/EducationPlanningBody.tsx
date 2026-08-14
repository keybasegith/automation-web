import {
  GraduationCap,
  PiggyBank,
  Gift,
  TrendingUp,
  Users,
  CalendarCheck,
} from "lucide-react";
import Reveal from "@/components/home/Reveal";

const PILLARS = [
  {
    icon: PiggyBank,
    title: "RESP Setup & Strategy",
    body: "Open and structure a Registered Education Savings Plan — individual or family — sized to your timeline, contribution capacity, and the number of children you're planning for.",
  },
  {
    icon: Gift,
    title: "Maximizing Government Grants",
    body: "Capture the grants you're entitled to, including the Canada Education Savings Grant (CESG) and, where eligible, the Canada Learning Bond — so your savings work harder from day one.",
  },
  {
    icon: TrendingUp,
    title: "Tax-Advantaged Growth",
    body: "Let investments compound on a tax-deferred basis inside the plan, with a portfolio aligned to how many years remain before the first tuition payment is due.",
  },
  {
    icon: CalendarCheck,
    title: "Withdrawal Planning",
    body: "Draw down Educational Assistance Payments tax-efficiently once school begins, coordinating timing to keep more of the grant and growth in your family's hands.",
  },
  {
    icon: Users,
    title: "Multi-Child & Family Plans",
    body: "Balance contributions across multiple children, share grants flexibly, and adapt the plan as goals, schools, and circumstances change over time.",
  },
  {
    icon: GraduationCap,
    title: "Whether Child or Grandchild",
    body: "Plan for the people who matter most across generations, evaluating the savings and investment options that best support your long-term objectives.",
  },
];

const SOLUTIONS = [
  {
    icon: GraduationCap,
    name: "Registered Education Savings Plan",
    abbr: "RESP",
    body: "A Registered Education Savings Plan, or RESP, is a dedicated investment account designed to help families save for a child's post-secondary education. RESPs may also provide access to government grants, helping your savings grow more efficiently over time.",
  },
  {
    icon: PiggyBank,
    name: "Tax-Free Savings Account",
    abbr: "TFSA",
    body: "A Tax-Free Savings Account, or TFSA, offers flexibility for both short-term and long-term savings goals. Investment growth within a TFSA is tax-free, making it a valuable option for families seeking additional flexibility in their education planning strategy.",
  },
];

const STEPS = [
  {
    title: "Define the goal",
    body: "We map out the kind of education you're planning for, the years until it begins, and what it's likely to cost by then.",
  },
  {
    title: "Build the plan",
    body: "We open the right accounts, set a contribution schedule, and invest with a horizon-appropriate strategy.",
  },
  {
    title: "Capture every grant",
    body: "We structure contributions to maximize CESG and other incentives you qualify for, year after year.",
  },
  {
    title: "Review & adjust",
    body: "We revisit the plan annually, rebalancing and updating it as your family and goals evolve.",
  },
];

/**
 * The education-planning page body — every section below the hero.
 *
 * Lives apart from the route so both the standalone /education-planning page and the
 * tabbed /services/education-planning view render exactly the same content.
 */
export default function EducationPlanningBody() {
  return (
    <>
      {/* ---------- A thoughtful plan ---------- */}
      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Why It Matters
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              A thoughtful plan for the next generation.
            </h2>
          </Reveal>
          <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
            <p>
              Education is one of the most meaningful investments a family can
              make. As the cost of post-secondary education continues to rise, a
              thoughtful plan can help create more opportunity, more flexibility,
              and greater financial confidence for the next generation.
            </p>
            <p>
              Starting early matters. With the right strategy in place, families
              can take advantage of time, disciplined savings, and available
              government grants to help reduce the financial burden of future
              education costs.
            </p>
            <p>
              At Keybase Financial Group, our advisors work with you to create an
              education savings strategy aligned with your family&rsquo;s goals,
              timeline, and financial priorities.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- Invest in Their Tomorrow ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Plan Ahead
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Invest in Their Tomorrow
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                Children grow quickly, and the cost of education can arrive sooner
                than expected. Whether you are planning for a child or grandchild,
                we help you evaluate the savings and investment options available
                and determine which approach best supports your long-term
                objectives.
              </p>
              <p>
                Together, we can build a strategy designed to help your loved ones
                pursue their education with confidence.
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
              A complete education funding strategy.
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

      {/* ---------- Personalized Education Savings Solutions ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Solutions
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Personalized Education Savings Solutions
            </h2>
          </Reveal>

          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {SOLUTIONS.map((solution, i) => {
              const Icon = solution.icon;
              return (
                <Reveal
                  key={solution.abbr}
                  delay={i * 120}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#0a1f33]/20 hover:shadow-[0_28px_60px_-32px_rgba(10,31,51,0.45)] sm:p-10"
                >
                  {/* top accent bar reveals on hover */}
                  <span
                    className="pointer-events-none absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#0a1f33] to-[#006d6e] transition-transform duration-300 group-hover:scale-x-100"
                    aria-hidden
                  />
                  {/* ghost abbreviation */}
                  <span
                    className="pointer-events-none absolute right-7 top-6 select-none font-serif text-[40px] leading-none text-[#0a1f33]/[0.06]"
                    aria-hidden
                  >
                    {solution.abbr}
                  </span>

                  <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#0a1f33] text-white transition-colors duration-300 group-hover:bg-[#006d6e]">
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-7 font-serif text-2xl font-normal text-[#0a1f33]">
                    {solution.name}
                  </h3>
                  <p className="mt-3 flex-1 text-[15px] leading-relaxed text-[#5b6573]">
                    {solution.body}
                  </p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- The Process (timeline) ---------- */}
      <section className="border-t border-black/10 bg-white">
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

    </>
  );
}
