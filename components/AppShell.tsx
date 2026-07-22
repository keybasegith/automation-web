"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ScanLine,
  FileSpreadsheet,
  Calculator,
  Scale,
  type LucideIcon,
} from "lucide-react";

export interface MenuItem {
  label: string;
  href?: string;
  matchPaths?: readonly string[];
  exact?: boolean;
  icon?: LucideIcon;
}

export interface MenuSection {
  title?: string;
  items: readonly MenuItem[];
}

const MAIN_MENU: readonly MenuItem[] = [
  { label: "Dashboard", href: "/dashboard", exact: true },
  { label: "Clients", href: "/dashboard/clients" },
  {
    label: "Client Communication & Outreach",
    href: "/dashboard/client-communication",
    matchPaths: [
      "/dashboard/client-communication",
      "/dashboard/automation",
      "/dashboard/document-refresh",
      "/secure-email-generator",
    ],
  },
  {
    label: "Smart Document Center",
    href: "/smart-document-intake",
    icon: ScanLine,
  },
  { label: "Document Management & Uploads" },
  {
    label: "Form Processing & Compliance",
    href: "/dashboard/form-processing-compliance",
    matchPaths: [
      "/dashboard/form-processing-compliance",
      "/dashboard/form-prepopulation",
    ],
  },
  {
    label: "Form Intelligence & Compliance Review",
    href: "/dashboard/form-processing",
    matchPaths: [
      "/dashboard/form-processing",
      "/dashboard/compliance/review",
      "/dashboard/bp/approved-packages",
      "/dashboard/bp/package",
      "/dashboard/audit-logs",
    ],
  },
  { label: "Prospecting" },
];

const ONBOARDING_MENU: readonly MenuItem[] = [
  { label: "New Onboarding", href: "/onboarding/new" },
  { label: "Active", href: "/onboarding/active" },
  { label: "Completed", href: "/onboarding/completed" },
];

const ADMIN_MENU: readonly MenuItem[] = [
  { label: "Compliance Rules", href: "/dashboard/compliance" },
  { label: "Audit Logs", href: "/dashboard/audit" },
];

const SETTLEMENT_MENU: readonly MenuItem[] = [
  {
    label: "Net Settlement",
    href: "/net-settlement",
    matchPaths: ["/net-settlement"],
    icon: Scale,
  },
];

const FINANCE_MENU: readonly MenuItem[] = [
  {
    label: "Monthly Account Analysis",
    href: "/finance-intelligence",
    icon: FileSpreadsheet,
  },
  {
    label: "Compound Interest Calculator",
    href: "/compound-interest",
    icon: Calculator,
  },
];

const SECTIONS: readonly MenuSection[] = [
  { items: MAIN_MENU },
  { title: "Client Onboarding", items: ONBOARDING_MENU },
  { title: "Business Processing", items: SETTLEMENT_MENU },
  { title: "Finance Intelligence", items: FINANCE_MENU },
  { title: "Compliance", items: ADMIN_MENU },
];

const ALL_ITEMS: readonly MenuItem[] = SECTIONS.flatMap((s) => s.items);

const subscribeAuth = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

const getAuth = () =>
  window.localStorage.getItem("isAuthenticated") === "true";

const getServerAuth = () => false;

function activeLabelFor(pathname: string): string {
  let best: { label: string; matchLength: number } | null = null;
  for (const item of ALL_ITEMS) {
    const paths = item.matchPaths ?? (item.href ? [item.href] : []);
    for (const p of paths) {
      const matches = item.exact ? pathname === p : pathname.startsWith(p);
      if (matches && (!best || p.length > best.matchLength)) {
        best = { label: item.label, matchLength: p.length };
      }
    }
  }
  return best?.label ?? MAIN_MENU[0].label;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = useSyncExternalStore(
    subscribeAuth,
    getAuth,
    getServerAuth
  );
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (isHydrated && !isAuthenticated) {
    router.replace("/login");
    return null;
  }
  if (!isHydrated) return null;

  const activeLabel = activeLabelFor(pathname);

  const renderItem = (item: MenuItem) => {
    const isActive = item.label === activeLabel;
    const className = `group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition ${
      isActive
        ? "bg-brand/10 text-brand"
        : "text-slate-600 hover:bg-slate-900/[0.04] hover:text-slate-900"
    }`;
    const Icon = item.icon;
    const inner = (
      <>
        {Icon && (
          <Icon
            className={`h-4 w-4 shrink-0 ${
              isActive ? "text-brand" : "text-slate-400 group-hover:text-slate-600"
            }`}
          />
        )}
        <span className="flex-1 leading-snug">{item.label}</span>
      </>
    );
    if (item.href) {
      return (
        <Link key={item.label} href={item.href} className={className}>
          {inner}
        </Link>
      );
    }
    return (
      <button key={item.label} type="button" className={className}>
        {inner}
      </button>
    );
  };

  const handleSignOut = () => {
    window.localStorage.removeItem("isAuthenticated");
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <aside className="fixed inset-y-0 left-0 z-10 flex w-64 flex-col border-r border-[var(--hairline)] bg-[var(--sidebar)]">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
            <Image
              src="/keybase-logo%20copy.png"
              alt="Keybase Financial Group"
              width={200}
              height={200}
              priority
              className="h-6 w-6 object-contain"
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-semibold tracking-tight text-slate-900">
              Keybase
            </span>
            <span className="text-[11px] text-slate-500">Automation</span>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4">
          {SECTIONS.map((section, idx) => (
            <div key={section.title ?? `section-${idx}`} className="flex flex-col gap-0.5">
              {idx > 0 && <div className="my-3 border-t border-[var(--hairline)]" />}
              {section.title && (
                <p className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  {section.title}
                </p>
              )}
              {section.items.map(renderItem)}
            </div>
          ))}
        </nav>

        <div className="border-t border-[var(--hairline)] px-3 py-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-slate-500 transition hover:bg-slate-900/[0.04] hover:text-slate-900"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col pl-64">
        <header className="sticky top-0 z-[5] flex h-14 items-center justify-between border-b border-[var(--hairline)] bg-white/70 px-8 backdrop-blur-xl">
          <h1 className="text-[15px] font-semibold tracking-tight text-slate-900">
            {activeLabel}
          </h1>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[13px] font-medium leading-tight text-slate-900">
                Admin
              </p>
              <p className="text-[11px] leading-tight text-slate-500">
                admin@keybase.com
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-hover text-[12px] font-semibold text-white shadow-sm">
              A
            </div>
          </div>
        </header>

        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
