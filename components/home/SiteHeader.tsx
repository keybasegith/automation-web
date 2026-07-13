"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Menu, X, ChevronDown, Globe, Check, Lock, UserRound, ArrowRight } from "lucide-react";

type ServiceLink = { label: string; href: string };
type ServiceGroup = { heading?: string; links: ServiceLink[] };
type ServiceColumn = { title: string; groups: ServiceGroup[] };

type NavItem = {
  label: string;
  href?: string;
  children?: { label: string; href: string }[];
  mega?: ServiceColumn[];
};

const SERVICES_MENU: ServiceColumn[] = [
  {
    title: "Wealth Planning",
    groups: [
      {
        links: [
          { label: "Education Planning", href: "/education-planning" },
          { label: "Estate Planning", href: "/estate-planning" },
          { label: "Retirement Planning", href: "/retirement-planning" },
          { label: "Tax Planning", href: "/tax-planning" },
          { label: "Wealth Building", href: "/wealth-building" },
        ],
      },
    ],
  },
  {
    title: "Investment Solutions",
    groups: [
      {
        heading: "Plans",
        links: [
          { label: "Non-Registered Investments", href: "/non-registered-investments" },
          { label: "Registered Disability Savings Plan (RDSP)", href: "/rdsp" },
          { label: "Registered Education Savings Plan (RESP)", href: "/resp" },
          { label: "Registered Retirement Savings Plan (RRSP)", href: "/rrsp" },
          { label: "Tax-Free Savings Account (TFSA)", href: "/tfsa" },
          { label: "First Home Savings Account (FHSA)", href: "/fhsa" },
        ],
      },
      {
        heading: "Products",
        links: [
          { label: "Traditional Investments", href: "/traditional-investments" },
          { label: "Alternative Investments", href: "/alternative-investments" },
        ],
      },
    ],
  },
  {
    title: "Preservation Strategies",
    groups: [
      {
        links: [
          { label: "Insurance", href: "/insurance" },
          { label: "Travel Insurance", href: "/travel-insurance" },
          { label: "Segregated Funds", href: "/segregated-funds" },
        ],
      },
    ],
  },
];

const LANGUAGES = [
  { code: "EN", label: "English" },
  { code: "FR", label: "Français" },
  { code: "ZH", label: "中文" },
  { code: "KO", label: "한국어" },
  { code: "ES", label: "Español" },
  { code: "HI", label: "हिन्दी" },
];

const NAV: NavItem[] = [
  {
    label: "Company",
    children: [
      { label: "About Us", href: "/about" },
      { label: "CEO Message", href: "/ceo-message" },
    ],
  },
  {
    label: "Our Team",
    children: [
      { label: "Key Executives", href: "/key-executives" },
      { label: "Our Advisors", href: "/our-advisors" },
    ],
  },
  { label: "Our Services", mega: SERVICES_MENU },
  { label: "Newsroom", href: "/newsroom" },
  { label: "Careers", href: "/careers" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openMobileMenu, setOpenMobileMenu] = useState<string | null>(null);
  const [lang, setLang] = useState("EN");
  const [langOpen, setLangOpen] = useState(false);

  // The mega menu sits below the header, leaving a small gap between the
  // trigger and the panel. Close on a short delay so moving the pointer across
  // that gap into the panel doesn't dismiss the menu.
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openMenuNow = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenMenu(label);
  };
  const closeMenuSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 120);
  };

  return (
    <>
      {/* ---------- Top utility bar ---------- */}
      <div className="bg-[#0a1420] text-white">
        <div className="mx-auto flex h-[44px] max-w-[1280px] items-center justify-between gap-4 px-5 sm:px-8">
          {/* Left: advisor recruitment promo */}
          <Link
            href="/become-an-advisor"
            className="flex min-w-0 items-center gap-2 text-[13px] sm:text-[14px]"
          >
            <span className="truncate">
              <span className="hidden sm:inline">Join our team. </span>
              Are you ready to grow your business?
            </span>
            <span className="hidden items-center gap-1 font-medium text-[#5ed3c6] transition-colors hover:text-[#8ce6dc] sm:flex">
              Find out more
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </span>
          </Link>

          {/* Right: access portals */}
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <a
              href="https://winvestor.keybase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[13px] font-medium transition-colors hover:text-[#5ed3c6] sm:text-[14px]"
            >
              <Lock className="h-4 w-4" strokeWidth={2} />
              <span className="whitespace-nowrap">Client Access</span>
            </a>
            <span className="h-4 w-px bg-white/25" aria-hidden="true" />
            <a
              href="https://www.keyweb.ca"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[13px] font-medium transition-colors hover:text-[#5ed3c6] sm:text-[14px]"
            >
              <UserRound className="h-4 w-4" strokeWidth={2} />
              <span className="whitespace-nowrap">Advisor Access</span>
            </a>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-black/10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" aria-label="Keybase Financial Group home" className="flex items-center">
          <Image
            src="/keybase-logo-nobg.png"
            alt="Keybase Financial Group"
            width={553}
            height={126}
            priority
            className="h-8 w-auto"
          />
        </Link>

        {/* Primary nav */}
        <nav className="hidden items-center gap-8 lg:flex">
          {NAV.map((item) =>
            item.mega ? (
              <div
                key={item.label}
                className="static"
                onMouseEnter={() => openMenuNow(item.label)}
                onMouseLeave={closeMenuSoon}
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
                  <div className="absolute left-0 right-0 top-full pt-3">
                    <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
                      <div className="rounded-md border border-black/10 bg-white p-8 shadow-lg shadow-black/5">
                        <div className="grid grid-cols-3 gap-8">
                          {item.mega.map((col) => (
                            <div key={col.title}>
                              <p className="text-[15px] font-semibold text-[#006d6e]">
                                {col.title}
                              </p>
                              <div className="mt-4 space-y-4">
                                {col.groups.map((group, gi) => (
                                  <div key={gi}>
                                    {group.heading && (
                                      <p className="mb-2 text-[13px] font-bold text-[#1a2433]">
                                        {group.heading}
                                      </p>
                                    )}
                                    <div className="space-y-2">
                                      {group.links.map((link) => (
                                        <Link
                                          key={link.label}
                                          href={link.href}
                                          onClick={() => setOpenMenu(null)}
                                          className="block text-[14px] leading-snug text-[#5b6573] transition-colors hover:text-[#006d6e]"
                                        >
                                          {link.label}
                                        </Link>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : item.children ? (
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
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
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
                href={item.href!}
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
            href="/contact"
            className="border border-[#1a2433] bg-[#1a2433] px-5 py-2.5 text-[14px] font-semibold tracking-wide text-white transition-colors hover:bg-white hover:text-[#1a2433]"
          >
            Contact Us
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
            {NAV.map((item) =>
              item.mega ? (
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
                    <div className="border-b border-black/5 bg-[#f7f9fa] py-2">
                      {item.mega.map((col) => (
                        <div key={col.title} className="px-4 py-2">
                          <p className="text-[14px] font-semibold text-[#006d6e]">
                            {col.title}
                          </p>
                          {col.groups.map((group, gi) => (
                            <div key={gi} className="mt-1">
                              {group.heading && (
                                <p className="mt-1 text-[12px] font-bold text-[#1a2433]">
                                  {group.heading}
                                </p>
                              )}
                              {group.links.map((link) => (
                                <Link
                                  key={link.label}
                                  href={link.href}
                                  onClick={() => {
                                    setOpen(false);
                                    setOpenMobileMenu(null);
                                  }}
                                  className="block py-1.5 pl-2 text-[14px] leading-snug text-[#5b6573]"
                                >
                                  {link.label}
                                </Link>
                              ))}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : item.children ? (
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
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
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
                  href={item.href!}
                  onClick={() => setOpen(false)}
                  className="border-b border-black/5 py-3 text-[15px] font-medium text-[#1a2433]"
                >
                  {item.label}
                </Link>
              )
            )}
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="mt-4 border border-[#1a2433] bg-[#1a2433] px-5 py-3 text-center text-[14px] font-semibold tracking-wide text-white transition-colors hover:bg-white hover:text-[#1a2433]"
            >
              Contact Us
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
