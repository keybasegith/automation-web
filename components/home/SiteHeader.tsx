"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Menu, X, ChevronDown } from "lucide-react";

type NavItem = {
  label: string;
  href?: string;
  children?: { label: string; href: string }[];
};

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
  { label: "Our Services", href: "/#what-we-do" },
  { label: "Newsroom", href: "/#insights" },
  { label: "Careers", href: "/#careers" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openMobileMenu, setOpenMobileMenu] = useState<string | null>(null);

  return (
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
            item.children ? (
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
          <button
            type="button"
            aria-label="Search"
            className="text-[#1a2433] transition-colors hover:text-[#006d6e]"
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
          <Link
            href="/contact"
            className="border border-[#1a2433] px-5 py-2.5 text-[14px] font-semibold tracking-wide text-[#1a2433] transition-colors hover:bg-[#1a2433] hover:text-white"
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
              item.children ? (
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
              className="mt-4 border border-[#1a2433] px-5 py-3 text-center text-[14px] font-semibold tracking-wide text-[#1a2433]"
            >
              Contact Us
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
