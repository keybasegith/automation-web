import Link from "next/link";
import {
  ChevronRight,
  ArrowRight,
  Compass,
  TrendingUp,
  PiggyBank,
  ShieldCheck,
  Landmark,
  Users,
} from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import Reveal from "@/components/home/Reveal";

export const metadata = {
  title: "Wealth Building — Keybase Financial Group",
  description:
    "Build, grow, and protect your wealth with a plan built around your life. Keybase advisors coordinate investments, retirement, tax, and estate strategy into one integrated wealth plan designed to last.",
};

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

export default function WealthBuildingPage() {
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden border-b border-black/10 bg-[#0a1f33] text-white">
        <img
          src="/wealth-planning1.jpg"
          alt=""
          aria-hidden
          className="ken-burns pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        {/* light left-side scrim keeps the copy legible without darkening the image */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/45 via-[#0a1f33]/15 to-transparent"
          aria-hidden
        />

        <div className="relative mx-auto max-w-[1280px] px-5 pb-20 pt-28 sm:px-8 sm:pb-28 sm:pt-40">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-2 text-[14px] text-white/70"
          >
            <Link href="/" className="transition-colors hover:text-white">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-white/40" />
            <Link href="/#what-we-do" className="transition-colors hover:text-white">
              Our Services
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-white/40" />
            <span className="text-white">Wealth Building</span>
          </nav>

          <p className="mt-9 text-[13px] font-semibold uppercase tracking-[0.22em] text-white/70">
            Wealth Planning
          </p>
          <h1
            className="mt-5 max-w-3xl font-serif text-[42px] font-normal leading-[1.06] tracking-tight sm:text-[60px]"
            style={{ textShadow: "0 2px 28px rgba(0,0,0,0.5)" }}
          >
            Build, grow, and protect your wealth.
          </h1>
          <p
            className="mt-7 max-w-2xl text-lg leading-relaxed text-white/85"
            style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
          >
            True wealth planning is more than picking investments. Keybase brings
            your investments, retirement, tax, and estate strategy together into a
            single coordinated plan — built around your life and designed to last.
          </p>
          <div className="mt-10">
            <Link
              href="/contact"
              className="group inline-flex items-center gap-2 bg-white px-7 py-4 text-[15px] font-semibold text-[#0a1f33] shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e6f1f1] hover:shadow-xl hover:shadow-black/20"
            >
              Start a Wealth Plan
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

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

      {/* ---------- CTA ---------- */}
      <section className="relative overflow-hidden border-t border-black/10 bg-[#0a1f33]">
        <img
          src="/wealth-planning1.jpg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/70 via-[#0a1f33]/45 to-[#0a1f33]/20"
          aria-hidden
        />

        <div className="relative mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-3xl">
            <h2
              className="font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-white sm:text-[44px]"
              style={{ textShadow: "0 2px 28px rgba(0,0,0,0.5)" }}
            >
              Let&rsquo;s build your wealth plan.
            </h2>
            <p
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85"
              style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
            >
              Speak with a Keybase advisor about an integrated wealth plan that
              brings your investments, retirement, tax, and estate strategy
              together — built entirely around your goals.
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
