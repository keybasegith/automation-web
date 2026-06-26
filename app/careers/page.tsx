import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import Careers from "@/components/careers/Careers";

export const metadata = {
  title: "Careers — Keybase Financial Group",
  description:
    "Build your career at Keybase Financial Group — an independent, Canadian-owned advisory firm. Explore open roles across advisory, compliance, operations, and more, and apply today.",
};

export default function CareersPage() {
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden border-b border-black/10 bg-[#0a1f33] text-white">
        <img
          src="/careers-hero.jpg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
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
