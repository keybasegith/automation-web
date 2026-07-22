"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  LogOut,
  ExternalLink,
  LayoutDashboard,
  Menu,
  PanelBottom,
  Settings,
  Image as ImageIcon,
  History,
  FileText,
  Briefcase,
  Newspaper,
  Building2,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: typeof Users;
  /** Extra paths that should also highlight this item. */
  match?: string[];
}

const NAV: NavItem[] = [
  { label: "Overview", href: "/website-admin-cms", icon: LayoutDashboard },
  { label: "Key Executives", href: "/website-admin-cms/executives", icon: Users },
  { label: "Company Pages", href: "/website-admin-cms/company-pages", icon: Building2 },
  { label: "Service Pages", href: "/website-admin-cms/service-pages", icon: FileText },
  { label: "Careers", href: "/website-admin-cms/careers", icon: Briefcase },
  { label: "Newsroom", href: "/website-admin-cms/newsroom", icon: Newspaper },
  { label: "Navigation", href: "/website-admin-cms/navigation", icon: Menu },
  { label: "Footer", href: "/website-admin-cms/footer", icon: PanelBottom },
  { label: "Global Settings", href: "/website-admin-cms/global-settings", icon: Settings },
  { label: "Media Library", href: "/website-admin-cms/media", icon: ImageIcon },
  { label: "Version History", href: "/website-admin-cms/history", icon: History },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"checking" | "authed" | "guest">(
    "checking"
  );

  useEffect(() => {
    let active = true;
    fetch("/api/website-admin-cms/session")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (d?.authenticated) {
          setStatus("authed");
        } else {
          setStatus("guest");
          router.replace("/website-admin-cms");
        }
      })
      .catch(() => {
        if (!active) return;
        setStatus("guest");
        router.replace("/website-admin-cms");
      });
    return () => {
      active = false;
    };
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/website-admin-cms/logout", { method: "POST" }).catch(() => {});
    router.replace("/website-admin-cms");
  };

  if (status !== "authed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-5">
          <Image
            src="/keybase-logo%20copy.png"
            alt="Keybase"
            width={40}
            height={40}
            className="h-9 w-9 rounded-lg object-contain"
          />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">Website Admin</p>
            <p className="text-xs text-slate-400">Content Management</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => {
            const active =
              item.href === "/website-admin-cms"
                ? pathname === "/website-admin-cms"
                : (item.match ?? [item.href]).some((p) =>
                    pathname.startsWith(p)
                  );
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

        <div className="space-y-1 border-t border-slate-200 px-3 py-4">
          <a
            href="/key-executives"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            <ExternalLink className="h-[18px] w-[18px]" strokeWidth={1.9} />
            View live site
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.9} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
