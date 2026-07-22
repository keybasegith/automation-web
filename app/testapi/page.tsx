"use client";

import { useState } from "react";

type Row = {
  employee_id: number;
  first: string;
  last: string;
  title: string;
  location_id: number;
  ho_rep: string | null;
};

type ApiSuccess = {
  ok: true;
  count: number;
  query: { employeeId: string; locationId: string };
  rows: Row[];
};

type ApiError = { error: string; status?: number };

export default function TestApiPage() {
  const [employeeId, setEmployeeId] = useState("10");
  const [locationId, setLocationId] = useState("1");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ranQuery, setRanQuery] = useState<{ e: string; l: string } | null>(
    null,
  );

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRows(null);

    try {
      const res = await fetch("/api/testapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, locationId }),
      });
      const data: ApiSuccess | ApiError = await res.json();

      if (!res.ok || "error" in data) {
        setError(
          ("error" in data && data.error) || `Request failed (${res.status}).`,
        );
        return;
      }

      setRows(data.rows);
      setRanQuery({ e: data.query.employeeId, l: data.query.locationId });
    } catch {
      setError("Network error — could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <header className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--brand)]">
            Keyweb · Employee Directory API
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Employee Lookup
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--muted)]">
            Search the directory by employee ID and location. Requests are
            proxied server-side through{" "}
            <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[13px]">
              /api/testapi
            </code>{" "}
            so the API key stays on the server.
          </p>
        </header>

        <form
          onSubmit={search}
          className="rounded-2xl border border-black/5 bg-[var(--surface)] p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Employee ID{" "}
                <span className="font-normal normal-case">(parameter 1)</span>
              </span>
              <input
                value={employeeId}
                onChange={(ev) => setEmployeeId(ev.target.value)}
                inputMode="numeric"
                placeholder="e.g. 10"
                className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[15px] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
              />
            </label>

            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Location ID{" "}
                <span className="font-normal normal-case">(parameter 2)</span>
              </span>
              <input
                value={locationId}
                onChange={(ev) => setLocationId(ev.target.value)}
                inputMode="numeric"
                placeholder="e.g. 1"
                className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[15px] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[var(--brand)] px-6 py-2.5 text-[15px] font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
        </form>

        <div className="mt-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {rows && !error && (
            <>
              <p className="mb-3 text-sm text-[var(--muted)]">
                {rows.length} result{rows.length === 1 ? "" : "s"}
                {ranQuery && (
                  <>
                    {" "}
                    for P=<b className="text-[var(--foreground)]">{ranQuery.e}</b>
                    , L=<b className="text-[var(--foreground)]">{ranQuery.l}</b>
                  </>
                )}
              </p>

              {rows.length === 0 ? (
                <div className="rounded-xl border border-black/5 bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--muted)]">
                  No employees matched this query.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-black/5 bg-[var(--surface)] shadow-sm">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-black/5 text-xs uppercase tracking-wide text-[var(--muted)]">
                        <th className="px-4 py-3 font-semibold">ID</th>
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Title</th>
                        <th className="px-4 py-3 font-semibold">Loc.</th>
                        <th className="px-4 py-3 font-semibold">HO Rep</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr
                          key={r.employee_id}
                          className="border-b border-black/5 last:border-0 hover:bg-black/[0.02]"
                        >
                          <td className="px-4 py-3 font-mono tabular-nums text-[var(--muted)]">
                            {r.employee_id}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {r.first} {r.last}
                          </td>
                          <td className="px-4 py-3 text-[var(--muted)]">
                            {r.title}
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {r.location_id}
                          </td>
                          <td className="px-4 py-3">
                            {r.ho_rep ? (
                              <span className="rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--brand)]">
                                {r.ho_rep}
                              </span>
                            ) : (
                              <span className="text-[var(--muted)]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {!rows && !error && !loading && (
            <p className="text-sm text-[var(--muted)]">
              Enter an employee ID and location, then press Search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
