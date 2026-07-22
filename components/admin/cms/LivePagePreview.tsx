"use client";

import { useEffect, useState } from "react";
import { Monitor, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import ScaledPreview from "./ScaledPreview";
import type { CmsDocController } from "./useCmsDoc";

/**
 * A true-to-life preview: an iframe of the REAL public page rendered in admin
 * draft-preview mode (Next Draft Mode), so it shows the full page — header,
 * hero, every body section, footer — exactly as it will look, with the current
 * unpublished DRAFT content.
 *
 * To reflect edits, it debounce-autosaves the draft (never publishes) a moment
 * after typing stops, then reloads the iframe. The page is rendered at the
 * site's real 1280px width and scaled down to fit the panel.
 */
export default function LivePagePreview<T>({
  controller,
  path,
  canSave = true,
}: {
  controller: CmsDocController<T>;
  path: string;
  /** Skip autosave while the draft is invalid, to avoid error flashes. */
  canSave?: boolean;
}) {
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const { unsaved, saveDraft } = controller;

  // Debounced autosave of the draft, then reload the iframe to show it.
  // `saveDraft`'s identity changes on every draft edit, so this effect re-arms
  // the debounce as the admin types.
  useEffect(() => {
    if (!unsaved || !canSave) return;
    const t = setTimeout(async () => {
      setSaving(true);
      const ok = await saveDraft();
      setSaving(false);
      if (ok) setVersion((v) => v + 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [unsaved, canSave, saveDraft]);

  const previewUrl = `/api/admin/preview?path=${encodeURIComponent(path)}&v=${version}`;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
          <Monitor className="h-3.5 w-3.5" /> Live preview
        </span>
        <span className="flex items-center gap-2">
          {saving && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin" /> updating…
            </span>
          )}
          <button
            type="button"
            onClick={() => setVersion((v) => v + 1)}
            title="Refresh preview"
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            title="Open full-size in a new tab"
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5">
        <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="ml-2 truncate rounded bg-white px-2 py-0.5 text-[11px] text-slate-400 ring-1 ring-slate-200">
            {path}
          </span>
        </div>
        <ScaledPreview>
          <iframe
            key={`${path}-${version}`}
            src={previewUrl}
            title="Live page preview"
            width={1280}
            height={2200}
            className="block border-0 bg-white"
          />
        </ScaledPreview>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        The real page with your unpublished changes — it updates a moment after you
        stop typing. Publish to make it live.
      </p>
    </div>
  );
}
