import Link from "next/link";
import {
  ArrowRight,
  Wallet,
  PiggyBank,
  LineChart,
  Landmark,
  ShieldCheck,
  Compass,
} from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import Reveal from "@/components/home/Reveal";
import ServiceHero from "@/components/home/ServiceHero";
import { getPublishedServicePage } from "@/lib/cms/public";

export async function generateMetadata() {
  const page = await getPublishedServicePage("retirement-planning");
  return { title: page.seoTitle, description: page.seoDescription };
}

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

export default async function RetirementPlanningPage() {
  const page = await getPublishedServicePage("retirement-planning");
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      {/* ---------- Hero ---------- */}
      <ServiceHero content={page} scrimClassName="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/45 via-[#0a1f33]/15 to-transparent" />

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

      {/* ---------- CTA ---------- */}
      <section className="relative overflow-hidden border-t border-black/10 bg-[#0a1f33]">
        <img
          src="/retirement-planning3.jpg"
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
              Your next chapter starts here.
            </h2>
            <p
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85"
              style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
            >
              Speak with a Keybase advisor about a retirement plan aligned with
              your goals, timeline, and the lifestyle you want to enjoy.
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
