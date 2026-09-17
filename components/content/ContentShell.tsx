"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardCheck,
  ExternalLink,
  FileText,
  LogOut,
  Newspaper,
  Users,
} from "lucide-react";
import type { ContentRole } from "@/lib/content/types";

/**
 * The sidebar and chrome for /content.
 *
 * Visually the same language as the website CMS shell — slate canvas, white
 * sidebar, teal active state — because staff move between the two and a second
 * design vocabulary would just be something else to learn.
 *
 * The nav is filtered by role, but that is presentation only. Every route and
 * every API call re-checks permissions server-side through lib/content/authz.ts;
 * hiding a link here stops nothing on its own.
 */

interface NavItem {
  label: string;
  href: string;
  icon: typeof FileText;
  roles: ContentRole[];
  exact?: boolean;
}

const NAV: NavItem[] = [
  {
    label: "Content",
    href: "/content",
    icon: FileText,
    roles: ["advisor", "compliance", "admin"],
    exact: true,
  },
  {
    label: "Content Review",
    href: "/content/review",
    icon: ClipboardCheck,
    roles: ["compliance", "admin"],
  },
  {
    label: "Publishing",
    href: "/content/publishing",
    icon: Newspaper,
    roles: ["admin"],
  },
  { label: "People", href: "/content/people", icon: Users, roles: ["admin"] },
];

export interface Viewer {
  id: string;
  name: string;
  email: string;
  role: ContentRole;
}

const ROLE_LABELS: Record<ContentRole, string> = {
  advisor: "Advisor",
  compliance: "Compliance",
  admin: "Content Administrator",
};

export default function ContentShell({
  viewer,
  children,
}: {
  viewer: Viewer;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await fetch("/api/content/session", { method: "DELETE" }).catch(() => {});
    router.replace("/content");
    router.refresh();
  };

  const items = NAV.filter((item) => item.roles.includes(viewer.role));

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-5">
          <Image
            src="/keybase-logo%20copy.png"
            alt="Keybase"
            width={40}
            height={40}
            className="h-9 w-9 rounded-lg object-contain"
          />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">Keybase Content</p>
            <p className="text-xs text-slate-400">Publishing &amp; Compliance</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[#006d6e]/10 text-[#006d6e]"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 px-3 py-4">
          <div className="px-3 pb-3">
            <p className="truncate text-sm font-medium text-slate-700">
              {viewer.name}
            </p>
            <p className="text-xs text-slate-400">{ROLE_LABELS[viewer.role]}</p>
          </div>
          <a
            href="/newsroom"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            <ExternalLink className="h-[18px] w-[18px]" strokeWidth={1.9} />
            View newsroom
          </a>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.9} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Phone header. Long-form writing is a desktop job, but checking status
          and reading compliance feedback has to work from anywhere. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Image
              src="/keybase-logo%20copy.png"
              alt="Keybase"
              width={32}
              height={32}
              className="h-7 w-7 rounded-md object-contain"
            />
            <span className="text-sm font-semibold">Keybase Content</span>
          </div>
          <nav className="flex items-center gap-1">
            {items.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  className={`rounded-lg p-2 transition ${
                    active ? "bg-[#006d6e]/10 text-[#006d6e]" : "text-slate-500"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
