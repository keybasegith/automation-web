import Link from "next/link";
import {
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Fingerprint,
  CalendarClock,
  Coins,
  HeartHandshake,
  Wallet,
} from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import Reveal from "@/components/home/Reveal";

export const metadata = {
  title: "Registered Disability Savings Plan (RDSP) — Keybase Financial Group",
  description:
    "An RDSP is a long-term savings plan that helps eligible Canadians with disabilities and their families build financial security — with tax-deferred growth and government support through the Canada Disability Savings Grant and Bond. Keybase advisors help you review eligibility and build a strategy.",
};

/* Who can open a plan — the four eligibility requirements. */
const ELIGIBILITY = [
  {
    icon: ShieldCheck,
    title: "Disability Tax Credit",
    body: "The beneficiary must be eligible for the Disability Tax Credit (DTC).",
  },
  {
    icon: MapPin,
    title: "Canadian Resident",
    body: "The beneficiary must be a resident of Canada.",
  },
  {
    icon: Fingerprint,
    title: "Valid SIN",
    body: "The beneficiary must have a valid Social Insurance Number.",
  },
  {
    icon: CalendarClock,
    title: "Under Age 60",
    body: "The beneficiary must be under the age of 60 to open a plan.",
  },
];

/* Headline figures worth knowing at a glance. */
const KEY_NUMBERS = [
  {
    value: "$200,000",
    label: "Lifetime contribution limit per beneficiary",
  },
  {
    value: "No cap",
    label: "No annual contribution limit",
  },
  {
    value: "Age 49",
    label: "Grants & bonds may be available until year-end",
  },
  {
    value: "Age 60",
    label: "Lifetime disability payments must begin by",
  },
];

/* Government support programs. */
const SUPPORT = [
  {
    icon: Coins,
    title: "Canada Disability Savings Grant",
    body: "The government can provide matching contributions on amounts you deposit, helping the plan grow faster — subject to eligibility and income level.",
  },
  {
    icon: HeartHandshake,
    title: "Canada Disability Savings Bond",
    body: "For lower-income beneficiaries, the government may contribute a bond without requiring any personal contributions to the plan.",
  },
];

export default function RDSPPage() {
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden border-b border-black/10 bg-[#0a1f33] text-white">
        <img
          src="/consult-advisors.jpg"
          alt=""
          aria-hidden
          className="ken-burns pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        {/* left-side scrim keeps the copy legible without darkening the image */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/80 via-[#0a1f33]/40 to-transparent"
          aria-hidden
        />

        <div className="relative mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
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
              Investment Solutions
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-white/40" />
            <span className="text-white">Registered Disability Savings Plan (RDSP)</span>
          </nav>

          <p className="mt-9 text-[13px] font-semibold uppercase tracking-[0.22em] text-white/70">
            Investment Solutions
          </p>
          <h1
            className="mt-5 max-w-3xl font-serif text-[42px] font-normal leading-[1.06] tracking-tight sm:text-[60px]"
            style={{ textShadow: "0 2px 28px rgba(0,0,0,0.5)" }}
          >
            Build lasting security for the future.
          </h1>
          <p
            className="mt-7 max-w-2xl text-lg leading-relaxed text-white/85"
            style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
          >
            A Registered Disability Savings Plan (RDSP) is a long-term savings
            plan designed to help eligible Canadians with disabilities and their
            families build financial security — with tax-deferred growth and
            valuable government support.
          </p>
          <div className="mt-10">
            <Link
              href="/contact"
              className="group inline-flex items-center gap-2 bg-white px-7 py-4 text-[15px] font-semibold text-[#0a1f33] shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e6f1f1] hover:shadow-xl hover:shadow-black/20"
            >
              Speak with an Advisor
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Overview ---------- */}
      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Overview
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              What Is an RDSP
            </h2>
          </Reveal>
          <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
            <p>
              A Registered Disability Savings Plan is a long-term savings plan
              designed to help eligible Canadians with disabilities and their
              families build financial security for the future.
            </p>
            <p>
              An RDSP can be an important part of a broader financial plan,
              offering tax-deferred investment growth and access to government
              support through the Canada Disability Savings Grant and the Canada
              Disability Savings Bond.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- Eligibility (feature cards) ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Eligibility
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Who Can Open a Plan
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
              To open an RDSP, the beneficiary must meet each of the following
              requirements.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-px overflow-hidden rounded-sm border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-4">
            {ELIGIBILITY.map((item, i) => (
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

      {/* ---------- Key Numbers (stat band) ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              What You Need to Know
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              The Key Figures
            </h2>
          </Reveal>

          <Reveal delay={120}>
            <dl className="mt-14 grid gap-y-10 border-t border-black/10 pt-12 sm:grid-cols-2 sm:gap-x-12 lg:grid-cols-4">
              {KEY_NUMBERS.map((stat) => (
                <div key={stat.label} className="border-l-2 border-[#006d6e] pl-5">
                  <dt className="font-serif text-[40px] font-normal leading-none tracking-tight text-[#0a1f33] sm:text-[46px]">
                    {stat.value}
                  </dt>
                  <dd className="mt-3 text-[15px] leading-relaxed text-[#5b6573]">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={200} className="mt-14 max-w-3xl space-y-6 text-lg leading-relaxed text-[#5b6573]">
            <p>
              There is no annual contribution limit, but lifetime contributions
              are capped at $200,000. Contributions are not tax-deductible, but
              investment growth within the plan is tax-deferred until withdrawals
              are made.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- Government Support ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Government Support
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Grants &amp; Bonds That Grow Your Plan
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
              Government grants and bonds may be available until the end of the
              year the beneficiary turns 49, depending on eligibility and income
              level.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            {SUPPORT.map((item, i) => (
              <Reveal
                key={item.title}
                delay={i * 120}
                className="flex flex-col rounded-sm border border-black/10 bg-white p-8 sm:p-9"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f1f1] text-[#006d6e]">
                  <item.icon className="h-6 w-6" strokeWidth={1.75} />
                </span>
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
            <p className="mt-10 max-w-3xl border-l-2 border-black/15 pl-5 text-[14px] leading-relaxed text-[#5b6573]">
              Current grant and bond thresholds are indexed and may change over
              time, so eligibility should be reviewed regularly with an advisor
              and against official government guidance from{" "}
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

      {/* ---------- Withdrawals ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f1f1] text-[#006d6e]">
                <Wallet className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <p className="mt-6 text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Accessing the Plan
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Withdrawals
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                Withdrawals from an RDSP are called Disability Assistance
                Payments. These payments can be used for the beneficiary&rsquo;s
                needs and quality of life.
              </p>
              <p>
                By the end of the year the beneficiary turns 60, regular payments
                known as Lifetime Disability Assistance Payments must begin. Once
                started, these payments continue for the beneficiary&rsquo;s
                lifetime.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Why Consider an RDSP ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                The Case for an RDSP
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Why Consider an RDSP
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                For individuals with disabilities and their families, an RDSP can
                provide peace of mind and long-term financial stability. It helps
                create a dedicated savings structure for future needs while
                potentially taking advantage of valuable government support.
              </p>
              <p>
                At Keybase Financial Group, we can help you understand how an RDSP
                works, review eligibility, and build a strategy that supports you
                or your loved one&rsquo;s future with confidence.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="relative overflow-hidden border-t border-black/10 bg-[#0a1f33]">
        <img
          src="/retirement-planning1.jpg"
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
              Plan With Confidence
            </h2>
            <p
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85"
              style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
            >
              An RDSP can be a powerful way to secure the future for you or a loved
              one. Speak with a Keybase Financial Advisor to review eligibility and
              build a strategy tailored to your family&rsquo;s needs.
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
