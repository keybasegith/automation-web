"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DOCUMENT_CATALOG,
  MANUAL_DOCUMENT_OPTIONS,
  type DocumentCatalogItem,
} from "@/lib/document-intake/documentCatalog";

export interface DocumentTypePickerSelection {
  documentName: string;
  documentCode?: string;
  category: string;
  isCustom: boolean;
}

interface Props {
  open: boolean;
  initial?: { documentName?: string; category?: string; documentCode?: string };
  onCancel: () => void;
  onConfirm: (selection: DocumentTypePickerSelection) => void;
}

export default function DocumentTypePickerModal(props: Props) {
  if (!props.open) return null;
  return <DocumentTypePickerModalInner {...props} />;
}

function DocumentTypePickerModalInner({
  initial,
  onCancel,
  onConfirm,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState<string>(
    initial?.documentName ?? ""
  );
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState(
    initial?.category && initial?.category !== "Unknown" ? initial.category : "Other"
  );

  const isCustomSelected = selectedName === "__custom__";

  const filtered = useMemo<DocumentCatalogItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DOCUMENT_CATALOG;
    return DOCUMENT_CATALOG.filter((d) => {
      if (d.documentName.toLowerCase().includes(q)) return true;
      if (d.documentCode && d.documentCode.toLowerCase().includes(q)) return true;
      if (d.category.toLowerCase().includes(q)) return true;
      return d.aliases.some((a) => a.toLowerCase().includes(q));
    });
  }, [query]);

  const handleConfirm = () => {
    if (isCustomSelected) {
      const name = customName.trim();
      if (name.length === 0) return;
      onConfirm({
        documentName: name,
        category: customCategory.trim() || "Other",
        isCustom: true,
      });
      return;
    }
    if (!selectedName) return;
    if (selectedName === "Other" || selectedName === "Unknown") {
      onConfirm({
        documentName: selectedName,
        category: selectedName,
        isCustom: false,
      });
      return;
    }
    const found = DOCUMENT_CATALOG.find((d) => d.documentName === selectedName);
    if (!found) return;
    onConfirm({
      documentName: found.documentName,
      documentCode: found.documentCode,
      category: found.category,
      isCustom: false,
    });
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-brand">
              Edit Document Info
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
              Choose detected document type
            </h3>
            <p className="text-xs text-slate-500">
              Search the Keybase document catalog by name, code, category, or
              alias. You can also enter a custom document name.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-slate-200 px-6 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, code (e.g. 10001, T2033), category, or alias…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        <div className="max-h-[45vh] overflow-y-auto px-2 py-2">
          <ul className="flex flex-col">
            {filtered.map((d) => {
              const isSel = selectedName === d.documentName;
              return (
                <li key={d.documentName}>
                  <button
                    type="button"
                    onClick={() => setSelectedName(d.documentName)}
                    className={`flex w-full flex-col items-start gap-0.5 rounded-xl px-4 py-2 text-left text-sm transition ${
                      isSel
                        ? "bg-brand-soft text-slate-900"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="font-medium">{d.documentName}</span>
                    <span className="text-xs text-slate-500">
                      {d.category}
                      {d.documentCode ? ` · code ${d.documentCode}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-slate-500">
                No matches in the catalog.
              </li>
            )}
          </ul>

          <div className="mt-2 border-t border-dashed border-slate-200 pt-2">
            {MANUAL_DOCUMENT_OPTIONS.map((opt) => {
              const isSel = selectedName === opt.documentName;
              return (
                <button
                  key={opt.documentName}
                  type="button"
                  onClick={() => setSelectedName(opt.documentName)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-2 text-left text-sm transition ${
                    isSel
                      ? "bg-brand-soft text-slate-900"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="font-medium">{opt.documentName}</span>
                  <span className="text-xs text-slate-500">
                    Manual: {opt.category}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedName("__custom__")}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-2 text-left text-sm transition ${
                isCustomSelected
                  ? "bg-brand-soft text-slate-900"
                  : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              <span className="font-medium">Custom Document Name…</span>
              <span className="text-xs text-slate-500">Enter your own name</span>
            </button>
          </div>

          {isCustomSelected && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-700">
                  Custom Document Name
                </span>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Keybase Internal Memo"
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>
              <label className="mt-3 flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-700">
                  Category
                </span>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Other"
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              !selectedName ||
              (isCustomSelected && customName.trim().length === 0)
            }
            className="inline-flex h-9 items-center justify-center rounded-xl bg-brand px-3 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
