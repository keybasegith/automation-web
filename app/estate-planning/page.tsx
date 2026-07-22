import Link from "next/link";
import {
  ArrowRight,
  Check,
  ScrollText,
  Landmark,
  Users,
  HeartHandshake,
  ShieldCheck,
  Scale,
} from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import Reveal from "@/components/home/Reveal";
import ServiceHero from "@/components/home/ServiceHero";
import { getPublishedServicePage } from "@/lib/cms/public";

export async function generateMetadata() {
  const page = await getPublishedServicePage("estate-planning");
  return { title: page.seoTitle, description: page.seoDescription };
}

const PILLARS = [
  {
    icon: ScrollText,
    title: "A Valid, Current Will",
    body: "Keep a clear, up-to-date will in place so your wishes are legally sound and your estate is distributed exactly as you intend.",
  },
  {
    icon: Users,
    title: "Beneficiary Designations",
    body: "Name beneficiaries on your insurance policies and registered accounts so those assets can pass directly to the people you choose.",
  },
  {
    icon: Scale,
    title: "Ownership Structures",
    body: "Review how your assets are owned and titled — including joint ownership arrangements — to simplify and streamline the transfer.",
  },
  {
    icon: ShieldCheck,
    title: "Insurance Solutions",
    body: "Use life insurance to help cover estate obligations such as taxes and final expenses, preserving more of your wealth for your heirs.",
  },
  {
    icon: HeartHandshake,
    title: "Final Expense Planning",
    body: "Plan ahead for funeral and final costs so they don't become a financial or emotional burden on your family.",
  },
  {
    icon: Landmark,
    title: "Minimizing Tax & Probate",
    body: "Structure your estate to reduce probate fees and the taxes triggered at death, so more of your legacy reaches the people and causes you care about.",
  },
];

const CONSIDERATIONS = [
  "Probate fees",
  "Capital gains taxes",
  "Taxes on registered savings plans",
  "Funeral and final expenses",
  "Legal and administrative fees",
  "Outstanding debts",
  "Beneficiary designations",
  "Life insurance coverage",
  "Joint ownership arrangements",
  "Gifting strategies",
  "Retirement income and asset withdrawal planning",
];

const STEPS = [
  {
    title: "Take inventory",
    body: "We review your assets, accounts, beneficiaries, and existing documents to understand your full picture.",
  },
  {
    title: "Clarify your wishes",
    body: "We define how you want your wealth, care, and legacy handled — for your family and the causes you support.",
  },
  {
    title: "Structure the plan",
    body: "We coordinate beneficiaries, ownership, and insurance to minimize tax and probate, working alongside your legal advisors.",
  },
  {
    title: "Review & update",
    body: "We revisit the plan as life, family, and tax rules change, so it always reflects your current wishes.",
  },
];

export default async function EstatePlanningPage() {
  const page = await getPublishedServicePage("estate-planning");
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      {/* ---------- Hero ---------- */}
      <ServiceHero content={page} scrimClassName="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/45 via-[#0a1f33]/15 to-transparent" />

      {/* ---------- Protect What You've Built ---------- */}
      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Why It Matters
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Protect What You&rsquo;ve Built
            </h2>
          </Reveal>
          <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
            <p>
              Estate planning is more than preparing a will. It is a strategic
              process designed to protect your assets, reduce unnecessary costs,
              and ensure your wealth is transferred according to your wishes.
            </p>
            <p>
              Without a clear plan, estate costs such as taxes, probate fees,
              legal expenses, and administrative fees can reduce the value of the
              legacy you intended to leave behind. A well-structured estate plan
              helps provide clarity, control, and confidence for you and your
              loved ones.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- Understanding Estate Costs ---------- */}
      <section className="relative overflow-hidden border-t border-black/10 bg-[#f7f9fa]">
        <img
          src="/estate-planning2.jpg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        {/* light wash keeps the dark copy and hairline list fully legible while
            the photo reads as a soft background texture */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#f7f9fa]/95 via-[#f7f9fa]/90 to-[#f7f9fa]/82"
          aria-hidden
        />

        <div className="relative mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Estate Costs
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Understanding Estate Costs
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                Before your estate can be distributed, certain obligations may
                need to be settled. These can include probate fees, capital gains
                taxes, taxes on registered savings plans, funeral expenses, legal
                fees, outstanding debts, and other administrative costs.
              </p>
              <p>
                Understanding these potential costs is the first step toward
                managing them effectively.
              </p>
            </Reveal>
          </div>

          <Reveal className="mt-16">
            <h3 className="font-serif text-2xl font-normal text-[#0a1f33] sm:text-[28px]">
              Common Estate Planning Considerations
            </h3>
          </Reveal>
          <div className="mt-8 grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
            {CONSIDERATIONS.map((item, i) => (
              <Reveal
                key={item}
                delay={(i % 3) * 70}
                className="group flex items-start gap-3 border-t border-black/10 py-4"
              >
                <Check
                  className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 text-[#006d6e]"
                  strokeWidth={2.25}
                />
                <span className="text-[15px] leading-snug text-[#1a2433] transition-colors group-hover:text-[#006d6e]">
                  {item}
                </span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Managing Your Estate Strategically ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                How We Help
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Managing Your Estate Strategically
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                Once you understand the costs associated with your estate, you can
                take proactive steps to help reduce their impact. Strategies may
                include maintaining a valid will, naming beneficiaries on insurance
                policies and registered accounts, reviewing ownership structures,
                planning for final expenses, and using insurance solutions to help
                cover estate obligations.
              </p>
              <p>
                Every estate is different. The right strategy depends on your
                assets, family structure, financial goals, and the legacy you want
                to leave.
              </p>
            </Reveal>
          </div>

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

      {/* ---------- Protecting Your Legacy ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 text-center sm:px-8 sm:py-28">
          <Reveal className="mx-auto max-w-3xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Your Legacy
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Protecting Your Legacy
            </h2>
            <div className="mt-7 space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                Building wealth takes time, discipline, and planning. Protecting
                that wealth requires the same level of care.
              </p>
              <p>
                Estate planning helps ensure that more of what you have built
                reaches the people and causes that matter most to you. It can also
                help reduce stress, confusion, and financial pressure for your
                loved ones during an already difficult time.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Plan Today for Tomorrow (CTA) ---------- */}
      <section className="relative overflow-hidden border-t border-black/10 bg-[#0a1f33]">
        <img
          src="/estate-planning1.jpg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/45 via-[#0a1f33]/15 to-transparent"
          aria-hidden
        />

        <div className="relative mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-3xl">
            <h2
              className="font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-white sm:text-[44px]"
              style={{ textShadow: "0 2px 28px rgba(0,0,0,0.5)" }}
            >
              Plan Today for Tomorrow
            </h2>
            <div
              className="mt-6 max-w-2xl space-y-5 text-lg leading-relaxed text-white/85"
              style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
            >
              <p>
                Estate planning is an important part of your overall financial
                strategy. With the right guidance, you can make informed decisions
                that balance your current needs with your future intentions.
              </p>
              <p>
                Start the conversation early with a Keybase Financial Advisor and
                take the next step toward protecting your legacy with confidence.
              </p>
            </div>
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
