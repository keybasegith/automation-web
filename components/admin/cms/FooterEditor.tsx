"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import type { FooterContent, FooterLink } from "@/lib/cms/types";
import { required, safeUrl } from "@/lib/cms/validation";
import { useCmsDoc } from "./useCmsDoc";
import { ToastProvider } from "./Toast";
import PublishBar from "./PublishBar";
import { Card, RepeaterRow, fieldInputClass, moveInArray } from "./fields";

function validateFooter(f: FooterContent): string | null {
  for (const col of f.columns) {
    if (!required(col.heading).ok) return "Every footer column needs a heading.";
    for (const link of col.links) {
      if (!required(link.label).ok) return `A link in "${col.heading}" is missing its label.`;
      const r = safeUrl(link.url, `"${link.label}" link`);
      if (!r.ok) return r.message;
    }
  }
  for (const link of f.legalLinks) {
    const r = safeUrl(link.url, `"${link.label}" link`);
    if (!r.ok) return r.message;
  }
  return null;
}

const blankLink = (): FooterLink => ({ label: "", url: "", openInNewTab: false });

export default function FooterEditor() {
  return (
    <ToastProvider>
      <Editor />
    </ToastProvider>
  );
}

function Editor() {
  const ctrl = useCmsDoc<FooterContent>("footer");
  const f = ctrl.draft;

  return (
    <div className="flex min-h-screen flex-col">
      <PublishBar
        controller={ctrl}
        title="Footer"
        subtitle="The link columns and legal links at the bottom of every page."
        validate={validateFooter}
      />

      <div className="flex-1 px-6 py-8 sm:px-10">
        {ctrl.loading ? (
          <div className="flex items-center gap-2 py-24 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : ctrl.loadError ? (
          <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {ctrl.loadError}
          </div>
        ) : f ? (
          <div className="mx-auto grid max-w-3xl gap-6">
            <Card
              title="Footer columns"
              description="Each column has a heading and a list of links."
            >
              <div className="space-y-4">
                {f.columns.map((col, ci) => (
                  <RepeaterRow
                    key={ci}
                    index={ci}
                    total={f.columns.length}
                    onMove={(dir) => ctrl.setDraft((p) => ({ ...p, columns: moveInArray(p.columns, ci, dir) }))}
                    onRemove={() => ctrl.setDraft((p) => ({ ...p, columns: p.columns.filter((_, j) => j !== ci) }))}
                  >
                    <input
                      value={col.heading}
                      placeholder="Column heading"
                      onChange={(e) =>
                        ctrl.setDraft((p) => {
                          const columns = [...p.columns];
                          columns[ci] = { ...col, heading: e.target.value };
                          return { ...p, columns };
                        })
                      }
                      className={`${fieldInputClass} mb-3 font-medium`}
                    />
                    <div className="space-y-2">
                      {col.links.map((link, li) => (
                        <LinkRow
                          key={li}
                          link={link}
                          onChange={(patch) =>
                            ctrl.setDraft((p) => {
                              const columns = [...p.columns];
                              const links = [...columns[ci].links];
                              links[li] = { ...links[li], ...patch };
                              columns[ci] = { ...columns[ci], links };
                              return { ...p, columns };
                            })
                          }
                          onRemove={() =>
                            ctrl.setDraft((p) => {
                              const columns = [...p.columns];
                              columns[ci] = {
                                ...columns[ci],
                                links: columns[ci].links.filter((_, j) => j !== li),
                              };
                              return { ...p, columns };
                            })
                          }
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          ctrl.setDraft((p) => {
                            const columns = [...p.columns];
                            columns[ci] = { ...columns[ci], links: [...columns[ci].links, blankLink()] };
                            return { ...p, columns };
                          })
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#006d6e] hover:underline"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add link
                      </button>
                    </div>
                  </RepeaterRow>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    ctrl.setDraft((p) => ({
                      ...p,
                      columns: [...p.columns, { heading: "", links: [] }],
                    }))
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-[#006d6e] hover:text-[#006d6e]"
                >
                  <Plus className="h-4 w-4" /> Add column
                </button>
              </div>
            </Card>

            <Card
              title="Legal links"
              description="Extra links in the legal row, e.g. Terms of Use or Disclosures."
            >
              <div className="space-y-2">
                {f.legalLinks.map((link, i) => (
                  <LinkRow
                    key={i}
                    link={link}
                    onChange={(patch) =>
                      ctrl.setDraft((p) => {
                        const legalLinks = [...p.legalLinks];
                        legalLinks[i] = { ...legalLinks[i], ...patch };
                        return { ...p, legalLinks };
                      })
                    }
                    onRemove={() =>
                      ctrl.setDraft((p) => ({
                        ...p,
                        legalLinks: p.legalLinks.filter((_, j) => j !== i),
                      }))
                    }
                  />
                ))}
                <button
                  type="button"
                  onClick={() =>
                    ctrl.setDraft((p) => ({ ...p, legalLinks: [...p.legalLinks, blankLink()] }))
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#006d6e] hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Add legal link
                </button>
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LinkRow({
  link,
  onChange,
  onRemove,
}: {
  link: FooterLink;
  onChange: (patch: Partial<FooterLink>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={link.label}
        placeholder="Label"
        onChange={(e) => onChange({ label: e.target.value })}
        className={`${fieldInputClass} flex-1`}
      />
      <input
        value={link.url}
        placeholder="/path or https://…"
        onChange={(e) => onChange({ url: e.target.value })}
        className={`${fieldInputClass} flex-[2]`}
      />
      <label className="flex items-center gap-1.5 text-xs text-slate-500">
        <input
          type="checkbox"
          checked={link.openInNewTab}
          onChange={(e) => onChange({ openInNewTab: e.target.checked })}
          className="h-3.5 w-3.5 rounded border-slate-300 text-[#006d6e] focus:ring-[#006d6e]"
        />
        New tab
      </label>
      <button
        type="button"
        title="Remove link"
        onClick={onRemove}
        className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
