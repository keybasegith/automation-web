import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

/**
 * One tool destination: icon tile, recognizable label, one-line hint, and an
 * optional caption (e.g. which departments share it). Used on department
 * pages and in the dashboard's shared-tools and search results.
 */
export function ToolCard({
  label,
  hint,
  href,
  icon: Icon,
  caption,
}: {
  label: string;
  hint: string;
  href: string;
  icon: LucideIcon;
  caption?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-start gap-4 rounded-xl border border-[var(--hairline)] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-[var(--hairline-strong)] hover:shadow-[0_6px_18px_rgba(15,23,42,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <Icon aria-hidden className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold tracking-tight text-slate-900">
          {label}
        </p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{hint}</p>
        {caption && (
          <p className="mt-1.5 text-[11px] font-medium text-slate-400">{caption}</p>
        )}
      </div>
      <ArrowUpRight
        aria-hidden
        className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-500"
      />
    </Link>
  );
}
