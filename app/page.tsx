import Link from "next/link";
import {
  ArrowRight,
  LineChart,
  TrendingUp,
  Landmark,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import Hero from "@/components/home/Hero";
import FeaturedCarousel from "@/components/home/FeaturedCarousel";
import StatsBand from "@/components/home/StatsBand";

export const metadata = {
  title: "Keybase Financial Group — Wealth Management & Advisory",
  description:
    "Keybase Financial Group partners with individuals, families, and institutions to deliver disciplined, independent financial advice built for the long term.",
};

const SERVICES = [
  {
    icon: LineChart,
    title: "Wealth Management",
    body: "Comprehensive, goals-based portfolios designed around your circumstances, time horizon, and tolerance for risk.",
  },
  {
    icon: TrendingUp,
    title: "Investment Advisory",
    body: "Disciplined, research-driven strategies across public and private markets, managed with institutional rigor.",
  },
  {
    icon: Landmark,
    title: "Retirement & Estate",
    body: "Tax-efficient planning to protect what you've built and transfer wealth seamlessly across generations.",
  },
  {
    icon: ShieldCheck,
    title: "Insurance Solutions",
    body: "Protection strategies that safeguard your family, your business, and your long-term financial security.",
  },
];

const ARTICLES = [
  {
    category: "Wealth Planning",
    title: "Five Estate Strategies High-Net-Worth Families Should Revisit This Year",
  },
  {
    category: "Market Outlook",
    title: "Positioning Portfolios for a Higher-for-Longer Rate Environment",
  },
  {
    category: "Retirement",
    title: "Building Durable Income That Outlasts a 30-Year Retirement",
  },
  {
    category: "Insurance Solutions",
    title: "How the Right Coverage Protects What You've Worked to Build",
  },
];

export default function Home() {
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      {/* ---------- Hero ---------- */}
      <Hero />

      {/* ---------- Stats band ---------- */}
      <StatsBand />

      {/* ---------- What We Do ---------- */}
      <section id="what-we-do" className="mx-auto max-w-[1280px] px-5 pb-24 pt-12 sm:px-8 sm:pb-28 sm:pt-14">
        <div className="max-w-2xl">
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
        </div>

        <div className="mt-16 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.title}
                className="group flex flex-col lg:border-l lg:border-black/15 lg:pl-12"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#eaeef2] text-[#0a1f33]">
                  <Icon className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <h3 className="mt-8 font-serif text-2xl font-normal text-[#0a1f33]">
                  {service.title}
                </h3>
                <p className="mt-3 flex-1 text-[15px] leading-relaxed text-[#5b6573]">
                  {service.body}
                </p>
                <span className="mt-8 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#0a1f33]">
                  Learn more
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- Consult an Advisor ---------- */}
      <section id="advisors" className="bg-white">
        <div className="mx-auto max-w-[1280px] px-5 pb-8 pt-16 sm:px-8 sm:pb-12 sm:pt-24">
          <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-16">
            <h2 className="font-serif text-[40px] font-normal leading-[1.08] tracking-tight text-[#0a1f33] sm:text-[52px]">
              Consult with one of
              <br />
              <span className="text-[#0a1f33]">our top advisors</span>
            </h2>
            <div>
              <p className="text-lg leading-relaxed text-[#5b6573]">
                Sit down with a seasoned Keybase advisor who walks you through
                every step — from first conversation to long-term plan — with
                clarity, patience, and the rigor of an institutional process.
                Professional guidance, start to finish, built entirely around you.
              </p>
              <Link
                href="/contact"
                className="mt-8 inline-flex items-center gap-2 bg-[#0a1f33] px-7 py-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#0e2a45]"
              >
                Speak with an Advisor
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-[1280px] px-5 pb-24 sm:px-8 sm:pb-28">
          <img
            src="/consult-advisors.jpg"
            alt="A Keybase advisor consulting with a client"
            className="h-[280px] w-full object-cover object-[center_40%] sm:h-[360px] lg:h-[420px]"
          />
        </div>
      </section>

      {/* ---------- Featured News & Perspectives ---------- */}
      <section id="insights" className="bg-white">
        <div className="mx-auto grid max-w-[1280px] gap-12 px-5 py-24 sm:px-8 sm:py-28 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
          <div className="lg:pt-2">
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
          </div>

          <div>
            {ARTICLES.map((post, i) => (
              <Link
                key={post.title}
                href="#insights"
                className={`group flex items-center gap-6 py-8 ${
                  i > 0 ? "border-t border-black/10" : ""
                }`}
              >
                <div className="flex-1">
                  <p className="text-[13px] text-[#5b6573]">{post.category}</p>
                  <h3 className="mt-3 font-serif text-2xl font-normal leading-snug text-[#0a1f33] transition-colors group-hover:text-[#0a1f33] sm:text-[28px]">
                    {post.title}
                  </h3>
                </div>
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-[#0a1f33]/40 text-[#0a1f33] transition-colors group-hover:border-[#0a1f33] group-hover:text-[#0a1f33]">
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Featured Carousel ---------- */}
      <FeaturedCarousel />

      <SiteFooter />
    </div>
  );
}
