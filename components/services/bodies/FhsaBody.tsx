import {
  Check,
  BadgePercent,
  TrendingUp,
  KeyRound,
  Landmark,
  ArrowRightLeft,
} from "lucide-react";
import Reveal from "@/components/home/Reveal";

/* The "best of both" summary — combining RRSP and TFSA advantages. */
const BEST_OF_BOTH = [
  "Tax-deductible contributions",
  "Tax-sheltered growth",
  "Tax-free qualifying withdrawals",
];

/* When an FHSA must close — the earliest of these events. */
const LIFESPAN = [
  "The 15th anniversary of opening your first FHSA",
  "The end of the year you turn 71",
  "The end of the year following your first qualifying withdrawal",
];

/* Contribution figures. */
const LIMITS = [
  {
    value: "$8,000",
    label: "Annual contribution limit",
  },
  {
    value: "$40,000",
    label: "Lifetime contribution limit",
  },
];

/* Why the FHSA is uniquely powerful. */
const BENEFITS = [
  {
    icon: BadgePercent,
    title: "Tax-Deductible Contributions",
    body: "FHSA contributions can reduce your taxable income, similar to RRSP contributions.",
  },
  {
    icon: TrendingUp,
    title: "Tax-Free Growth",
    body: "Investment income and gains earned inside the account are not taxed while they remain in the FHSA.",
  },
  {
    icon: KeyRound,
    title: "Tax-Free Qualifying Withdrawals",
    body: "If the withdrawal meets the qualifying home purchase rules, the funds can be withdrawn tax-free.",
  },
  {
    icon: Landmark,
    title: "Works With the Home Buyers' Plan",
    highlight: "HBP limit: $60,000",
    body: "Eligible buyers may use both the FHSA and the RRSP Home Buyers' Plan for the same qualifying home purchase.",
  },
  {
    icon: ArrowRightLeft,
    title: "Transfer Options",
    body: "If unused for a home, funds may generally be transferred to an RRSP or RRIF on a tax-deferred basis, subject to applicable rules.",
  },
];

/* What an FHSA can hold. */
const INVESTMENTS = [
  "Mutual Funds",
  "Publicly Traded Securities",
  "Bonds",
  "GICs",
];

/**
 * The fhsa page body — every section below the hero.
 *
 * Lives apart from the route so both the standalone /fhsa page and the
 * tabbed /services/fhsa view render exactly the same content.
 */
export default function FhsaBody() {
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
              The Best of Both Worlds
            </h2>
          </Reveal>
          <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
            <p>
              The FHSA combines key benefits of both an RRSP and a TFSA.
              Contributions are generally tax-deductible, investment growth is
              tax-sheltered, and qualifying withdrawals used to purchase a first
              home are tax-free.
            </p>
            <ul className="flex flex-wrap gap-2.5 pt-1">
              {BEST_OF_BOTH.map((item) => (
                <li
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#f7f9fa] px-4 py-2 text-[14px] font-medium text-[#1a2433]"
                >
                  <Check className="h-4 w-4 text-[#006d6e]" strokeWidth={2.25} />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ---------- Who Can Open an FHSA ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Eligibility
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Who Can Open an FHSA
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
                To open an FHSA, you must be a Canadian resident, at least 18 years
                old, and a first-time home buyer. In general, this means you or
                your spouse or common-law partner must not have owned and lived in
                a qualifying home in the year the account is opened or during the
                previous four calendar years.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <div className="rounded-sm border border-black/10 bg-white p-8 sm:p-9">
                <h3 className="text-[19px] font-semibold leading-snug text-[#0a1f33]">
                  How long an FHSA can stay open
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#5b6573]">
                  Your FHSA can remain open until the earliest of the following:
                </p>
                <ul className="mt-6 space-y-4">
                  {LIFESPAN.map((item) => (
                    <li key={item} className="flex items-baseline gap-3">
                      <Check
                        className="relative top-[4px] h-[18px] w-[18px] flex-none text-[#006d6e]"
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

      {/* ---------- Contribution Limits ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Contribution Limits
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                What You Can Contribute
              </h2>
            </Reveal>

            <Reveal delay={120}>
              <dl className="grid gap-px overflow-hidden rounded-sm border border-black/10 bg-black/10 sm:grid-cols-2">
                {LIMITS.map((item) => (
                  <div key={item.value} className="flex flex-col bg-white p-8">
                    <dt className="font-serif text-[44px] font-normal leading-none tracking-tight text-[#0a1f33] sm:text-[50px]">
                      {item.value}
                    </dt>
                    <dd className="mt-3 text-[15px] leading-relaxed text-[#5b6573]">
                      {item.label}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 space-y-4 text-[16px] leading-relaxed text-[#5b6573]">
                <p>
                  Unused contribution room can be carried forward, subject to
                  certain limits. You may hold more than one FHSA, but your total
                  contributions across all FHSAs must stay within your annual and
                  lifetime limits.
                </p>
                <p className="border-l-2 border-black/15 pl-5 text-[14px]">
                  Over-contributions may be subject to a 1% monthly tax on the
                  excess amount.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Key Benefits ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Key Benefits
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Built for First-Time Buyers
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
                {item.highlight && (
                  <span className="mt-2 inline-flex w-fit items-center rounded-full bg-[#e6f1f1] px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#006d6e]">
                    {item.highlight}
                  </span>
                )}
                <p className="mt-3 text-[15px] leading-relaxed text-[#5b6573]">
                  {item.body}
                </p>
              </Reveal>
            ))}

            {/* Qualified investments — fills the sixth cell of the grid */}
            <Reveal delay={180} className="flex flex-col bg-[#0a1f33] p-8 text-white">
              <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white/60">
                Qualified Investments
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-white/80">
                An FHSA can hold many of the same qualified investments as an RRSP
                or TFSA:
              </p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {INVESTMENTS.map((item) => (
                  <li
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-[13px] font-medium text-white/90"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#4fd1c5]" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Withdrawals ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Accessing the Funds
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Withdrawals
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                To make a tax-free qualifying withdrawal, you must meet the FHSA
                withdrawal conditions. In general, you must have a written
                agreement to buy or build a qualifying home in Canada, intend to
                occupy it as your principal residence, and remain a Canadian
                resident from the time of withdrawal until the home is acquired.
              </p>
              <p>
                Withdrawals that do not meet the qualifying conditions are
                generally taxable and may be subject to withholding tax.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Plan for Your First Home with Confidence ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                The Right Foundation
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Plan for Your First Home with Confidence
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                Saving for a first home can feel overwhelming, but the right
                account structure can help your money work harder toward your goal.
              </p>
              <p>
                At Keybase Financial Group, our advisors can help you understand
                FHSA eligibility, contribution limits, investment options, and how
                an FHSA may fit alongside your RRSP, TFSA, and overall financial
                plan.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

    </>
  );
}
