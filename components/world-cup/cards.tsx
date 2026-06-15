import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { formatDateOnly } from "@/lib/world-cup/format";
import type { Announcement } from "@/lib/world-cup/types";
import { Badge, Card, cx } from "./ui";

/* InfoCard — generic content tile used on the landing/info pages. */
export function InfoCard({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cx("h-full", className)}>
      {Icon && (
        <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#C8102E]/10 text-[#C8102E]">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <h3 className="text-lg font-bold text-[#0B1F3A]">{title}</h3>
      <div className="mt-2 text-sm leading-relaxed text-gray-600">{children}</div>
    </Card>
  );
}

/* PrizeCard — highlights a prize / reward. */
export function PrizeCard({
  eyebrow,
  title,
  children,
  accent = false,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <Card
      className={cx(
        "h-full",
        accent && "border-[#C8102E]/30 bg-gradient-to-br from-[#C8102E]/5 to-transparent"
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-[#C8102E]">{eyebrow}</p>
      <h3 className="mt-1 text-xl font-bold text-[#0B1F3A]">{title}</h3>
      <div className="mt-3 text-sm leading-relaxed text-gray-600">{children}</div>
    </Card>
  );
}

/* AdminStatCard — KPI tile for the admin overview. */
export function AdminStatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <Card className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="mt-1 text-3xl font-black tabular-nums text-[#0B1F3A]">{value}</p>
        {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      </div>
      {Icon && (
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1F3A]/5 text-[#0B1F3A]">
          <Icon className="h-5 w-5" />
        </span>
      )}
    </Card>
  );
}

/* AnnouncementCard — a published update. */
export function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const tone = announcement.type === "weekly" ? "navy" : announcement.type === "daily" ? "red" : "gray";
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <Badge tone={tone}>{announcement.type.toUpperCase()}</Badge>
        <span className="text-xs text-gray-400">{formatDateOnly(announcement.created_at)}</span>
      </div>
      <h3 className="mt-3 text-base font-bold text-[#0B1F3A]">{announcement.title}</h3>
      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-gray-600">
        {announcement.body}
      </p>
    </Card>
  );
}

/* DailyTrackerCard — section wrapper used on the tracker page. */
export function DailyTrackerCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; href: string };
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#0B1F3A]">{title}</h2>
        {action && (
          <Link href={action.href} className="text-sm font-semibold text-[#C8102E] hover:underline">
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </Card>
  );
}
