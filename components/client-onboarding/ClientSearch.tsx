/**
 * Client search for the Clients page. A plain GET form, so a search is a URL
 * an advisor can bookmark or share, and works without JavaScript.
 */

import Link from "next/link";
import { Building2, Search } from "lucide-react";

import type { ClientSearchResult } from "@/lib/client-onboarding/repo";

export function ClientSearchBox({ query }: { query: string }) {
  return (
    <form action="/dashboard/clients" method="get" role="search" className="mb-5 flex gap-2">
      <label className="relative flex-1">
        <span className="sr-only">Search clients</span>
        <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search by name, Client ID, email or phone"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/15"
        />
      </label>
      <button type="submit" className="h-11 rounded-xl bg-brand px-5 text-sm font-medium text-white hover:bg-brand-hover">
        Search
      </button>
      {query && (
        <Link href="/dashboard/clients" className="inline-flex h-11 items-center rounded-xl px-3 text-sm text-slate-500 hover:text-slate-900">
          Clear
        </Link>
      )}
    </form>
  );
}

export function ClientSearchResults({ query, results }: { query: string; results: ClientSearchResult[] }) {
  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center text-sm text-slate-600">
        No clients match “{query}”.
      </div>
    );
  }
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <p className="border-b border-slate-100 px-6 py-3 text-xs text-slate-500">
        {results.length} {results.length === 1 ? "client matches" : "clients match"} “{query}”
      </p>
      <ul className="divide-y divide-slate-100">
        {results.map((c) => (
          <li key={c.id}>
            <Link href={`/dashboard/clients/${c.id}`} className="flex items-center gap-4 px-6 py-3.5 transition hover:bg-slate-50">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 font-medium text-slate-900">
                  {c.name}
                  {c.isEntity && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      <Building2 aria-hidden className="h-3 w-3" /> Entity
                    </span>
                  )}
                </span>
                <span className="truncate text-xs text-slate-500">{[c.email, c.phone].filter(Boolean).join(" · ") || "No contact details"}</span>
              </span>
              <span className="text-xs tabular-nums text-slate-500">{c.keybaseClientId ? `Client ID ${c.keybaseClientId}` : ""}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
