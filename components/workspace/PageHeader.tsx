import type { LucideIcon } from "lucide-react";

import { Breadcrumbs, type Crumb } from "@/components/workspace/Breadcrumbs";

/**
 * The standard workspace page header: optional breadcrumb trail, an optional
 * icon tile, the page's h1, a short description, and an actions slot on the
 * right for the page's primary and secondary buttons.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  breadcrumbs,
  actions,
  className = "mb-8",
}: {
  title: string;
  description?: string;
  /** Small uppercase context line above the title. */
  eyebrow?: string;
  icon?: LucideIcon;
  breadcrumbs?: readonly Crumb[];
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={className}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-start gap-4">
          {Icon && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Icon aria-hidden className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-slate-400">
                {eyebrow}
              </p>
            )}
            <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-slate-900">
              {title}
            </h1>
            {description && (
              <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-slate-500">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>
        )}
      </div>
    </header>
  );
}
