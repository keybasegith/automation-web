"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Shield } from "lucide-react";
import { BASE, EVENT, NAV_LINKS } from "@/lib/world-cup/config";
import { useAuth } from "@/lib/world-cup/auth";
import { Button, LinkButton, cx } from "./ui";

export function Navbar() {
  const pathname = usePathname();
  const { session, profile, isAdmin, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const links = [...NAV_LINKS];

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href={BASE} className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C8102E] text-lg font-black text-white">
            🍁
          </span>
          <span className="hidden text-sm font-bold leading-tight text-[#0B1F3A] sm:block">
            Argosy / Keybase
            <span className="block text-xs font-medium text-gray-500">
              {EVENT.shortTitle}
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {links.map((l) => {
            const active = l.href === BASE ? pathname === BASE : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cx(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-[#C8102E]/10 text-[#C8102E]" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {!loading && session ? (
            <>
              {isAdmin && (
                <Link
                  href={`${BASE}/admin`}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[#0B1F3A] hover:bg-gray-100"
                >
                  <Shield className="h-4 w-4" /> Admin
                </Link>
              )}
              <LinkButton href={`${BASE}/predictions`} size="sm" variant="primary">
                My Predictions
              </LinkButton>
              <Button size="sm" variant="ghost" onClick={() => signOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <LinkButton href={`${BASE}/login`} size="sm" variant="outline">
                Log in
              </LinkButton>
              <LinkButton href={`${BASE}/register`} size="sm" variant="primary">
                Join the Challenge
              </LinkButton>
            </>
          )}
        </div>

        <button
          className="rounded-lg p-2 text-[#0B1F3A] lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-gray-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {l.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-gray-200" />
            {!loading && session ? (
              <>
                {isAdmin && (
                  <Link
                    href={`${BASE}/admin`}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-[#0B1F3A] hover:bg-gray-100"
                  >
                    Admin Dashboard
                  </Link>
                )}
                <Link
                  href={`${BASE}/predictions`}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-[#0B1F3A] hover:bg-gray-100"
                >
                  My Predictions
                </Link>
                <button
                  onClick={() => {
                    setOpen(false);
                    signOut();
                  }}
                  className="rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Sign out{profile ? ` (${profile.full_name})` : ""}
                </button>
              </>
            ) : (
              <div className="flex gap-2 pt-1">
                <LinkButton href={`${BASE}/login`} size="sm" variant="outline" className="flex-1">
                  Log in
                </LinkButton>
                <LinkButton href={`${BASE}/register`} size="sm" variant="primary" className="flex-1">
                  Join
                </LinkButton>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
