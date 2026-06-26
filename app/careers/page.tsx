import Link from "next/link";
import {
  ArrowRight,
  Compass,
  TrendingUp,
  Rocket,
  Users,
  ShieldCheck,
  Heart,
} from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import Careers from "@/components/careers/Careers";

export const metadata = {
  title: "Careers — Keybase Financial Group",
  description:
    "Build your career at Keybase Financial Group — an independent, Canadian-owned advisory firm. Explore open roles across advisory, compliance, operations, and more, and apply today.",
};

const BENEFITS = [
  {
    icon: Compass,
    title: "True independence",
    body: "Work free from product quotas and corporate parents — focused on a single question: what is right for the client.",
  },
  {
    icon: TrendingUp,
    title: "Room to grow",
    body: "Mentorship, training, and a clear path to advance your career alongside seasoned professionals.",
  },
  {
    icon: Rocket,
    title: "Entrepreneurial culture",
    body: "Build your own practice and ideas with the backing and stability of a national platform.",
  },
  {
    icon: Users,
    title: "People-first",
    body: "Long-term relationships with clients and colleagues, built on trust, respect, and continuity.",
  },
  {
    icon: ShieldCheck,
    title: "Stability & trust",
    body: "Join a firm built on transparency, integrity, and disciplined advice since 1997.",
  },
  {
    icon: Heart,
    title: "Community & impact",
    body: "Give back through charitable initiatives that strengthen communities across Canada.",
  },
];

export default function CareersPage() {
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden border-b border-black/10 bg-[#0a1f33] text-white">
        <video
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
        >
          <source src="/hero-section-vid1.mp4" type="video/mp4" />
        </video>
        <div
          className="pointer-events-none absolute inset-0 bg-[#0a1f33]/65"
          aria-hidden
        />

        <div className="relative mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-white/70">
            Careers
          </p>
          <h1
            className="mt-5 max-w-3xl font-serif text-[42px] font-normal leading-[1.06] tracking-tight sm:text-[60px]"
            style={{ textShadow: "0 2px 28px rgba(0,0,0,0.5)" }}
          >
            Build your career, independently.
          </h1>
          <p
            className="mt-7 max-w-2xl text-lg leading-relaxed text-white/85"
            style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
          >
            At Keybase, you&apos;ll do the best work of your career — backed by an
            independent, people-first firm that invests in your growth and puts
            clients first. Explore our open roles and find where you belong.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="#open-roles"
              className="group inline-flex items-center gap-2 bg-white px-7 py-4 text-[15px] font-semibold text-[#0a1f33] transition-colors hover:bg-[#e6f1f1]"
            >
              View Open Roles
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="#apply"
              className="inline-flex items-center gap-2 border border-white/40 px-7 py-4 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
            >
              Apply Now
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Why Keybase ---------- */}
      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#006d6e]">
            Why Keybase
          </p>
          <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
            A place to build something lasting.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
            We&apos;re an independent, Canadian-owned firm where people, not
            products, come first — and where your ambition has room to grow.
          </p>
        </div>

        <div className="mt-16 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.title} className="flex flex-col">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#eaeef2] text-[#0a1f33]">
                  <Icon className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <h3 className="mt-7 font-serif text-2xl font-normal text-[#0a1f33]">
                  {b.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[#5b6573]">
                  {b.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- Open roles + application ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Careers />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
