"use client";

import { useState } from "react";
import { Search } from "lucide-react";

type Article = {
  category: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
};

const CATEGORIES = [
  "All",
  "Markets",
  "Retirement",
  "Investing",
  "Tax & Estate",
  "Insurance",
  "Firm News",
];

const ARTICLES: Article[] = [
  {
    category: "Markets",
    title: "Positioning Portfolios for a Higher-for-Longer Rate Environment",
    excerpt:
      "What persistent rates mean for fixed income, equities, and the disciplined, goals-based portfolios we build for clients.",
    date: "2026.06.22",
    author: "Keybase Research",
  },
  {
    category: "Retirement",
    title: "Building Durable Income That Outlasts a 30-Year Retirement",
    excerpt:
      "A framework for turning a lifetime of savings into reliable, tax-efficient income that lasts through every market cycle.",
    date: "2026.06.15",
    author: "Keybase Planning Desk",
  },
  {
    category: "Tax & Estate",
    title: "Five Estate Strategies High-Net-Worth Families Should Revisit This Year",
    excerpt:
      "From intergenerational transfers to trust structures, the planning moves worth reviewing before year-end.",
    date: "2026.06.08",
    author: "Keybase Research",
  },
  {
    category: "Insurance",
    title: "How the Right Coverage Protects What You've Worked to Build",
    excerpt:
      "Why integrated protection — life, disability, and critical illness — belongs at the center of a complete financial plan.",
    date: "2026.05.30",
    author: "Keybase Planning Desk",
  },
  {
    category: "Investing",
    title: "The Case for Discipline When Markets Get Loud",
    excerpt:
      "Headlines move fast; sound plans don't. How an independent, research-driven process keeps clients on course.",
    date: "2026.05.21",
    author: "Keybase Research",
  },
  {
    category: "Firm News",
    title: "Keybase Expands Its Advisory Team Across Canada",
    excerpt:
      "New advisors and specialists join the firm as Keybase continues to grow its independent national platform.",
    date: "2026.05.12",
    author: "Keybase Financial Group",
  },
  {
    category: "Markets",
    title: "What Independent Advice Means in a Volatile Year",
    excerpt:
      "Free from product quotas and competing incentives, independence lets us focus on a single question: what is right for you.",
    date: "2026.05.04",
    author: "Keybase Research",
  },
];

function ArticleImage({ category }: { category: string }) {
  return (
    <div
      className="relative flex h-[200px] w-full items-center justify-center overflow-hidden rounded-xl sm:h-full sm:min-h-[200px] lg:w-[320px]"
      style={{
        background:
          "linear-gradient(135deg, #0a1f33 0%, #0e2a45 55%, #0a3d3e 130%)",
      }}
      aria-hidden
    >
      <span className="select-none text-[140px] font-bold leading-none text-white/[0.06]">
        K
      </span>
      <span className="absolute bottom-4 left-5 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/70">
        {category}
      </span>
    </div>
  );
}

export default function Newsroom() {
  const [active, setActive] = useState("All");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = ARTICLES.filter((a) => {
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
        className="mt-6 flex flex-wrap items-center gap-3"
      >
        <div className="relative w-full max-w-xl flex-1">
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
          className="rounded-md bg-[#0a1f33] px-7 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#0e2a45]"
        >
          Search
        </button>
      </form>

      {/* Article list */}
      <div className="mt-12 space-y-6">
        {filtered.map((a) => (
          <article
            key={a.title}
            className="group flex flex-col gap-6 rounded-2xl border border-black/10 p-6 transition-shadow hover:shadow-[0_24px_60px_-32px_rgba(10,31,51,0.35)] sm:p-8 lg:flex-row lg:items-stretch lg:gap-10"
          >
            <div className="flex flex-1 flex-col">
              <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#006d6e]">
                {a.category}
              </p>
              <h2 className="mt-3 font-serif text-[26px] font-normal leading-[1.12] tracking-tight text-[#0a1f33] sm:text-[30px]">
                {a.title}
              </h2>
              <p className="mt-4 flex-1 text-[16px] leading-relaxed text-[#5b6573]">
                {a.excerpt}
              </p>
              <p className="mt-6 text-[14px] text-[#9aa3ad]">
                {a.date} · {a.author}
              </p>
            </div>
            <div className="lg:w-[320px] lg:flex-shrink-0">
              <ArticleImage category={a.category} />
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
