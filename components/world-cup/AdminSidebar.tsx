"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardCheck,
  Users,
  Megaphone,
  Trophy,
  Download,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { ADMIN_NAV, BASE } from "@/lib/world-cup/config";
import { cx } from "./ui";

const ICONS: Record<string, LucideIcon> = {
  Overview: LayoutDashboard,
  Matches: CalendarDays,
  Results: ClipboardCheck,
  Participants: Users,
  Leaderboard: Trophy,
  Announcements: Megaphone,
  Exports: Download,
};

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-gray-200 bg-white md:w-60 md:shrink-0 md:border-b-0 md:border-r">
      <div className="px-4 py-5">
        <Link href={BASE} className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#C8102E]">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to site
        </Link>
        <p className="px-2 text-xs font-bold uppercase tracking-wider text-gray-400">Admin</p>
        <nav className="mt-2 flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {ADMIN_NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = ICONS[item.label];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "inline-flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-[#C8102E]/10 text-[#C8102E]"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
