import { TrendingUp, Users, ShieldCheck, Handshake } from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import BecomeAdvisorForm from "@/components/home/BecomeAdvisorForm";

export const metadata = {
  title: "Become an Advisor — Keybase Financial Group",
  description:
    "Grow your practice with Keybase Financial Group. Join an independent, Canadian-owned firm with the platform, products, and support to help advisors and their clients thrive. Tell us about your business to get started.",
};

const REASONS = [
  {
    icon: TrendingUp,
    title: "Grow your practice",
    body: "Access to a broad shelf of investment and insurance solutions, plus the tools to scale your book with confidence.",
  },
  {
    icon: ShieldCheck,
    title: "Independent by design",
    body: "Keep ownership of your client relationships while we handle compliance, technology, and back-office support.",
  },
  {
    icon: Users,
    title: "People-first culture",
    body: "Join a collaborative, Canadian-owned firm that invests in your development and puts advisors and clients first.",
  },
  {
    icon: Handshake,
    title: "Real partnership",
    body: "A dedicated advisor development team works alongside you to build a durable, growing business.",
  },
];

export default function BecomeAdvisorPage() {
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden border-b border-black/10 bg-[#0a1f33] text-white">
        <img
          src="/consult-advisors.jpg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/90 via-[#0a1f33]/75 to-[#0a1f33]/45"
          aria-hidden
        />

        <div className="relative mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-24">
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-white/70">
            Advisor Opportunities
          </p>
          <h1
            className="mt-5 max-w-3xl font-serif text-[42px] font-normal leading-[1.06] tracking-tight sm:text-[60px]"
            style={{ textShadow: "0 2px 28px rgba(0,0,0,0.5)" }}
          >
            Become an advisor.
          </h1>
          <p
            className="mt-7 max-w-2xl text-lg leading-relaxed text-white/85"
            style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
          >
            Are you ready to grow your business? Partner with an independent,
            Canadian-owned firm built to help advisors — and their clients —
            thrive. Tell us about your practice and we&apos;ll be in touch to
            explore how Keybase can support your next chapter.
          </p>
        </div>
      </section>

      {/* ---------- Content ---------- */}
      <main className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,380px)_1fr] lg:gap-20">
          {/* Left: value props */}
          <div className="lg:pt-2">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Why Keybase
            </p>
            <h2 className="mt-4 font-serif text-[32px] font-normal leading-[1.12] tracking-tight text-[#0a1f33] sm:text-[38px]">
              A platform built for independent advisors.
            </h2>
            <p className="mt-6 text-[15px] leading-relaxed text-[#5b6573]">
              Whether you&apos;re scaling for growth or refining an established
              practice, we give you the products, technology, and partnership to
              serve your clients at the highest level.
            </p>

            <dl className="mt-10 space-y-8">
              {REASONS.map((r) => {
                const Icon = r.icon;
                return (
                  <div key={r.title} className="flex items-start gap-4">
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[#eaeef2] text-[#0a1f33]">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <div>
                      <dt className="text-[15px] font-semibold text-[#0a1f33]">
                        {r.title}
                      </dt>
                      <dd className="mt-1 text-[14px] leading-relaxed text-[#5b6573]">
                        {r.body}
                      </dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          </div>

          {/* Right: application form */}
          <div>
            <div className="mb-8">
              <h2 className="font-serif text-[28px] font-normal leading-tight tracking-tight text-[#0a1f33] sm:text-[34px]">
                Tell us about your business
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[#5b6573]">
                Complete the form below to start the conversation. Fields marked
                with an asterisk (*) are required.
              </p>
            </div>
            <BecomeAdvisorForm />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
