import {
  TrendingUp,
  Wallet,
  Unlock,
  CalendarPlus,
  RefreshCw,
  Infinity as InfinityIcon,
} from "lucide-react";
import Reveal from "@/components/home/Reveal";

/* What a TFSA can help you save for. */
const GOALS = [
  "Emergency Fund",
  "Travel",
  "A First Home",
  "Future Investments",
  "Retirement",
];

/* Contribution-room figures. */
const ROOM_FACTS = [
  {
    value: "$7,000",
    label: "Annual TFSA contribution limit for 2026",
  },
  {
    value: "$109,000",
    label:
      "Possible cumulative room if eligible since 2009 and never contributed",
  },
];

/* Why a TFSA is so versatile. */
const BENEFITS = [
  {
    icon: TrendingUp,
    title: "Tax-Free Growth",
    body: "Investment income earned inside a TFSA is not taxed, allowing your savings to grow more efficiently over time.",
  },
  {
    icon: Wallet,
    title: "Tax-Free Withdrawals",
    body: "You can withdraw funds from your TFSA without paying tax on the amount withdrawn.",
  },
  {
    icon: Unlock,
    title: "Flexible Access",
    body: "A TFSA works for both short-term and long-term goals, giving you access to your money when you need it.",
  },
  {
    icon: CalendarPlus,
    title: "Unused Room Carries Forward",
    body: "Any unused contribution room carries forward, letting you contribute more in future years.",
  },
  {
    icon: RefreshCw,
    title: "Withdrawals Create Future Room",
    body: "When you withdraw, that amount is added back to your contribution room at the beginning of the next calendar year.",
  },
  {
    icon: InfinityIcon,
    title: "No Maximum Age Limit",
    body: "Unlike an RRSP, there is no age-based maturity requirement. Keep contributing as long as you are eligible and have room.",
  },
];

/**
 * The tfsa page body — every section below the hero.
 *
 * Lives apart from the route so both the standalone /tfsa page and the
 * tabbed /services/tfsa view render exactly the same content.
 */
export default function TfsaBody() {
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
              What Is a TFSA
            </h2>
          </Reveal>
          <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
            <p>
              Unlike an RRSP, TFSA contributions are not tax-deductible. However,
              any income earned inside the account — including interest,
              dividends, and capital gains — is not taxed when withdrawn. This
              makes a TFSA a valuable tool for both short-term savings and
              long-term financial goals.
            </p>
            <p>A TFSA can be used to save for many priorities, including:</p>
            <ul className="flex flex-wrap gap-2.5 pt-1">
              {GOALS.map((goal) => (
                <li
                  key={goal}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#f7f9fa] px-4 py-2 text-[14px] font-medium text-[#1a2433]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#006d6e]" />
                  {goal}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ---------- Who Can Open a TFSA ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Eligibility
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Who Can Open a TFSA
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
                Canadian residents who are 18 years of age or older and have a
                valid Social Insurance Number can open and contribute to a TFSA.
                Contribution room begins accumulating once you become eligible,
                even if you have not opened an account yet.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <dl className="grid gap-px overflow-hidden rounded-sm border border-black/10 bg-black/10 sm:grid-cols-2">
                {ROOM_FACTS.map((fact) => (
                  <div key={fact.value} className="flex flex-col bg-white p-8">
                    <dt className="font-serif text-[40px] font-normal leading-none tracking-tight text-[#0a1f33] sm:text-[44px]">
                      {fact.value}
                    </dt>
                    <dd className="mt-3 text-[15px] leading-relaxed text-[#5b6573]">
                      {fact.label}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 border-l-2 border-black/15 pl-5 text-[14px] leading-relaxed text-[#5b6573]">
                TFSA withdrawals are added back to your contribution room on
                January 1 of the following calendar year — not immediately in the
                same year. Your personal contribution room should always be
                confirmed through CRA My Account and your own contribution records.
                Learn more at{" "}
                <a
                  href="https://www.canada.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#006d6e] underline-offset-2 hover:underline"
                >
                  Canada.ca
                </a>
                .
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Key Benefits ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Key Benefits
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Flexibility, Free of Tax
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-px overflow-hidden rounded-sm border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((item, i) => (
              <Reveal
                key={item.title}
                delay={(i % 3) * 90}
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

      {/* ---------- A Flexible Tool for Every Stage ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Every Stage of Life
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                A Flexible Tool for Every Stage
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                Whether you are building an emergency fund, saving for a major
                purchase, investing for the future, or creating additional
                retirement flexibility, a TFSA can play an important role in your
                financial plan.
              </p>
              <p>
                At Keybase Financial Group, our advisors can help you choose the
                right TFSA strategy, understand your contribution room, and align
                your investments with your goals.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

    </>
  );
}
