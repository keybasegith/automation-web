"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

/**
 * The two-level tab bar for /services/[slug] — categories on top, the services
 * of the active category beneath. Rendered from the layout, so switching tabs
 * only swaps the body below: no reload, and the bar keeps its place.
 *
 * Styling is deliberately quiet — text and a single underline rule, no pills or
 * boxes — so the tabs read as navigation rather than buttons.
 *
 * Below `lg` the same 19 links would wrap into five ragged rows, so mobile gets
 * a disclosure instead: one line naming the current service, expanding to the
 * full list grouped by category.
 */

export type TabItem = { slug: string; label: string; category: string };

export default function ServicesTabs({ items }: { items: TabItem[] }) {
  const pathname = usePathname();

  // Remembering *where* the panel was opened means picking a service collapses
  // it for free — the route changes, so this no longer matches.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;

  const activeSlug = pathname.split("/")[2] ?? "";
  const active = items.find((i) => i.slug === activeSlug) ?? items[0];
  const category = active?.category ?? "";

  const categories: string[] = [];
  for (const i of items) if (!categories.includes(i.category)) categories.push(i.category);

  /* top-[69px] parks the bar directly under the sticky site header (h-68 + 1px border). */
  return (
    <div className="sticky top-[69px] z-30 border-b border-black/10 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        {/* ---------- Desktop: two rows of underline tabs ---------- */}
        <div className="hidden lg:block">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-2 border-b border-black/5">
            {categories.map((c) => {
              // Selecting a category lands on its first service.
              const first = items.find((i) => i.category === c);
              if (!first) return null;
              const isActive = c === category;
              return (
                <Link
                  key={c}
                  href={`/services/${first.slug}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`-mb-px border-b-2 py-4 text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                    isActive
                      ? "border-[#0a1f33] text-[#0a1f33]"
                      : "border-transparent text-[#8a93a0] hover:text-[#0a1f33]"
                  }`}
                >
                  {c}
                </Link>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-1 py-3">
            {items
              .filter((i) => i.category === category)
              .map((i) => {
                const isActive = i.slug === active?.slug;
                return (
                  <Link
                    key={i.slug}
                    href={`/services/${i.slug}`}
                    aria-current={isActive ? "page" : undefined}
                    className={`text-[15px] transition-colors ${
                      isActive
                        ? "font-semibold text-[#006d6e]"
                        : "text-[#5b6573] hover:text-[#0a1f33]"
                    }`}
                  >
                    {i.label}
                  </Link>
                );
              })}
          </div>
        </div>

        {/* ---------- Mobile: current service, expanding to the full list ---------- */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setOpenedAt(open ? null : pathname)}
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-4 py-3 text-left"
          >
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a93a0]">
                {category}
              </span>
              <span className="block truncate text-[16px] font-semibold text-[#0a1f33]">
                {active?.label}
              </span>
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-[#5b6573] transition-transform ${
                open ? "rotate-180" : ""
              }`}
              strokeWidth={2}
            />
          </button>

          {open && (
            <div className="max-h-[60vh] overflow-y-auto border-t border-black/5 pb-4">
              {categories.map((c) => (
                <div key={c} className="pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a93a0]">
                    {c}
                  </p>
                  <div className="mt-1">
                    {items
                      .filter((i) => i.category === c)
                      .map((i) => {
                        const isActive = i.slug === active?.slug;
                        return (
                          <Link
                            key={i.slug}
                            href={`/services/${i.slug}`}
                            aria-current={isActive ? "page" : undefined}
                            className={`block py-2 text-[15px] ${
                              isActive
                                ? "font-semibold text-[#006d6e]"
                                : "text-[#5b6573]"
                            }`}
                          >
                            {i.label}
                          </Link>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
