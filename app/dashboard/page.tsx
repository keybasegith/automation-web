import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DEPARTMENTS } from "@/lib/departments";

export const dynamic = "force-dynamic";

const greeting = (): string => {
  const h = new Date().getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const formatLongDate = (d: Date): string =>
  d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

export default function DashboardHomePage() {
  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-10">
        <p className="text-[13px] text-slate-500">{formatLongDate(new Date())}</p>
        <h2 className="font-display mt-1 text-[34px] font-semibold leading-tight tracking-tight text-slate-900">
          {greeting()}, Admin
        </h2>
        <p className="mt-1.5 text-[15px] text-slate-500">
          Choose a department to see the tools available to that team.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DEPARTMENTS.map((dept) => {
          const Icon = dept.icon;
          return (
            <Link
              key={dept.slug}
              href={`/dashboard/departments/${dept.slug}`}
              className="group relative flex flex-col gap-4 rounded-2xl border border-[var(--hairline)] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[var(--hairline-strong)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${dept.accent}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-[16px] font-semibold tracking-tight text-slate-900">
                  {dept.name}
                </h3>
                <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-slate-400">
                  {dept.tagline}
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
                  {dept.description}
                </p>
              </div>
              <div className="mt-auto flex items-center justify-between pt-2 text-[12px] font-medium text-slate-500">
                <span>
                  {dept.tools.length} tool{dept.tools.length === 1 ? "" : "s"}
                </span>
                <span className="text-brand transition group-hover:text-brand-hover">
                  Open →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
