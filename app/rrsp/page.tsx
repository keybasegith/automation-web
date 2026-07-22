import Link from "next/link";
import {
  ArrowRight,
  Check,
  User,
  Heart,
  Building2,
  BadgePercent,
  Sprout,
  CalendarPlus,
  Compass,
  Home,
  GraduationCap,
} from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import Reveal from "@/components/home/Reveal";
import ServiceHero from "@/components/home/ServiceHero";
import { getPublishedServicePage } from "@/lib/cms/public";

export async function generateMetadata() {
  const page = await getPublishedServicePage("rrsp");
  return { title: page.seoTitle, description: page.seoDescription };
}

/* What an RRSP can hold. */
const INVESTMENTS = ["Mutual Funds", "Equities", "Bonds", "GICs"];

/* Key contribution figures for the current year. */
const CONTRIBUTION_FACTS = [
  {
    value: "18%",
    label: "Of your previous year's earned income, up to the annual limit",
  },
  {
    value: "$33,810",
    label: "RRSP dollar limit for 2026",
  },
  {
    value: "March 2, 2026",
    label: "Contribution deadline for the 2025 tax year",
  },
];

/* The three RRSP structures. */
const TYPES = [
  {
    icon: User,
    title: "Individual RRSP",
    body: "Registered in your name. You own the investments, receive the tax deduction, and control how the funds are managed within the plan.",
  },
  {
    icon: Heart,
    title: "Spousal RRSP",
    body: "Registered in your spouse or common-law partner's name. You make the contributions, but they own the account — which may help couples manage retirement income more efficiently.",
  },
  {
    icon: Building2,
    title: "Group RRSP",
    body: "Offered through an employer to help employees save for retirement. Contributions may be made through payroll deductions and may include employer matching.",
  },
];

/* Why an RRSP works. */
const BENEFITS = [
  {
    icon: BadgePercent,
    title: "Tax-Deductible Contributions",
    body: "RRSP contributions can reduce your taxable income, which may lower your tax bill or increase your refund.",
  },
  {
    icon: Sprout,
    title: "Tax-Deferred Growth",
    body: "Investment growth inside the RRSP is not taxed until withdrawn, allowing your savings to compound over time.",
  },
  {
    icon: CalendarPlus,
    title: "Unused Room Carries Forward",
    body: "If you do not use all of your available RRSP contribution room, it carries forward to future years.",
  },
  {
    icon: Compass,
    title: "Retirement Planning Flexibility",
    body: "An RRSP can anchor a broader retirement strategy — coordinated with TFSAs, pensions, non-registered accounts, and government benefits.",
  },
];

/* Beyond retirement — the two government programs. */
const BEYOND = [
  {
    icon: Home,
    title: "Buying Your First Home",
    highlight: "Up to $60,000",
    body: "Through the Home Buyers' Plan, eligible first-time home buyers may withdraw up to $60,000 from their RRSP to help buy or build a qualifying home, with repayment required over time.",
  },
  {
    icon: GraduationCap,
    title: "Going Back to School",
    highlight: "Lifelong Learning Plan",
    body: "Eligible individuals may withdraw funds from their RRSP to help finance qualifying education or training for themselves or their spouse or common-law partner.",
  },
];

/* Options at maturity. */
const MATURITY_OPTIONS = [
  "Convert to a Registered Retirement Income Fund (RRIF)",
  "Purchase an annuity",
  "Withdraw the funds as a lump sum",
];

export default async function RRSPPage() {
  const page = await getPublishedServicePage("rrsp");
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      {/* ---------- Hero ---------- */}
      <ServiceHero content={page} scrimClassName="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/80 via-[#0a1f33]/40 to-transparent" />

      {/* ---------- Overview ---------- */}
      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Overview
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              What Is an RRSP
            </h2>
          </Reveal>
          <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
            <p>
              Contributions to an RRSP are generally tax-deductible, and
              investments inside the plan grow on a tax-deferred basis. You do not
              pay tax on investment growth while the funds remain in the RRSP.
              Taxes are paid when money is withdrawn — typically during
              retirement, when your income may be lower.
            </p>
            <p>An RRSP can hold a range of investment options, including:</p>
            <ul className="flex flex-wrap gap-2.5 pt-1">
              {INVESTMENTS.map((item) => (
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

      {/* ---------- Who Can Contribute ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Eligibility
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Who Can Contribute
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
                You can contribute to an RRSP if you have earned income, file a tax
                return, and have available contribution room. Contribution room is
                generally based on 18% of your previous year&rsquo;s earned income,
                up to the annual limit, with unused room carried forward.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <dl className="grid gap-px overflow-hidden rounded-sm border border-black/10 bg-black/10 sm:grid-cols-3">
                {CONTRIBUTION_FACTS.map((fact) => (
                  <div key={fact.label} className="flex flex-col bg-white p-7">
                    <dt className="font-serif text-[32px] font-normal leading-none tracking-tight text-[#0a1f33] sm:text-[34px]">
                      {fact.value}
                    </dt>
                    <dd className="mt-3 text-[14px] leading-relaxed text-[#5b6573]">
                      {fact.label}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 border-l-2 border-black/15 pl-5 text-[14px] leading-relaxed text-[#5b6573]">
                Figures reflect current CRA guidance. Your personal contribution
                room should always be confirmed through your CRA Notice of
                Assessment or CRA My Account. Learn more at{" "}
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

      {/* ---------- Types of RRSPs ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Choosing a Plan
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Types of RRSPs
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
              There is more than one way to hold an RRSP, depending on your
              situation and how you plan to save.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-px overflow-hidden rounded-sm border border-black/10 bg-black/10 lg:grid-cols-3">
            {TYPES.map((item, i) => (
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

      {/* ---------- Key Benefits ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Key Benefits
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              A Cornerstone of Retirement Saving
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-px overflow-hidden rounded-sm border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((item, i) => (
              <Reveal
                key={item.title}
                delay={i * 90}
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

      {/* ---------- More Than Retirement ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Beyond Retirement
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              More Than Retirement
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
              While RRSPs are primarily designed for retirement, they can also
              support other major life goals.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            {BEYOND.map((item, i) => (
              <Reveal
                key={item.title}
                delay={i * 120}
                className="flex flex-col rounded-sm border border-black/10 bg-white p-8 sm:p-9"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-[#e6f1f1] text-[#006d6e]">
                    <item.icon className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#006d6e]">
                    {item.highlight}
                  </span>
                </div>
                <h3 className="mt-6 text-[21px] font-semibold leading-snug text-[#0a1f33]">
                  {item.title}
                </h3>
                <p className="mt-3 text-[16px] leading-relaxed text-[#5b6573]">
                  {item.body}
                </p>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200}>
            <p className="mt-8 text-[14px] leading-relaxed text-[#5b6573]">
              More details on both programs are available through{" "}
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
      </section>

      {/* ---------- Withdrawals and Maturity ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Access &amp; Timeline
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Withdrawals &amp; Maturity
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                RRSP withdrawals can be made before retirement, but the amount
                withdrawn is generally taxable and may be subject to withholding
                tax. Before withdrawing, it is important to understand the tax
                impact and how it may affect your long-term retirement plan.
              </p>
              <p>
                Your RRSP must be converted or withdrawn by the end of the year you
                turn 71. At that point, you may choose to:
              </p>
              <ul className="space-y-3 pt-1">
                {MATURITY_OPTIONS.map((opt) => (
                  <li key={opt} className="flex items-baseline gap-3">
                    <Check
                      className="relative top-[4px] h-[18px] w-[18px] flex-none text-[#006d6e]"
                      strokeWidth={2.25}
                    />
                    <span className="text-[17px] leading-snug text-[#1a2433]">
                      {opt}
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Plan with Confidence ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                The Right Strategy
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Plan with Confidence
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                An RRSP can be a powerful savings tool, but the right strategy
                depends on your income, tax position, retirement goals, and
                timeline.
              </p>
              <p>
                At Keybase Financial Group, our advisors can help you understand
                your contribution options, manage tax considerations, and build a
                retirement plan aligned with your long-term financial goals.
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
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/85 via-[#0a1f33]/50 to-transparent"
          aria-hidden
        />

        <div className="relative mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-3xl">
            <h2
              className="font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-white sm:text-[44px]"
              style={{ textShadow: "0 2px 28px rgba(0,0,0,0.5)" }}
            >
              Build Your Retirement Plan
            </h2>
            <p
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85"
              style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
            >
              Make the most of your contribution room and tax advantages. Speak
              with a Keybase Financial Advisor to build an RRSP strategy aligned
              with your long-term financial goals.
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
