/**
 * One tile on the dashboard home grid.
 *
 * The markup that used to live inline in the dashboard page, lifted so every
 * card — department or standalone workspace — is the same size, spacing,
 * radius, shadow, and hover behaviour by construction.
 */

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { DashboardCardData } from "@/lib/dashboard-cards";

export function DashboardCard({ card }: { card: DashboardCardData }) {
  const Icon = card.icon;
  return (
    <Link
      href={card.href}
      className="group relative flex flex-col gap-4 rounded-2xl border border-[var(--hairline)] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[var(--hairline-strong)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${card.accent}`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-[16px] font-semibold tracking-tight text-slate-900">
          {card.name}
        </h3>
        <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-slate-400">
          {card.tagline}
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
          {card.description}
        </p>
      </div>
      <div className="mt-auto flex items-center justify-between pt-2 text-[12px] font-medium text-slate-500">
        <span>{card.footnote}</span>
        <span className="text-brand transition group-hover:text-brand-hover">
          Open →
        </span>
      </div>
    </Link>
  );
}
