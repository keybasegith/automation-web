import Link from "next/link";
import {
  ArrowRight,
  LineChart,
  TrendingUp,
  Landmark,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { getPublishedArticles } from "@/lib/insights/articles";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import Hero from "@/components/home/Hero";
import FeaturedCarousel from "@/components/home/FeaturedCarousel";
import StatsBand from "@/components/home/StatsBand";
import Reveal from "@/components/home/Reveal";
import CompoundInterestCalculator from "@/components/compound-interest/CompoundInterestCalculator";

export const metadata = {
  title: "Keybase Financial Group — Wealth Management & Advisory",
  description:
    "Keybase Financial Group partners with individuals, families, and institutions to deliver disciplined, independent financial advice built for the long term.",
};

/**
 * `href` opens the services hub on a service representative of that card, which
 * also selects the matching category tab. "Financial Advice" has no category of
 * its own, so it goes to the advisors who deliver it.
 */
const SERVICES = [
  {
    icon: LineChart,
    title: "Wealth Planning",
    body: "Comprehensive, goals-based plans designed around your circumstances, time horizon, and long-term ambitions.",
    href: "/services/wealth-building",
  },
  {
    icon: TrendingUp,
    title: "Financial Advice",
    body: "Independent, research-driven guidance that brings clarity to every decision across your financial life.",
    href: "/our-advisors",
  },
  {
    icon: Landmark,
    title: "Investment Solutions",
    body: "Disciplined strategies across public and private markets, managed with institutional rigor and care.",
    href: "/services/traditional-investments",
  },
  {
    icon: ShieldCheck,
    title: "Preservation Strategies",
    body: "Tax-efficient planning that protects what you've built and transfers wealth seamlessly across generations.",
    href: "/services/insurance",
  },
];

/** The newest published pieces, billed the way each article asks to be. */
const FEATURED_COUNT = 4;

export default function Home() {
  const featured = getPublishedArticles().slice(0, FEATURED_COUNT);

  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      {/* ---------- Hero ---------- */}
      <Hero />

      {/* ---------- Stats band ---------- */}
      <StatsBand />

      {/* ---------- What We Do ---------- */}
      <section id="what-we-do" className="mx-auto max-w-[1280px] px-5 pb-24 pt-12 sm:px-8 sm:pb-28 sm:pt-14">
        <Reveal className="max-w-2xl">
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
            What We Do
          </p>
          <h2 className="mt-4 font-serif text-[40px] font-normal leading-[1.08] tracking-tight text-[#0a1f33] sm:text-[52px]">
            A complete approach to your financial life.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-[#5b6573]">
            Every recommendation is independent, transparent, and built around a
            single objective — your long-term success.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service, i) => {
            const Icon = service.icon;
            return (
              <Reveal
                key={service.title}
                delay={i * 110}
                className="h-full lg:border-l lg:border-black/15 lg:pl-12"
              >
                {/* The whole card is the link — the icon and chevron already
                    animate off group-hover, so they follow it. */}
                <Link
                  href={service.href}
                  className="group flex h-full flex-col"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#eaeef2] text-[#0a1f33] transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-[#0a1f33] group-hover:text-white group-hover:shadow-lg group-hover:shadow-[#0a1f33]/20">
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-8 font-serif text-2xl font-normal text-[#0a1f33]">
                    {service.title}
                  </h3>
                  <p className="mt-3 flex-1 text-[15px] leading-relaxed text-[#5b6573]">
                    {service.body}
                  </p>
                  <span className="mt-8 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#0a1f33] transition-colors group-hover:text-[#006d6e]">
                    Learn more
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ---------- Consult an Advisor ---------- */}
      <section id="advisors" className="bg-white">
        <div className="mx-auto max-w-[1280px] px-5 pb-8 pt-16 sm:px-8 sm:pb-12 sm:pt-24">
          <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <h2 className="font-serif text-[40px] font-normal leading-[1.08] tracking-tight text-[#0a1f33] sm:text-[52px]">
                Consult with one of
                <br />
                <span className="text-[#0a1f33]">our top advisors</span>
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <p className="text-lg leading-relaxed text-[#5b6573]">
                Sit down with a seasoned Keybase advisor who walks you through
                every step — from first conversation to long-term plan — with
                clarity, patience, and the rigor of an institutional process.
                Professional guidance, start to finish, built entirely around you.
              </p>
              <Link
                href="/contact"
                className="group mt-8 inline-flex items-center gap-2 bg-[#0a1f33] px-7 py-4 text-[15px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0e2a45] hover:shadow-xl hover:shadow-[#0a1f33]/25"
              >
                Speak with an Advisor
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </div>
        </div>
        <div className="mx-auto max-w-[1280px] px-5 pb-24 sm:px-8 sm:pb-28">
          <Reveal className="group overflow-hidden">
            <img
              src="/mainhomepage2.jpg"
              alt="A Keybase advisor consulting with a client"
              className="h-[280px] w-full object-cover object-[center_20%] transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] sm:h-[360px] lg:h-[420px]"
            />
          </Reveal>
        </div>
      </section>

      {/* ---------- Featured News & Perspectives ---------- */}
      <section id="insights" className="bg-white">
        <div className="mx-auto grid max-w-[1280px] gap-12 px-5 py-24 sm:px-8 sm:py-28 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
          <Reveal className="lg:pt-2">
            <h2 className="font-serif text-[40px] font-normal leading-[1.08] tracking-tight text-[#0a1f33] sm:text-[48px]">
              Featured News
              <br />
              &amp; Perspectives
            </h2>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-[#5b6573]">
              Explore articles and other coverage from our firm, including
              perspectives on planning, investing, and protecting wealth with
              Keybase.
            </p>
          </Reveal>

          <div>
            {featured.map((post, i) => (
              <Reveal key={post.slug} delay={i * 90}>
                <Link
                  href={`/newsroom/${post.slug}`}
                  className={`group flex items-center gap-6 py-8 ${
                    i > 0 ? "border-t border-black/10" : ""
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-[13px] text-[#5b6573]">{post.category}</p>
                    <h3 className="mt-3 font-serif text-2xl font-normal leading-snug text-[#0a1f33] transition-colors duration-300 group-hover:text-[#006d6e] sm:text-[28px]">
                      {post.card?.title ?? post.title}
                    </h3>
                    <p className="mt-3 text-[16px] leading-relaxed text-[#5b6573]">
                      {post.card?.description ?? post.excerpt}
                    </p>
                  </div>
                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-[#0a1f33]/40 text-[#0a1f33] transition-all duration-300 group-hover:scale-105 group-hover:border-[#0a1f33] group-hover:bg-[#0a1f33] group-hover:text-white">
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </Reveal>
            ))}

            <Reveal delay={featured.length * 90}>
              <Link
                href="/newsroom"
                className="group inline-flex items-center gap-2 border-t border-black/10 pt-8 text-[15px] font-semibold text-[#0a1f33] transition-colors hover:text-[#006d6e]"
              >
                Visit the Newsroom
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Compound Interest Calculator ---------- */}
      <section id="growth-calculator" className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-10 sm:px-8 sm:py-12">
          <Reveal className="max-w-2xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Plan Ahead
            </p>
            <h2 className="mt-2 font-serif text-[26px] font-normal leading-[1.12] tracking-tight text-[#0a1f33] sm:text-[30px]">
              See how your wealth can grow.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#5b6573]">
              Small, consistent investing adds up. Adjust the inputs below to
              explore how compounding, contributions, and time can shape your
              long-term financial future.
            </p>
          </Reveal>

          <Reveal delay={120} className="mt-6">
            <CompoundInterestCalculator compact />
          </Reveal>
        </div>
      </section>

      {/* ---------- Featured Carousel ---------- */}
      <FeaturedCarousel />

      <SiteFooter />
    </div>
  );
}
