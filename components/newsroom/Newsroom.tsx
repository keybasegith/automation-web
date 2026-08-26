"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import type { NewsroomCard } from "@/lib/insights/listing";

/**
 * A card's artwork. An article with its own image shows it; one without falls
 * back to the lettered wordmark panel rather than a broken or borrowed photo.
 */
function ArticleImage({ card }: { card: NewsroomCard }) {
  // Its own aspect on mobile — a fixed pixel height would crop an illustration
  // through the middle on a narrow screen. Beside the text on desktop, it
  // stretches to whatever height the copy sets.
  const frame =
    "relative aspect-[16/10] w-full overflow-hidden lg:aspect-auto lg:h-full lg:min-h-[220px] lg:rounded-xl";

  if (card.image) {
    return (
      <div className={frame}>
        <Image
          src={card.image.src}
          alt={card.image.alt}
          fill
          sizes="(min-width: 1024px) 320px, 100vw"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${frame} flex items-center justify-center`}
      style={{
        background:
          "linear-gradient(135deg, #0a1f33 0%, #0e2a45 55%, #0a3d3e 130%)",
      }}
      aria-hidden
    >
      <span className="select-none text-[140px] font-bold leading-none text-white/[0.06]">
        K
      </span>
      {/* Only the placeholder names the category — over real artwork it would
          just repeat the eyebrow sitting directly above it. */}
      <span className="absolute bottom-4 left-5 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/70">
        {card.category}
      </span>
    </div>
  );
}

export default function Newsroom({ articles }: { articles: NewsroomCard[] }) {
  const [active, setActive] = useState("All");
  const [query, setQuery] = useState("");

  // Categories are derived from the articles so new ones appear automatically.
  const CATEGORIES = ["All", ...Array.from(new Set(articles.map((a) => a.category)))];

  const q = query.trim().toLowerCase();
  const filtered = articles.filter((a) => {
    const matchCat = active === "All" || a.category === active;
    const matchQ =
      !q ||
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  return (
    <div>
      {/* Category filters */}
      <div className="flex flex-wrap gap-3">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActive(c)}
            className={`rounded-full px-5 py-2 text-[14px] font-semibold transition-colors ${
              active === c
                ? "bg-[#0a1f33] text-white"
                : "border border-black/15 text-[#1a2433] hover:border-[#0a1f33] hover:text-[#0a1f33]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Search */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="relative w-full sm:max-w-xl sm:flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9aa3ad]"
            strokeWidth={2}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the Newsroom"
            className="w-full rounded-md border border-black/15 py-3 pl-12 pr-4 text-[15px] text-[#1a2433] outline-none transition-colors placeholder:text-[#9aa3ad] focus:border-[#0a1f33]"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-[#0a1f33] px-7 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#0e2a45] sm:w-auto"
        >
          Search
        </button>
      </form>

      {/* Article list */}
      <div className="mt-12 space-y-6">
        {filtered.map((a) => (
          <article
            key={a.id}
            className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 transition-shadow hover:shadow-[0_24px_60px_-32px_rgba(10,31,51,0.35)] lg:flex-row lg:items-stretch lg:gap-10 lg:p-8"
          >
            {/* Artwork first in the DOM so it leads on a phone; `lg:order-last`
                puts it back on the right beside the copy on a wide screen. */}
            <div className="w-full lg:order-last lg:w-[320px] lg:flex-shrink-0">
              <ArticleImage card={a} />
            </div>

            <div className="flex flex-1 flex-col p-6 sm:p-8 lg:p-0">
              <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#006d6e]">
                {a.category}
                {a.external && a.externalPublisher && (
                  <span className="ml-2 font-normal normal-case tracking-normal text-[#9aa3ad]">
                    via {a.externalPublisher}
                  </span>
                )}
              </p>
              <h2 className="mt-3 font-serif text-[26px] font-normal leading-[1.12] tracking-tight text-[#0a1f33] sm:text-[30px]">
                {/* A real anchor, not a click handler — an item with a page is
                    reachable and crawlable whether or not JavaScript runs. Items
                    with no article behind them stay plain text rather than
                    linking somewhere that does not exist. */}
                {a.href ? (
                  a.external ? (
                    <a
                      href={a.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-start gap-1.5 transition-colors hover:text-[#006d6e]"
                    >
                      {a.title}
                      <ArrowUpRight className="mt-2 h-5 w-5 flex-shrink-0" aria-hidden />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ) : (
                    <Link href={a.href} className="transition-colors hover:text-[#006d6e]">
                      {a.title}
                    </Link>
                  )
                ) : (
                  a.title
                )}
              </h2>
              <p className="mt-4 flex-1 text-[16px] leading-relaxed text-[#5b6573]">
                {a.excerpt}
              </p>
              <p className="mt-6 text-[14px] text-[#9aa3ad]">
                {a.dateTime ? (
                  <time dateTime={a.dateTime}>{a.dateLabel}</time>
                ) : (
                  a.dateLabel
                )}
                {a.author && ` · ${a.author}`}
              </p>
            </div>
          </article>
        ))}

        {filtered.length === 0 && (
          <p className="py-16 text-center text-[16px] text-[#5b6573]">
            No articles match your search. Try a different category or keyword.
          </p>
        )}
      </div>
    </div>
  );
}
