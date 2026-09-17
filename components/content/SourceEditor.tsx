"use client";

import { ChevronDown, ChevronUp, ExternalLink, Plus, Trash2 } from "lucide-react";
import type { ArticleSource } from "@/lib/insights/types";
import { inputClass } from "./ui";

/**
 * The structured source editor.
 *
 * Sources are a compliance artefact before they are a design element: a
 * reviewer has to be able to click straight through to what an article claims
 * to be citing. So each one is captured as separate fields rather than a line
 * of prose, and the link is live in this editor — not just on the published
 * page a reviewer would otherwise have to preview to reach.
 *
 * A citation with no URL is still a citation. The existing ArticleSources
 * component renders one as plain text, and a dated release with no permanent
 * link is better cited that way than with a URL somebody invented.
 */

export default function SourceEditor({
  sources,
  onChange,
  disabled = false,
}: {
  sources: ArticleSource[];
  onChange: (next: ArticleSource[]) => void;
  disabled?: boolean;
}) {
  const patch = (index: number, changes: Partial<ArticleSource>) => {
    const next = [...sources];
    next[index] = { ...next[index], ...changes };
    onChange(next);
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sources.length) return;
    const next = [...sources];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {sources.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
          No sources yet. Compliance will look for one behind every figure.
        </p>
      )}

      {sources.map((source, index) => {
        const clickable = /^https?:\/\//i.test(source.url ?? "");
        return (
          <div
            key={index}
            className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Source {index + 1}
              </span>
              {!disabled && (
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    title="Move up"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="rounded p-1 text-slate-400 transition hover:bg-slate-200 disabled:opacity-25"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Move down"
                    onClick={() => move(index, 1)}
                    disabled={index === sources.length - 1}
                    className="rounded p-1 text-slate-400 transition hover:bg-slate-200 disabled:opacity-25"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Remove source"
                    onClick={() => onChange(sources.filter((_, i) => i !== index))}
                    className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Organization
                </span>
                <input
                  value={source.label}
                  disabled={disabled}
                  onChange={(e) => patch(index, { label: e.target.value })}
                  placeholder="Statistics Canada"
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Title
                </span>
                <input
                  value={source.title}
                  disabled={disabled}
                  onChange={(e) => patch(index, { title: e.target.value })}
                  placeholder="Consumer Price Index, July 2026"
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
                  <span>URL</span>
                  {clickable && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-[#006d6e] hover:underline"
                    >
                      Open
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </span>
                <input
                  value={source.url ?? ""}
                  disabled={disabled}
                  onChange={(e) =>
                    patch(index, { url: e.target.value || undefined })
                  }
                  placeholder="https://www150.statcan.gc.ca/…"
                  className={inputClass}
                />
                <span className="mt-1 block text-xs text-slate-400">
                  Leave empty where there is no permanent link. The citation
                  still prints, as text.
                </span>
              </label>
            </div>
          </div>
        );
      })}

      {!disabled && (
        <button
          type="button"
          onClick={() => onChange([...sources, { label: "", title: "" }])}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-[#006d6e] hover:text-[#006d6e]"
        >
          <Plus className="h-4 w-4" />
          Add Source
        </button>
      )}
    </div>
  );
}
