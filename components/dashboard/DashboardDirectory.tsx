"use client";

import { useId, useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { DepartmentCard } from "@/components/dashboard/DepartmentCard";
import { ToolCard } from "@/components/workspace/ToolCard";
import { SHARED_TOOLS, searchDirectory } from "@/lib/workspace-nav";

/**
 * The dashboard's department and tool directory. The search filters the
 * registry in lib/departments.ts — departments and tool cards only, not
 * client data.
 */
export function DashboardDirectory() {
  const [query, setQuery] = useState("");
  const inputId = useId();
  const { departments, tools } = useMemo(() => searchDirectory(query), [query]);
  const searching = query.trim() !== "";
  const nothingFound = searching && departments.length === 0 && tools.length === 0;

  return (
    <div>
      <div className="relative mb-8 max-w-md">
        <label htmlFor={inputId} className="sr-only">
          Search departments and tools
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search departments and tools…"
          autoComplete="off"
          className="h-10 w-full rounded-xl border border-[var(--hairline-strong)] bg-white pl-10 pr-9 text-[14px] text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-search-cancel-button]:hidden"
        />
        {searching && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-900/[0.04] hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {searching
          ? `${departments.length} departments and ${tools.length} tools match`
          : ""}
      </p>

      {nothingFound && (
        <div className="rounded-2xl border border-dashed border-[var(--hairline-strong)] bg-white/60 px-6 py-10 text-center">
          <p className="text-[14px] font-medium text-slate-700">
            Nothing matches “{query.trim()}”
          </p>
          <p className="mt-1 text-[13px] text-slate-500">
            Try a tool name, a task like “settlement”, or a department.
          </p>
        </div>
      )}

      {departments.length > 0 && (
        <section className="mb-10" aria-label="Departments">
          <h2 className="mb-4 text-[15px] font-semibold tracking-tight text-slate-900">
            Departments
            {searching && (
              <span className="ml-2 font-normal text-slate-400">
                {departments.length}
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {departments.map((dept) => (
              <DepartmentCard key={dept.slug} department={dept} />
            ))}
          </div>
        </section>
      )}

      {searching && tools.length > 0 && (
        <section className="mb-10" aria-label="Matching tools">
          <h2 className="mb-4 text-[15px] font-semibold tracking-tight text-slate-900">
            Tools
            <span className="ml-2 font-normal text-slate-400">{tools.length}</span>
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard
                key={`${tool.departmentSlug}:${tool.id}`}
                label={tool.label}
                hint={tool.hint}
                href={tool.href}
                icon={tool.icon}
                caption={tool.departmentName}
              />
            ))}
          </div>
        </section>
      )}

      {!searching && (
        <section aria-label="Shared tools">
          <h2 className="mb-1 text-[15px] font-semibold tracking-tight text-slate-900">
            Shared tools
          </h2>
          <p className="mb-4 text-[13px] text-slate-500">
            Used by more than one department — the same tool wherever you open it
            from.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SHARED_TOOLS.map((tool) => (
              <ToolCard
                key={tool.href}
                label={tool.label}
                hint={tool.hint}
                href={tool.href}
                icon={tool.icon}
                caption={tool.departments.join(" · ")}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
