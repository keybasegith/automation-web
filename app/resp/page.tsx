import Link from "next/link";
import {
  ArrowRight,
  User,
  Users,
  Sprout,
  Repeat,
  Clock,
  GraduationCap,
} from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import Reveal from "@/components/home/Reveal";
import ServiceHero from "@/components/home/ServiceHero";
import { getPublishedServicePage } from "@/lib/cms/public";

export async function generateMetadata() {
  const page = await getPublishedServicePage("resp");
  return { title: page.seoTitle, description: page.seoDescription };
}

/* Post-secondary paths an RESP can fund. */
const ELIGIBLE_USES = [
  "College",
  "University",
  "Trade School",
  "CEGEP",
  "Apprenticeship Programs",
];

/* The two RESP structures. */
const TYPES = [
  {
    icon: User,
    title: "Individual RESP",
    body: "Set up for a single beneficiary. The person opening the plan does not need to be related to the beneficiary, and an adult may also open one for themselves.",
  },
  {
    icon: Users,
    title: "Family RESP",
    body: "Lets you name more than one beneficiary, as long as each is related to the person opening the plan — added flexibility for families saving for multiple children.",
  },
];

/* Reasons an RESP works so well (government grants get their own section). */
const BENEFITS = [
  {
    icon: Sprout,
    title: "Tax-Deferred Growth",
    body: "Investment income earned inside an RESP is not taxed while it stays in the plan. On withdrawal for education, earnings and grants are generally taxed in the student's hands — often at a lower rate.",
  },
  {
    icon: Repeat,
    title: "Flexibility",
    body: "If the beneficiary decides not to pursue post-secondary education, options may still exist — including transferring certain funds to another eligible beneficiary or, in some cases, to an RRSP.",
  },
  {
    icon: Clock,
    title: "Start Early, Benefit More",
    body: "The earlier you begin, the more time your contributions have to grow. Even small, consistent contributions can make a meaningful difference over time.",
  },
];

/* Headline government support figures. */
const GRANTS = [
  {
    value: "$7,200",
    name: "Canada Education Savings Grant",
    body: "Up to $7,200 per eligible beneficiary in matching government contributions.",
  },
  {
    value: "$2,000",
    name: "Canada Learning Bond",
    body: "Up to $2,000 for eligible children from lower-income families — no personal contributions required.",
  },
];

export default async function RESPPage() {
  const page = await getPublishedServicePage("resp");
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
              What Is an RESP
            </h2>
          </Reveal>
          <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
            <p>
              An RESP is a tax-sheltered savings plan designed to help parents,
              grandparents, family members, and friends save for a child&rsquo;s
              future education. It allows savings to grow tax-deferred, helping
              families build education funds over time.
            </p>
            <p>
              An RESP can be used for many types of post-secondary education,
              giving students the freedom to choose the path that fits them best:
            </p>
            <ul className="flex flex-wrap gap-2.5 pt-1">
              {ELIGIBLE_USES.map((use) => (
                <li
                  key={use}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#f7f9fa] px-4 py-2 text-[14px] font-medium text-[#1a2433]"
                >
                  <GraduationCap className="h-4 w-4 text-[#006d6e]" strokeWidth={2} />
                  {use}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ---------- Types of RESPs ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Choosing a Plan
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Types of RESPs
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
              There are two ways to structure an RESP, depending on how many
              children you are saving for and your relationship to them.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            {TYPES.map((item, i) => (
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
              Built to Help Savings Grow
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-px overflow-hidden rounded-sm border border-black/10 bg-black/10 lg:grid-cols-3">
            {BENEFITS.map((item, i) => (
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

      {/* ---------- Government Grants ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Government Support
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Grants That Boost Your Savings
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
              RESPs may qualify for government support that adds directly to a
              child&rsquo;s education fund — an advantage few other savings plans
              offer.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            {GRANTS.map((item, i) => (
              <Reveal
                key={item.name}
                delay={i * 120}
                className="flex flex-col rounded-sm border border-black/10 bg-white p-8 sm:p-9"
              >
                <p className="font-serif text-[52px] font-normal leading-none tracking-tight text-[#006d6e] sm:text-[58px]">
                  {item.value}
                </p>
                <p className="mt-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#5b6573]">
                  Up To
                </p>
                <h3 className="mt-5 text-[21px] font-semibold leading-snug text-[#0a1f33]">
                  {item.name}
                </h3>
                <p className="mt-3 text-[16px] leading-relaxed text-[#5b6573]">
                  {item.body}
                </p>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <p className="mt-10 max-w-3xl border-l-2 border-black/15 pl-5 text-[14px] leading-relaxed text-[#5b6573]">
              Grant and bond amounts and eligibility are set by the federal
              government and may change over time. Figures shown are current
              maximums according to{" "}
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

      {/* ---------- Planning for Their Future ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                The Long View
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Planning for Their Future
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                Education costs can add up quickly, but the right savings strategy
                can help families prepare with greater confidence.
              </p>
              <p>
                At Keybase Financial Group, our advisors can help you understand
                your RESP options, maximize available grants, and build a plan
                that supports your child&rsquo;s future education goals.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="relative overflow-hidden border-t border-black/10 bg-[#0a1f33]">
        <img
          src="/consult-advisors.jpg"
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
              Start Saving for Their Education
            </h2>
            <p
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85"
              style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
            >
              The earlier you start, the more an RESP can grow. Speak with a
              Keybase Financial Advisor to explore your options, maximize
              available grants, and build a plan for your child&rsquo;s future.
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
