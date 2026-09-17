import {
  Check,
  Umbrella,
  HeartPulse,
  Coins,
  SlidersHorizontal,
  Wallet,
  TrendingUp,
} from "lucide-react";
import Reveal from "@/components/home/Reveal";
import ServiceSection from "@/components/services/ServiceSection";
import ServiceFaq, { type FaqItem } from "@/components/services/ServiceFaq";
import ServiceCta from "@/components/services/ServiceCta";

/* The full range of solutions, organized by what they protect. */
const SOLUTION_GROUPS = [
  {
    icon: Umbrella,
    category: "Life Insurance",
    items: [
      "Term Life Insurance",
      "Whole Life Insurance",
      "Universal Life Insurance",
    ],
  },
  {
    icon: HeartPulse,
    category: "Living Benefits & Health",
    items: [
      "Critical Illness Insurance",
      "Disability Insurance",
      "Long-Term Care Insurance",
      "Travel Insurance",
      "Health and Dental Insurance",
    ],
  },
  {
    icon: Coins,
    category: "Wealth & Income",
    items: ["Segregated Funds", "Annuities", "Guaranteed Interest Accounts"],
  },
];

/* Ways insurance supports business owners specifically. */
const BUSINESS_NEEDS = [
  "Continuity planning",
  "Key person protection",
  "Shareholder agreements",
  "Succession planning",
];

/* What sets a Keybase insurance strategy apart. */
const PILLARS = [
  {
    icon: SlidersHorizontal,
    title: "Flexibility",
    body: "Coverage shaped around your lifestyle, responsibilities, and long-term objectives — never one-size-fits-all.",
  },
  {
    icon: Wallet,
    title: "Affordability",
    body: "Solutions that fit your budget today while still protecting the future you are working toward.",
  },
  {
    icon: TrendingUp,
    title: "Long-Term Value",
    body: "A strategy built to keep supporting your plan as your income, family, and goals evolve.",
  },
];

const FAQ: FaqItem[] = [
  {
    question: "How much life insurance might I need?",
    answer: [
      "There is no standard amount. The assessment usually starts from what would still have to be covered if your income stopped: outstanding debts including a mortgage, the income your household relies on and for how long, costs such as childcare or education, and any obligations tied to a business.",
      "Existing coverage, savings, and group benefits are then set against that total to find the shortfall. Because every input is personal, the figure comes out of a review rather than a formula.",
    ],
  },
  {
    question: "What is the difference between term and permanent life insurance?",
    answer: [
      "Term life insurance covers a defined period, and the coverage ends when that term does. Permanent life insurance — including whole life and universal life — is designed to remain in force for life, and generally costs more for that reason.",
      "Term is often used for an obligation with a foreseeable end, such as a mortgage or the years until children are independent. Permanent coverage is more often used for needs that do not expire, such as estate obligations. Terms, conditions, and exclusions vary by contract.",
    ],
  },
  {
    question: "What does disability insurance cover?",
    answer: [
      "Disability insurance is designed to replace part of your income if illness or injury prevents you from working.",
      "What qualifies as a disability, how long benefits are payable, the waiting period before they begin, and how much income is replaced are all defined by the individual policy — and they differ considerably between contracts, which is why the wording deserves as much attention as the premium.",
    ],
  },
  {
    question: "How can insurance support estate planning?",
    answer: [
      "An estate may face obligations before it can be distributed — taxes triggered at death, probate fees, legal and administrative costs, and final expenses. Life insurance can provide funds to meet those costs so that assets do not have to be sold to cover them.",
      "Because proceeds can be paid to a named beneficiary, insurance is also used to direct value to specific people alongside the rest of an estate plan.",
    ],
  },
  {
    question: "What insurance should business owners consider?",
    answer: [
      "The areas that come up most often are continuity planning, key person protection, funding for shareholder agreements, and succession planning — arrangements that keep a business running, or allow ownership to change hands in an orderly way, if an owner or a critical person is lost.",
      "The right structure depends on how the business is owned, what obligations it carries, and what the owners have already agreed between them.",
    ],
  },
];

/**
 * The insurance page body — every section below the hero.
 *
 * Lives apart from the route so both the standalone /insurance page and the
 * tabbed /services/insurance view render exactly the same content.
 */
export default function InsuranceBody() {
  return (
    <>
      {/* ---------- What it is (direct answer) ---------- */}
      <ServiceSection
        eyebrow="In Short"
        heading="What is insurance planning?"
        tone="muted"
        divider={false}
      >
        <p>
          Insurance planning is the process of identifying the financial
          responsibilities that would remain if your income stopped, your health
          changed, or you died — and then deciding which of those risks are
          worth transferring to an insurer and which can reasonably be carried
          yourself.
        </p>
        <p>
          It looks at what you owe, who depends on you, what a business would
          need in order to continue, and what an estate would have to settle.
          Coverage is one possible answer to that assessment, not the place it
          starts.
        </p>
      </ServiceSection>

      {/* ---------- Keybase Insurance Agency Ltd. ---------- */}
      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Our Agency
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Keybase Insurance Agency Ltd.
            </h2>
          </Reveal>
          <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
            <p>
              At Keybase Insurance Agency Ltd., our advisors take the time to
              understand your needs, goals, family situation, and business
              priorities. Insurance is not one-size-fits-all — the right strategy
              should be tailored to your lifestyle, financial responsibilities, and
              long-term objectives.
            </p>
            <p>
              Whether your focus is income protection, estate planning, business
              continuity, or wealth transfer, we can help you explore coverage
              options designed to support your plan.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- Individual and Business Insurance Solutions ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              What We Offer
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Individual &amp; Business Insurance Solutions
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
              Keybase Insurance Agency Ltd. offers access to a wide range of
              insurance solutions across three core areas of protection.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {SOLUTION_GROUPS.map((group, i) => (
              <Reveal
                key={group.category}
                delay={i * 110}
                className="flex flex-col rounded-sm border border-black/10 bg-white p-8"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f1f1] text-[#006d6e]">
                  <group.icon className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <h3 className="mt-6 text-[20px] font-semibold leading-snug text-[#0a1f33]">
                  {group.category}
                </h3>
                <ul className="mt-5 space-y-3 border-t border-black/10 pt-5">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-baseline gap-3">
                      <Check
                        className="relative top-[3px] h-[17px] w-[17px] flex-none text-[#006d6e]"
                        strokeWidth={2.25}
                      />
                      <span className="text-[16px] leading-snug text-[#1a2433]">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Protection for Every Stage ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Every Chapter of Life
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Protection for Every Stage
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-7 text-lg leading-relaxed text-[#5b6573]">
              <p>
                Insurance is valuable at every stage of life. Whether you are
                starting your career, raising a family, building a business,
                preparing for retirement, or planning your estate, the right
                coverage can help reduce financial risk and protect your long-term
                plan.
              </p>
              <div className="rounded-sm border border-black/10 bg-[#f7f9fa] p-7">
                <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#0a1f33]">
                  For Business Owners
                </p>
                <p className="mt-3 text-[16px] leading-relaxed text-[#5b6573]">
                  Insurance can also support key elements of running and protecting
                  a business:
                </p>
                <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {BUSINESS_NEEDS.map((item) => (
                    <li key={item} className="flex items-baseline gap-3">
                      <Check
                        className="relative top-[3px] h-[17px] w-[17px] flex-none text-[#006d6e]"
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

      {/* ---------- The Keybase Difference ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Why Keybase
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              The Keybase Difference
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
              A Keybase advisor can help you identify potential gaps in your current
              protection and recommend solutions that align with your financial
              goals.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-px overflow-hidden rounded-sm border border-black/10 bg-black/10 lg:grid-cols-3">
            {PILLARS.map((item, i) => (
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

      {/* ---------- Who it is for ---------- */}
      <ServiceSection eyebrow="Who We Work With" heading="Who protection planning is for">
        <p>
          Protection planning is most relevant where other people or obligations
          depend on your income or your assets: families carrying a mortgage or
          raising children, couples where one income covers a disproportionate
          share of the commitments, business owners with partners, employees, or
          debt tied to their involvement, and people whose estate would face
          costs at death that they would rather were not met by selling assets.
        </p>
        <p>
          It is not equally relevant to everyone. Someone with no dependants, no
          debt, and enough assets to absorb a setback may need very little. The
          point of the review is to establish which of those descriptions fits
          your situation before any product is discussed.
        </p>
      </ServiceSection>

      <ServiceFaq heading="Questions about coverage." items={FAQ} tone="muted" />

      <ServiceCta
        heading="Start with the review, not the product."
        body="An advisor with Keybase Insurance Agency Ltd. can help you identify where your current protection leaves a gap, and which coverage options are worth considering against it."
        related={[
          {
            href: "/estate-planning",
            label: "Estate Planning",
            note: "Where insurance meets estate obligations and wealth transfer.",
          },
          {
            href: "/segregated-funds",
            label: "Segregated Funds",
            note: "Investment funds held within an insurance contract.",
          },
          {
            href: "/travel-insurance",
            label: "Travel Insurance",
            note: "Coverage for medical costs and disruptions away from home.",
          },
        ]}
      />
    </>
  );
}
