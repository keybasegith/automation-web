"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import AdvisorGrid from "./AdvisorGrid";
import {
  filterAdvisors,
  type AdvisorFilters,
  type Facet,
} from "@/lib/people/advisors";
import type { PersonProfile } from "@/lib/people/types";

/**
 * Search and filtering for the advisor directory.
 *
 * The only interactive part of the page, and it is mounted only when the data
 * justifies it — `directoryControls` in lib/people/advisors.ts decides, and the
 * page renders the plain grid instead when the answer is no. Which is the case
 * today: seven advisors, all in one office, none with language data.
 *
 * Filtering is local. The advisor list is small, static, and already on the
 * page, so there is nothing to fetch and no search service to add. Filter state
 * deliberately does not go into the URL: `?province=ON&language=…` would turn
 * every combination of controls into another crawlable page, which is exactly
 * the programmatic sprawl the directory is meant to avoid.
 *
 * Cards render server-side on the first pass regardless — this component is
 * server-rendered like any other, so the advisors are in the initial HTML and
 * only the filtering waits on JavaScript.
 */
export default function AdvisorSearch({
  advisors,
  facets,
  showSearch,
}: {
  advisors: PersonProfile[];
  facets: Facet[];
  showSearch: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, string>>({});

  const filters: AdvisorFilters = useMemo(
    () => ({
      query,
      language: selected.language,
      province: selected.province,
      expertise: selected.expertise,
    }),
    [query, selected],
  );

  const results = useMemo(
    () => filterAdvisors(advisors, filters),
    [advisors, filters],
  );

  const hasFilters = Boolean(query.trim()) || Object.values(selected).some(Boolean);

  const clear = () => {
    setQuery("");
    setSelected({});
  };

  const controlClass =
    "w-full border border-black/15 bg-white px-4 py-3 text-[15px] text-[#1a2433] outline-none transition-colors placeholder:text-[#9aa3ad] focus:border-[#0a1f33]";

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {showSearch && (
          <div className="relative sm:col-span-2">
            <label htmlFor="advisor-search" className="sr-only">
              Search advisors by name
            </label>
            <Search
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa3ad]"
              strokeWidth={1.75}
            />
            <input
              id="advisor-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name"
              className={`${controlClass} pl-11`}
            />
          </div>
        )}

        {facets.map((facet) => (
          <div key={facet.key}>
            <label htmlFor={`advisor-${facet.key}`} className="sr-only">
              {facet.label}
            </label>
            {/* A native select: labelled, keyboard-operable, and correct on
                mobile without a custom listbox to get wrong. */}
            <select
              id={`advisor-${facet.key}`}
              value={selected[facet.key] ?? ""}
              onChange={(event) =>
                setSelected((current) => ({
                  ...current,
                  [facet.key]: event.target.value,
                }))
              }
              className={controlClass}
            >
              <option value="">{`Any ${facet.label.toLowerCase()}`}</option>
              {facet.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value} ({option.count})
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <p aria-live="polite" className="mt-6 text-[14px] text-[#7a828d]">
        {results.length === advisors.length
          ? `${advisors.length} advisors`
          : `${results.length} of ${advisors.length} advisors`}
      </p>

      <div className="mt-6">
        {results.length > 0 ? (
          <AdvisorGrid advisors={results} />
        ) : (
          <div className="border border-black/10 bg-[#f7f9fa] px-6 py-10 text-center">
            <p className="text-[16px] text-[#0a1f33]">
              No advisors match those filters.
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-[#5b6573]">
              Try removing a filter, or{" "}
              <a
                href="/contact"
                className="font-semibold text-[#006d6e] underline decoration-[#006d6e]/30 underline-offset-4 hover:text-[#0a1f33]"
              >
                contact us
              </a>{" "}
              and we will help you find the right advisor.
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clear}
                className="mt-5 border border-[#0a1f33] px-5 py-2.5 text-[14px] font-semibold text-[#0a1f33] transition-colors hover:bg-[#0a1f33] hover:text-white"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
