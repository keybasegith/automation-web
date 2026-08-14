"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Menu, X, ChevronDown, Globe, Check, Lock, UserRound, ArrowRight } from "lucide-react";
import type { NavContent, NavChild, NavItem as CmsNavItem } from "@/lib/cms/types";

/**
 * Interactive site header. Content (nav items, utility links, logo, CTA,
 * announcement) is passed in from the published CMS by the SiteHeader server
 * wrapper. "Our Services" is now an ordinary link to the /services hub, which
 * indexes every service in its own tabs, so the header no longer carries a
 * mega menu.
 */

const LANGUAGES = [
  { code: "EN", label: "English" },
  { code: "FR", label: "Français" },
  { code: "ZH", label: "中文" },
  { code: "KO", label: "한국어" },
  { code: "ES", label: "Español" },
  { code: "HI", label: "हिन्दी" },
];

export interface HeaderSettings {
  logoUrl: string;
  logoAlt: string;
  announcement: string;
  announcementUrl: string;
  ctaLabel: string;
  ctaUrl: string;
}

/** Pick the utility-bar icon by link intent, preserving the original look. */
function utilityIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes("client")) return <Lock className="h-4 w-4" strokeWidth={2} />;
  if (l.includes("advisor")) return <UserRound className="h-4 w-4" strokeWidth={2} />;
  return null;
}

export default function SiteHeaderClient({
  nav,
  settings,
}: {
  nav: NavContent;
  settings: HeaderSettings;
}) {
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openMobileMenu, setOpenMobileMenu] = useState<string | null>(null);
  const [lang, setLang] = useState("EN");
  const [langOpen, setLangOpen] = useState(false);

  const items = nav.items.filter((i) => i.isVisible);
  const utilityLinks = nav.utilityLinks.filter((u) => u.isVisible);
  const visibleChildren = (item: CmsNavItem): NavChild[] =>
    item.children.filter((c) => c.isVisible);

  return (
    <>
      {/* ---------- Top utility bar ---------- */}
      <div className="bg-[#0a1420] text-white">
        <div className="mx-auto flex h-[44px] max-w-[1280px] items-center justify-between gap-4 px-5 sm:px-8">
          {/* Left: advisor recruitment promo */}
          <Link
            href={settings.announcementUrl || "#"}
            className="flex min-w-0 items-center gap-2 text-[13px] sm:text-[14px]"
          >
            <span className="truncate">
              <span className="hidden sm:inline">Join our team. </span>
              {settings.announcement}
            </span>
            <span className="hidden items-center gap-1 font-medium text-[#5ed3c6] transition-colors hover:text-[#8ce6dc] sm:flex">
              Find out more
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </span>
          </Link>

          {/* Right: access portals */}
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            {utilityLinks.map((link, i) => (
              <div key={`${link.label}-${link.url}`} className="flex items-center gap-3 sm:gap-4">
                {i > 0 && <span className="h-4 w-px bg-white/25" aria-hidden="true" />}
                <a
                  href={link.url}
                  target={link.openInNewTab ? "_blank" : undefined}
                  rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                  className="flex items-center gap-1.5 text-[13px] font-medium transition-colors hover:text-[#5ed3c6] sm:text-[14px]"
                >
                  {utilityIcon(link.label)}
                  <span className="whitespace-nowrap">{link.label}</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-black/10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" aria-label={`${settings.logoAlt} home`} className="flex items-center">
          <Image
            src={settings.logoUrl}
            alt={settings.logoAlt}
            width={553}
            height={126}
            priority
            className="h-8 w-auto"
          />
        </Link>

        {/* Primary nav */}
        <nav className="hidden items-center gap-8 lg:flex">
          {items.map((item) =>
            visibleChildren(item).length > 0 ? (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setOpenMenu(item.label)}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <button
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={openMenu === item.label}
                  onClick={() =>
                    setOpenMenu((cur) => (cur === item.label ? null : item.label))
                  }
                  className="flex items-center gap-1 text-[15px] font-medium text-[#1a2433] transition-colors hover:text-[#006d6e]"
                >
                  {item.label}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      openMenu === item.label ? "rotate-180" : ""
                    }`}
                    strokeWidth={2}
                  />
                </button>

                {openMenu === item.label && (
                  <div className="absolute left-0 top-full pt-3">
                    <div className="w-60 overflow-hidden rounded-md border border-black/10 bg-white py-2 shadow-lg shadow-black/5">
                      {visibleChildren(item).map((child) => (
                        <Link
                          key={`${child.label}-${child.url}`}
                          href={child.url}
                          target={child.openInNewTab ? "_blank" : undefined}
                          rel={child.openInNewTab ? "noopener noreferrer" : undefined}
                          onClick={() => setOpenMenu(null)}
                          className="block px-5 py-2.5 text-[15px] font-medium text-[#1a2433] transition-colors hover:bg-[#f3f6f7] hover:text-[#006d6e]"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.label}
                href={item.url || "#"}
                target={item.openInNewTab ? "_blank" : undefined}
                rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                className="text-[15px] font-medium text-[#1a2433] transition-colors hover:text-[#006d6e]"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        {/* Utility / actions */}
        <div className="hidden items-center gap-6 lg:flex">
          {/* Language selector */}
          <div
            className="relative"
            onMouseEnter={() => setLangOpen(true)}
            onMouseLeave={() => setLangOpen(false)}
          >
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={langOpen}
              aria-label="Select language"
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1.5 text-[15px] font-medium text-[#1a2433] transition-colors hover:text-[#006d6e]"
            >
              <Globe className="h-[18px] w-[18px]" strokeWidth={2} />
              {lang}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  langOpen ? "rotate-180" : ""
                }`}
                strokeWidth={2}
              />
            </button>

            {langOpen && (
              <div className="absolute right-0 top-full pt-3">
                <div className="w-48 overflow-hidden rounded-md border border-black/10 bg-white py-2 shadow-lg shadow-black/5">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        setLang(l.code);
                        setLangOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-5 py-2.5 text-left text-[15px] font-medium text-[#1a2433] transition-colors hover:bg-[#f3f6f7] hover:text-[#006d6e]"
                    >
                      {l.label}
                      {lang === l.code && (
                        <Check className="h-4 w-4 text-[#006d6e]" strokeWidth={2.5} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            aria-label="Search"
            className="text-[#1a2433] transition-colors hover:text-[#006d6e]"
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
          <Link
            href={settings.ctaUrl || "#"}
            className="border border-[#1a2433] bg-[#1a2433] px-5 py-2.5 text-[14px] font-semibold tracking-wide text-white transition-colors hover:bg-white hover:text-[#1a2433]"
          >
            {settings.ctaLabel}
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="text-[#1a2433] lg:hidden"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-black/10 bg-white lg:hidden">
          <nav className="mx-auto flex max-w-[1280px] flex-col px-5 py-3 sm:px-8">
            {items.map((item) =>
              visibleChildren(item).length > 0 ? (
                <div key={item.label}>
                  <button
                    type="button"
                    aria-expanded={openMobileMenu === item.label}
                    onClick={() =>
                      setOpenMobileMenu((cur) =>
                        cur === item.label ? null : item.label
                      )
                    }
                    className="flex w-full items-center justify-between border-b border-black/5 py-3 text-[15px] font-medium text-[#1a2433]"
                  >
                    {item.label}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        openMobileMenu === item.label ? "rotate-180" : ""
                      }`}
                      strokeWidth={2}
                    />
                  </button>
                  {openMobileMenu === item.label && (
                    <div className="border-b border-black/5 bg-[#f7f9fa]">
                      {visibleChildren(item).map((child) => (
                        <Link
                          key={`${child.label}-${child.url}`}
                          href={child.url}
                          target={child.openInNewTab ? "_blank" : undefined}
                          rel={child.openInNewTab ? "noopener noreferrer" : undefined}
                          onClick={() => {
                            setOpen(false);
                            setOpenMobileMenu(null);
                          }}
                          className="block py-3 pl-4 text-[15px] text-[#5b6573]"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={item.label}
                  href={item.url || "#"}
                  target={item.openInNewTab ? "_blank" : undefined}
                  rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                  onClick={() => setOpen(false)}
                  className="border-b border-black/5 py-3 text-[15px] font-medium text-[#1a2433]"
                >
                  {item.label}
                </Link>
              )
            )}
            <Link
              href={settings.ctaUrl || "#"}
              onClick={() => setOpen(false)}
              className="mt-4 border border-[#1a2433] bg-[#1a2433] px-5 py-3 text-center text-[14px] font-semibold tracking-wide text-white transition-colors hover:bg-white hover:text-[#1a2433]"
            >
              {settings.ctaLabel}
            </Link>

            {/* Language selector */}
            <div className="mt-6">
              <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#9aa3ad]">
                <Globe className="h-4 w-4" strokeWidth={2} />
                Language
              </p>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLang(l.code)}
                    className={`rounded-full px-4 py-2 text-[14px] font-medium transition-colors ${
                      lang === l.code
                        ? "bg-[#0a1f33] text-white"
                        : "border border-black/15 text-[#1a2433]"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
    </>
  );
}
