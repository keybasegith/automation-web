"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface ParsedRow {
  rowNumber: number;
  name: string;
  email: string;
  riskTolerance: string;
  portfolioValue: string;
  errors: string[];
}

const RISKS = ["Low", "Medium", "High"] as const;
const isEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

// Tiny CSV parser that handles quoted fields with commas + escaped quotes.
const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      current.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      current.push(cell);
      cell = "";
      if (current.length > 1 || current[0] !== "") rows.push(current);
      current = [];
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || current.length > 0) {
    current.push(cell);
    rows.push(current);
  }
  return rows;
};

const HEADER_ALIASES: Record<string, keyof ParsedRow | "skip"> = {
  name: "name",
  client_name: "name",
  clientname: "name",
  email: "email",
  client_email: "email",
  risk: "riskTolerance",
  risk_tolerance: "riskTolerance",
  risktolerance: "riskTolerance",
  portfolio: "portfolioValue",
  portfolio_value: "portfolioValue",
  portfoliovalue: "portfolioValue",
  aum: "portfolioValue",
};

const SAMPLE_CSV = `name,email,riskTolerance,portfolioValue
Jane Doe,jane@example.com,Medium,750000
Robert Smith,robert@example.com,Low,1500000
Aisha Khan,aisha@example.com,High,420000`;

export default function ImportClientsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ inserted: number } | null>(null);

  const validRows = useMemo(() => rows.filter((r) => r.errors.length === 0), [rows]);
  const errorRows = useMemo(() => rows.filter((r) => r.errors.length > 0), [rows]);

  const handleFile = async (file: File) => {
    setServerError(null);
    setSuccess(null);
    setFileName(file.name);
    const text = await file.text();
    parseAndValidate(text);
  };

  const parseAndValidate = (text: string) => {
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      setRows([]);
      setServerError("CSV must contain a header row and at least one data row.");
      return;
    }

    const header = parsed[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const colIdx: Partial<Record<keyof ParsedRow, number>> = {};
    header.forEach((h, idx) => {
      const target = HEADER_ALIASES[h];
      if (target && target !== "skip") {
        colIdx[target] = idx;
      }
    });

    const missing: string[] = [];
    if (colIdx.name === undefined) missing.push("name");
    if (colIdx.email === undefined) missing.push("email");
    if (colIdx.riskTolerance === undefined) missing.push("riskTolerance");
    if (colIdx.portfolioValue === undefined) missing.push("portfolioValue");
    if (missing.length > 0) {
      setRows([]);
      setServerError(
        `CSV is missing required column(s): ${missing.join(", ")}. Required headers: name, email, riskTolerance, portfolioValue.`
      );
      return;
    }

    const dataRows = parsed.slice(1);
    const validated: ParsedRow[] = dataRows.map((cells, idx) => {
      const name = (cells[colIdx.name!] ?? "").trim();
      const email = (cells[colIdx.email!] ?? "").trim();
      const risk = (cells[colIdx.riskTolerance!] ?? "").trim();
      const portfolio = (cells[colIdx.portfolioValue!] ?? "").trim();

      const errors: string[] = [];
      if (!name) errors.push("name is required");
      if (!email || !isEmail(email)) errors.push("email is missing or invalid");
      if (!(RISKS as readonly string[]).includes(risk)) {
        errors.push(`riskTolerance must be Low, Medium, or High`);
      }
      const portfolioNum = Number(portfolio.replace(/[$,\s]/g, ""));
      if (!Number.isFinite(portfolioNum) || portfolioNum < 0) {
        errors.push("portfolioValue must be a non-negative number");
      }

      return {
        rowNumber: idx + 2, // +1 for 0-index, +1 for header row
        name,
        email,
        riskTolerance: risk,
        portfolioValue: Number.isFinite(portfolioNum)
          ? String(portfolioNum)
          : portfolio,
        errors,
      };
    });

    setRows(validated);
  };

  const handleConfirm = async () => {
    if (validRows.length === 0 || submitting) return;
    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: validRows.map((r) => ({
            name: r.name,
            email: r.email,
            riskTolerance: r.riskTolerance,
            portfolioValue: Number(r.portfolioValue),
          })),
        }),
      });
      const data = (await res.json()) as
        | { inserted: number }
        | { error: string };
      if (!res.ok || "error" in data) {
        setServerError("error" in data ? data.error : `Failed (${res.status})`);
        return;
      }
      setSuccess({ inserted: data.inserted });
      setRows([]);
      setFileName(null);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/clients"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-900"
      >
        <span aria-hidden>←</span> Back to Clients
      </Link>

      <header className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Bulk add
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Import Clients from CSV
        </h2>
        <p className="text-sm text-slate-500">
          Upload a spreadsheet exported from your CRM. Existing clients (matched
          by email) will be updated; new ones will be added.
        </p>
      </header>

      {success && (
        <div
          role="status"
          className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          ✓ Imported {success.inserted} client
          {success.inserted === 1 ? "" : "s"} successfully.{" "}
          <Link
            href="/dashboard/clients"
            className="font-medium underline"
          >
            View clients →
          </Link>
        </div>
      )}

      {serverError && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">1. Upload file</h3>
        <p className="mt-1 text-xs text-slate-500">
          Required columns:{" "}
          <code className="font-mono text-slate-700">name</code>,{" "}
          <code className="font-mono text-slate-700">email</code>,{" "}
          <code className="font-mono text-slate-700">riskTolerance</code>,{" "}
          <code className="font-mono text-slate-700">portfolioValue</code>. Max
          1,000 rows per import.
        </p>

        <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-sm text-slate-600 transition hover:border-brand/40 hover:bg-slate-50">
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <span className="font-medium">
            {fileName ? `📄 ${fileName}` : "Click to choose a CSV file"}
          </span>
        </label>

        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-brand transition hover:text-brand-hover">
            Show sample format
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-700">
            {SAMPLE_CSV}
          </pre>
        </details>
      </section>

      {rows.length > 0 && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-6 py-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                2. Preview
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {validRows.length} valid · {errorRows.length} with errors
              </p>
            </div>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={validRows.length === 0 || submitting}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Importing…"
                : `Import ${validRows.length} client${validRows.length === 1 ? "" : "s"}`}
            </button>
          </header>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3">Row</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Risk</th>
                  <th className="px-6 py-3 text-right">Portfolio</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr
                    key={row.rowNumber}
                    className={
                      row.errors.length > 0 ? "bg-red-50/30" : "text-slate-700"
                    }
                  >
                    <td className="px-6 py-3 font-mono text-xs text-slate-500">
                      {row.rowNumber}
                    </td>
                    <td className="px-6 py-3 text-slate-900">{row.name}</td>
                    <td className="px-6 py-3 text-xs text-slate-600">
                      {row.email}
                    </td>
                    <td className="px-6 py-3 text-xs">{row.riskTolerance}</td>
                    <td className="px-6 py-3 text-right tabular-nums">
                      {row.portfolioValue}
                    </td>
                    <td className="px-6 py-3">
                      {row.errors.length === 0 ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          ✓ Ready
                        </span>
                      ) : (
                        <div className="flex flex-col gap-0.5 text-xs text-red-700">
                          {row.errors.map((e, i) => (
                            <span key={i}>• {e}</span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
