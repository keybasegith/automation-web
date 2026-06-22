import Link from "next/link";
import { ArrowRight, Compass, ShieldCheck, Users, TrendingUp } from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";

export const metadata = {
  title: "About Us — Keybase Financial Group",
  description:
    "Keybase Financial Group is an independent wealth management and advisory firm built to deliver disciplined, transparent, and personalized financial advice for the long term.",
};

const STATS = [
  { value: "30+", label: "Years of combined advisory experience" },
  { value: "$2.4B", label: "In client assets under guidance" },
  { value: "7,500+", label: "Families and institutions served" },
  { value: "100%", label: "Independent, conflict-free advice" },
];

const VALUES = [
  {
    icon: Compass,
    title: "Independence",
    body: "We answer only to our clients. Free from product quotas and outside interests, every recommendation is made on the merits alone.",
  },
  {
    icon: ShieldCheck,
    title: "Integrity",
    body: "Transparency is non-negotiable. Clear fees, candid advice, and a fiduciary mindset guide every conversation we have.",
  },
  {
    icon: Users,
    title: "Partnership",
    body: "We build relationships that span decades and generations — walking alongside our clients through every stage of life.",
  },
  {
    icon: TrendingUp,
    title: "Discipline",
    body: "Markets move; our process holds. Research-driven, goals-based strategies keep portfolios anchored to what matters most.",
  },
];

export default function AboutPage() {
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      {/* ---------- Hero ---------- */}
      <section className="border-b border-black/10 bg-[#0a1f33] text-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-white/60">
            About Keybase
          </p>
          <h1 className="mt-5 max-w-3xl font-serif text-[42px] font-normal leading-[1.06] tracking-tight sm:text-[60px]">
            Independent advice, built for the long term.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-white/75">
            Keybase Financial Group partners with individuals, families, and
            institutions to deliver disciplined, transparent financial advice.
            We exist to help our clients build, protect, and transfer wealth with
            clarity and confidence — through every market and every milestone.
          </p>
        </div>
      </section>

      {/* ---------- Stats band ---------- */}
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-8 px-5 py-14 sm:px-8 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <p className="font-serif text-[40px] font-normal leading-none text-[#0a1f33] sm:text-[48px]">
                {stat.value}
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-[#5b6573]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Our Story ---------- */}
      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Our Story
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              A firm founded on a simple principle.
            </h2>
          </div>
          <div className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
            <p>
              Keybase Financial Group was founded on the belief that financial
              advice should be independent, personal, and entirely aligned with
              the people it serves. In an industry crowded with proprietary
              products and competing incentives, we set out to do things
              differently — to put the client at the center of every decision.
            </p>
            <p>
              Today, our advisors bring institutional rigor to deeply personal
              relationships. We combine sophisticated planning and disciplined
              investment management with the kind of attentive, human service
              that earns trust over a lifetime. Whether we are guiding a family
              through a wealth transfer, building a retirement income strategy,
              or protecting a business, our approach is the same: listen first,
              advise honestly, and stay the course together.
            </p>
            <p>
              That commitment is why thousands of clients have made Keybase their
              partner in building and preserving wealth — and why we measure our
              success by theirs.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Values ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              What We Stand For
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              The values behind every recommendation.
            </h2>
          </div>

          <div className="mt-16 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value) => {
              const Icon = value.icon;
              return (
                <div
                  key={value.title}
                  className="flex flex-col lg:border-l lg:border-black/15 lg:pl-12"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#eaeef2] text-[#0a1f33]">
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-8 font-serif text-2xl font-normal text-[#0a1f33]">
                    {value.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-[#5b6573]">
                    {value.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- Leadership cross-link ---------- */}
      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid items-center gap-10 rounded-lg bg-[#0a1f33] px-8 py-14 text-white sm:px-14 lg:grid-cols-2 lg:gap-16">
          <h2 className="font-serif text-[32px] font-normal leading-[1.1] tracking-tight sm:text-[40px]">
            Meet the people behind the advice.
          </h2>
          <div className="lg:pl-8">
            <p className="text-lg leading-relaxed text-white/75">
              Our leadership team brings decades of experience across wealth
              management, compliance, and corporate strategy — and a shared
              commitment to putting clients first.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/key-executives"
                className="inline-flex items-center gap-2 bg-white px-7 py-4 text-[15px] font-semibold text-[#0a1f33] transition-colors hover:bg-white/90"
              >
                Key Executives
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/ceo-message"
                className="inline-flex items-center gap-2 border border-white/40 px-7 py-4 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
              >
                A Message from our CEO
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
