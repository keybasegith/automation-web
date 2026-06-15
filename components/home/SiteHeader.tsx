"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Menu, X } from "lucide-react";

const NAV = [
  { label: "About Us", href: "#what-we-do" },
  { label: "Our Team", href: "#advisors" },
  { label: "Our Services", href: "#what-we-do" },
  { label: "Newsroom", href: "#insights" },
  { label: "Careers", href: "#careers" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

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
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[15px] font-medium text-[#1a2433] transition-colors hover:text-[#006d6e]"
            >
              {item.label}
            </Link>
          ))}
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
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-black/5 py-3 text-[15px] font-medium text-[#1a2433]"
              >
                {item.label}
              </Link>
            ))}
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
