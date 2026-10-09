import {
  PackageCheck,
  PlayCircle,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { DashboardDirectory } from "@/components/dashboard/DashboardDirectory";

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

/** Frequent tasks with working destinations; navigation, not status. */
const QUICK_ACTIONS: readonly {
  label: string;
  href: string;
  icon: LucideIcon;
}[] = [
  { label: "Find a client", href: "/dashboard/clients", icon: Users },
  { label: "Start client onboarding", href: "/onboarding/new", icon: UserPlus },
  { label: "Resume an onboarding", href: "/onboarding/active", icon: PlayCircle },
  {
    label: "Review approved packages",
    href: "/dashboard/bp/approved-packages",
    icon: PackageCheck,
  },
];

export default function DashboardHomePage() {
  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8">
        <p className="text-[13px] text-slate-500">{formatLongDate(new Date())}</p>
        <h1 className="font-display mt-1 text-[32px] font-semibold leading-tight tracking-tight text-slate-900">
          {greeting()}
        </h1>
        <p className="mt-1.5 text-[15px] text-slate-500">
          Find your department, jump into a common task, or open a shared tool.
        </p>
      </header>

      <section aria-label="Quick actions" className="mb-10">
        <div className="flex flex-wrap gap-2.5">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--hairline-strong)] bg-white px-4 py-2 text-[13px] font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <Icon aria-hidden className="h-4 w-4 text-brand" />
                {action.label}
              </Link>
            );
          })}
        </div>
      </section>

      <DashboardDirectory />
    </div>
  );
}
