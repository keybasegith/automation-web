import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { Department } from "@/lib/departments";

/** One department tile on the dashboard directory grid. */
export function DepartmentCard({ department }: { department: Department }) {
  const Icon = department.icon;
  const toolCount = department.tools.length;
  return (
    <Link
      href={`/dashboard/departments/${department.slug}`}
      className="group relative flex flex-col gap-4 rounded-2xl border border-[var(--hairline)] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-[var(--hairline-strong)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Icon aria-hidden className="h-5.5 w-5.5" />
        </div>
        <ArrowUpRight
          aria-hidden
          className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">
          {department.name}
        </h3>
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-400">
          {department.tagline}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
          {department.description}
        </p>
      </div>
      <p className="mt-auto pt-1 text-[12px] font-medium text-slate-500">
        {toolCount} tool{toolCount === 1 ? "" : "s"}
      </p>
    </Link>
  );
}
