"use client";

import { useMemo, useRef, useState } from "react";

import type { MappingRuleDto } from "@/lib/financial-statements/api";
import type { MappingRule, MatchType } from "@/lib/financial-statements/types";
import { StatusPill } from "./ui";

/**
 * GL mapping management.
 *
 * A finance user picks a match type from a list and types account numbers. No
 * wildcard, no regular expression, no separator syntax appears anywhere on this
 * screen. Every save validates the whole table first, so a change that would
 * make an account ambiguous is refused with an explanation rather than accepted
 * and discovered later on a statement.
 */

const MATCH_TYPES: { value: MatchType; label: string; help: string }[] = [
  { value: "BASE_GL_CODE", label: "One GL account", help: "Claims that account and all of its sub-accounts. Example: 1000" },
  { value: "GL_CODE_SET", label: "Several GL accounts", help: "A list of account numbers. Example: 1000 1001 1008" },
  { value: "NUMERIC_RANGE", label: "A range of accounts", help: "Every account from one number to another, inclusive." },
  { value: "EXACT_FULL_CODE", label: "One exact account", help: "A single full account including its suffix. Example: 3100-K-I" },
];

const SECTIONS = [
  "Current assets", "Capital assets", "Goodwill",
  "Current Liabilities", "Long-term labilities", "Shareholders Equity",
  "Commission Income", "Commission Expense", "Fee & Other Income", "Operating Expense",
];

const emptyDraft = (): Partial<MappingRule> => ({
  id: "",
  statement: "balance_sheet",
  matchType: "BASE_GL_CODE",
  category: "Assets",
  section: "Current assets",
  statementLine: "",
  status: "active",
  excluded: false,
  source: "user",
});

export default function GlMappingManager({ initial }: { initial: MappingRuleDto[] }) {
  const [mappings, setMappings] = useState(initial);
  const [filter, setFilter] = useState("");
  const [draft, setDraft] = useState<Partial<MappingRule> | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return mappings;
    return mappings.filter(
      (m) =>
        m.rule.toLowerCase().includes(needle) ||
        m.statementLine.toLowerCase().includes(needle) ||
        m.section.toLowerCase().includes(needle) ||
        m.id.toLowerCase().includes(needle)
    );
  }, [mappings, filter]);

  async function reload() {
    const response = await fetch("/api/financial-statements/mappings");
    const body = await response.json();
    setMappings(body.mappings ?? []);
  }

  async function toggle(id: string, status: "active" | "inactive") {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/financial-statements/mappings/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "That change was refused.");
      await reload();
      setMessage({ tone: "ok", text: `Mapping ${id} is now ${status}.` });
    } catch (cause) {
      setMessage({ tone: "bad", text: cause instanceof Error ? cause.message : "That change was refused." });
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setMessage(null);

    const rule: Partial<MappingRule> = { ...draft };
    if (rule.matchType === "GL_CODE_SET" && typeof (rule as { accountsText?: string }).accountsText === "string") {
      rule.accounts = (rule as { accountsText?: string }).accountsText!.split(/[\s,;]+/).filter(Boolean);
    }
    delete (rule as { accountsText?: string }).accountsText;

    try {
      const response = await fetch("/api/financial-statements/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "That mapping was refused.");
      await reload();
      setDraft(null);
      setMessage({ tone: "ok", text: `Saved mapping ${rule.id}.` });
    } catch (cause) {
      setMessage({ tone: "bad", text: cause instanceof Error ? cause.message : "That mapping was refused." });
    } finally {
      setBusy(false);
    }
  }

  async function importCsv(file: File) {
    setBusy(true);
    setMessage(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch("/api/financial-statements/mappings/import", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "That file was refused.");
      setMappings(body.mappings ?? []);
      setMessage({ tone: "ok", text: `Imported ${body.mappings.length} mappings.` });
    } catch (cause) {
      setMessage({ tone: "bad", text: cause instanceof Error ? cause.message : "That file was refused." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter by account, line or section"
          className="w-80 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDraft(emptyDraft())}
            className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Add mapping
          </button>
          <a
            href="/api/financial-statements/mappings/export"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export CSV
          </a>
          <input
            ref={importRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importCsv(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => importRef.current?.click()}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Import CSV
          </button>
        </div>
      </div>

      {message ? (
        <p
          className={`mb-4 rounded-md border px-3 py-2 text-sm ${
            message.tone === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {draft ? (
        <MappingForm
          draft={draft}
          setDraft={setDraft}
          onSave={save}
          onCancel={() => setDraft(null)}
          busy={busy}
        />
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Account / Rule</th>
              <th className="px-4 py-2 font-medium">Statement</th>
              <th className="px-4 py-2 font-medium">Section</th>
              <th className="px-4 py-2 font-medium">Statement line</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((mapping) => (
              <tr key={mapping.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-mono text-xs text-slate-800">{mapping.rule}</td>
                <td className="px-4 py-2 text-slate-600">{mapping.statement}</td>
                <td className="px-4 py-2 text-slate-600">
                  {mapping.category} › {mapping.section}
                </td>
                <td className="px-4 py-2 text-slate-800">
                  {mapping.excluded ? (
                    <span className="text-slate-500" title={mapping.exclusionReason ?? undefined}>
                      Excluded
                    </span>
                  ) : (
                    mapping.statementLine
                  )}
                </td>
                <td className="px-4 py-2"><StatusPill status={mapping.status} /></td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggle(mapping.id, mapping.status === "active" ? "inactive" : "active")}
                    className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {mapping.status === "active" ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">Nothing matches that filter.</p>
        ) : null}
      </div>
    </div>
  );
}

function MappingForm({
  draft, setDraft, onSave, onCancel, busy,
}: {
  draft: Partial<MappingRule>;
  setDraft: (d: Partial<MappingRule>) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const set = (patch: Partial<MappingRule>) => setDraft({ ...draft, ...patch });
  const matchHelp = MATCH_TYPES.find((m) => m.value === draft.matchType)?.help ?? "";

  return (
    <div className="mb-5 rounded-lg border border-slate-300 bg-slate-50 p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">New or updated mapping</h3>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Reference">
          <input
            value={draft.id ?? ""}
            onChange={(e) => set({ id: e.target.value })}
            placeholder="cash-petty"
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </Field>

        <Field label="Statement">
          <select
            value={draft.statement}
            onChange={(e) => set({ statement: e.target.value as MappingRule["statement"] })}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="balance_sheet">Balance Sheet</option>
            <option value="income_statement">Income Statement</option>
          </select>
        </Field>

        <Field label="How it matches">
          <select
            value={draft.matchType}
            onChange={(e) => set({ matchType: e.target.value as MatchType })}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {MATCH_TYPES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </Field>

        {draft.matchType === "BASE_GL_CODE" ? (
          <Field label="GL account">
            <input
              value={draft.baseCode ?? ""}
              onChange={(e) => set({ baseCode: e.target.value })}
              placeholder="1000"
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </Field>
        ) : null}

        {draft.matchType === "EXACT_FULL_CODE" ? (
          <Field label="Exact account">
            <input
              value={draft.fullCode ?? ""}
              onChange={(e) => set({ fullCode: e.target.value.toUpperCase() })}
              placeholder="3100-K-I"
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </Field>
        ) : null}

        {draft.matchType === "GL_CODE_SET" ? (
          <Field label="GL accounts">
            <input
              value={(draft as { accountsText?: string }).accountsText ?? (draft.accounts ?? []).join(" ")}
              onChange={(e) => setDraft({ ...draft, accountsText: e.target.value } as Partial<MappingRule>)}
              placeholder="1000 1001 1008"
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </Field>
        ) : null}

        {draft.matchType === "NUMERIC_RANGE" ? (
          <>
            <Field label="From account">
              <input
                type="number"
                value={draft.from ?? ""}
                onChange={(e) => set({ from: Number(e.target.value) })}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="To account">
              <input
                type="number"
                value={draft.to ?? ""}
                onChange={(e) => set({ to: Number(e.target.value) })}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </Field>
          </>
        ) : null}

        <Field label="Category">
          <input
            value={draft.category ?? ""}
            onChange={(e) => set({ category: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </Field>

        <Field label="Section">
          <select
            value={draft.section}
            onChange={(e) => set({ section: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {SECTIONS.map((section) => (
              <option key={section} value={section}>{section}</option>
            ))}
          </select>
        </Field>

        <Field label="Statement line">
          <input
            value={draft.statementLine ?? ""}
            onChange={(e) => set({ statementLine: e.target.value })}
            placeholder="Cash"
            disabled={draft.excluded}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
          />
        </Field>
      </div>

      <p className="mt-2 text-xs text-slate-500">{matchHelp}</p>

      <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={draft.excluded ?? false}
          onChange={(e) => set({ excluded: e.target.checked, statementLine: e.target.checked ? "" : draft.statementLine })}
        />
        Keep these accounts off both statements (excluded)
      </label>

      {draft.excluded ? (
        <Field label="Why is it excluded?">
          <input
            value={draft.exclusionReason ?? ""}
            onChange={(e) => set({ exclusionReason: e.target.value })}
            placeholder="Recorded so the exclusion is visible in reconciliation"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </Field>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onSave}
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Checking…" : "Save mapping"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}
