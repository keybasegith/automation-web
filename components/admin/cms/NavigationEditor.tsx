"use client";

import { Loader2, Plus, Trash2, Lock } from "lucide-react";
import type { NavChild, NavContent, NavItem } from "@/lib/cms/types";
import { required, safeUrl } from "@/lib/cms/validation";
import { useCmsDoc } from "./useCmsDoc";
import { ToastProvider } from "./Toast";
import PublishBar from "./PublishBar";
import { Card, RepeaterRow, Toggle, fieldInputClass, moveInArray } from "./fields";

function validateNav(nav: NavContent): string | null {
  for (const item of nav.items) {
    if (!required(item.label).ok) return "Every menu item needs a label.";
    const u = safeUrl(item.url, `"${item.label}" link`);
    if (!u.ok) return u.message;
    for (const child of item.children) {
      if (!required(child.label).ok) return `A dropdown item under "${item.label}" is missing its label.`;
      const cu = safeUrl(child.url, `"${child.label}" link`);
      if (!cu.ok) return cu.message;
    }
  }
  for (const link of nav.utilityLinks) {
    if (!required(link.label).ok) return "Every top-bar link needs a label.";
    const u = safeUrl(link.url, `"${link.label}" link`);
    if (!u.ok) return u.message;
  }
  return null;
}

const blankChild = (): NavChild => ({ label: "", url: "", openInNewTab: false, isVisible: true });
const blankItem = (): NavItem => ({
  label: "",
  url: "",
  openInNewTab: false,
  isVisible: true,
  isServicesMega: false,
  children: [],
});

export default function NavigationEditor() {
  return (
    <ToastProvider>
      <Editor />
    </ToastProvider>
  );
}

function Editor() {
  const ctrl = useCmsDoc<NavContent>("navigation");
  const nav = ctrl.draft;

  const patchItem = (index: number, patch: Partial<NavItem>) =>
    ctrl.setDraft((p) => {
      const items = [...p.items];
      items[index] = { ...items[index], ...patch };
      return { ...p, items };
    });

  return (
    <div className="flex min-h-screen flex-col">
      <PublishBar
        controller={ctrl}
        title="Navigation"
        subtitle="The main menu and the small links in the top bar."
        validate={validateNav}
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
        ) : nav ? (
          <div className="mx-auto grid max-w-3xl gap-6">
            <Card
              title="Main menu"
              description="Top-level menu items. Items with dropdown links show a menu on hover."
            >
              <div className="space-y-4">
                {nav.items.map((item, i) => (
                  <RepeaterRow
                    key={i}
                    index={i}
                    total={nav.items.length}
                    onMove={(dir) => ctrl.setDraft((p) => ({ ...p, items: moveInArray(p.items, i, dir) }))}
                    onRemove={() => ctrl.setDraft((p) => ({ ...p, items: p.items.filter((_, j) => j !== i) }))}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={item.label}
                        placeholder="Menu label"
                        onChange={(e) => patchItem(i, { label: e.target.value })}
                        className={`${fieldInputClass} flex-1 font-medium`}
                      />
                      {!item.isServicesMega && item.children.length === 0 && (
                        <input
                          value={item.url}
                          placeholder="/path or https://…"
                          onChange={(e) => patchItem(i, { url: e.target.value })}
                          className={`${fieldInputClass} flex-[2]`}
                        />
                      )}
                      <div className="flex items-center gap-3 pl-1">
                        <Toggle
                          label="Visible"
                          checked={item.isVisible}
                          onChange={(v) => patchItem(i, { isVisible: v })}
                        />
                      </div>
                    </div>

                    {item.isServicesMega ? (
                      <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">
                        <Lock className="h-3.5 w-3.5" />
                        The &ldquo;Services&rdquo; mega-menu contents are managed in the site
                        design. You can rename or hide this item here.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2 border-l-2 border-slate-200 pl-3">
                        {item.children.map((child, ci) => (
                          <div key={ci} className="flex flex-wrap items-center gap-2">
                            <input
                              value={child.label}
                              placeholder="Dropdown label"
                              onChange={(e) => {
                                const children = [...item.children];
                                children[ci] = { ...child, label: e.target.value };
                                patchItem(i, { children });
                              }}
                              className={`${fieldInputClass} flex-1`}
                            />
                            <input
                              value={child.url}
                              placeholder="/path"
                              onChange={(e) => {
                                const children = [...item.children];
                                children[ci] = { ...child, url: e.target.value };
                                patchItem(i, { children });
                              }}
                              className={`${fieldInputClass} flex-[2]`}
                            />
                            <label className="flex items-center gap-1.5 text-xs text-slate-500">
                              <input
                                type="checkbox"
                                checked={child.openInNewTab}
                                onChange={(e) => {
                                  const children = [...item.children];
                                  children[ci] = { ...child, openInNewTab: e.target.checked };
                                  patchItem(i, { children });
                                }}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-[#006d6e] focus:ring-[#006d6e]"
                              />
                              New tab
                            </label>
                            <button
                              type="button"
                              title="Remove"
                              onClick={() =>
                                patchItem(i, { children: item.children.filter((_, j) => j !== ci) })
                              }
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => patchItem(i, { children: [...item.children, blankChild()] })}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#006d6e] hover:underline"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add dropdown link
                        </button>
                      </div>
                    )}
                  </RepeaterRow>
                ))}
                <button
                  type="button"
                  onClick={() => ctrl.setDraft((p) => ({ ...p, items: [...p.items, blankItem()] }))}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-[#006d6e] hover:text-[#006d6e]"
                >
                  <Plus className="h-4 w-4" /> Add menu item
                </button>
              </div>
            </Card>

            <Card
              title="Top bar links"
              description="The small links in the dark bar above the header (e.g. Client Access)."
            >
              <div className="space-y-2">
                {nav.utilityLinks.map((link, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input
                      value={link.label}
                      placeholder="Label"
                      onChange={(e) => {
                        const utilityLinks = [...nav.utilityLinks];
                        utilityLinks[i] = { ...link, label: e.target.value };
                        ctrl.setDraft((p) => ({ ...p, utilityLinks }));
                      }}
                      className={`${fieldInputClass} flex-1`}
                    />
                    <input
                      value={link.url}
                      placeholder="https://…"
                      onChange={(e) => {
                        const utilityLinks = [...nav.utilityLinks];
                        utilityLinks[i] = { ...link, url: e.target.value };
                        ctrl.setDraft((p) => ({ ...p, utilityLinks }));
                      }}
                      className={`${fieldInputClass} flex-[2]`}
                    />
                    <label className="flex items-center gap-1.5 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={link.openInNewTab}
                        onChange={(e) => {
                          const utilityLinks = [...nav.utilityLinks];
                          utilityLinks[i] = { ...link, openInNewTab: e.target.checked };
                          ctrl.setDraft((p) => ({ ...p, utilityLinks }));
                        }}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-[#006d6e] focus:ring-[#006d6e]"
                      />
                      New tab
                    </label>
                    <button
                      type="button"
                      title="Remove"
                      onClick={() =>
                        ctrl.setDraft((p) => ({
                          ...p,
                          utilityLinks: p.utilityLinks.filter((_, j) => j !== i),
                        }))
                      }
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    ctrl.setDraft((p) => ({ ...p, utilityLinks: [...p.utilityLinks, blankChild()] }))
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#006d6e] hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Add top-bar link
                </button>
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
