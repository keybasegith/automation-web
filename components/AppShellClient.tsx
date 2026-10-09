"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import {
  NAV_SECTIONS,
  activeNavHref,
  activeNavLabel,
} from "@/lib/workspace-nav";

/** The display fields the chrome needs. Never the session token. */
export interface SessionDisplayUser {
  name: string;
  email: string;
}

function SidebarNav({ activeHref }: { activeHref: string | undefined }) {
  return (
    <nav
      aria-label="Workspace"
      className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4"
    >
      {NAV_SECTIONS.map((section, idx) => (
        <div key={section.title ?? `section-${idx}`} className="flex flex-col gap-0.5">
          {idx > 0 && <div className="my-3 border-t border-[var(--hairline)]" />}
          {section.title && (
            <p className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              {section.title}
            </p>
          )}
          {section.items.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-[13px] font-medium leading-snug transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  isActive
                    ? "bg-brand/10 text-brand"
                    : "text-slate-600 hover:bg-slate-900/[0.04] hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function SidebarBrand() {
  return (
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
        <span className="text-[11px] text-slate-500">Internal workspace</span>
      </div>
    </div>
  );
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Navigation and display chrome for the internal workspace. */
export default function AppShellClient({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionDisplayUser;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  const activeHref = activeNavHref(pathname);
  const sectionLabel = activeNavLabel(pathname) ?? "Workspace";

  // The drawer is navigation: any route change closes it. Adjusted during
  // render (not in an effect) so the closed drawer never flashes.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (menuOpen) setMenuOpen(false);
  }

  // Focus the drawer when it opens, hand focus back when it closes, and keep
  // the page behind it from scrolling.
  useEffect(() => {
    if (menuOpen) {
      wasOpen.current = true;
      closeButtonRef.current?.focus();
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      openButtonRef.current?.focus();
    }
  }, [menuOpen]);

  const onDrawerKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setMenuOpen(false);
      return;
    }
    if (event.key !== "Tab" || !drawerRef.current) return;
    const focusable = drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const identity = (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-[13px] font-medium leading-tight text-slate-900">
          {user.name}
        </p>
        <p className="text-[11px] leading-tight text-slate-500">{user.email}</p>
      </div>
      <div
        aria-hidden
        className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[12px] font-semibold text-white"
      >
        {user.name.trim().charAt(0).toUpperCase() || "?"}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <a
        href="#workspace-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-[13px] focus:font-medium focus:text-slate-900 focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-[var(--hairline)] bg-[var(--sidebar)] lg:flex">
        <SidebarBrand />
        <SidebarNav activeHref={activeHref} />
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onKeyDown={onDrawerKeyDown}>
          <div
            className="absolute inset-0 bg-slate-900/30"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Workspace navigation"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-[var(--hairline)] bg-[var(--sidebar)] shadow-xl"
          >
            <div className="flex items-center justify-between pr-3">
              <SidebarBrand />
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-900/[0.04] hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav activeHref={activeHref} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-[5] flex h-14 items-center justify-between gap-3 border-b border-[var(--hairline)] bg-white/70 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button
              ref={openButtonRef}
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-900/[0.04] hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:hidden"
            >
              <Menu aria-hidden className="h-5 w-5" />
            </button>
            <p className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
              {sectionLabel}
            </p>
          </div>
          {identity}
        </header>

        <main
          id="workspace-content"
          className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
