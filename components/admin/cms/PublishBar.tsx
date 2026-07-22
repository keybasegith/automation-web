"use client";

import { useState } from "react";
import { Loader2, Check, ExternalLink, Save, Undo2 } from "lucide-react";
import type { CmsDocController } from "./useCmsDoc";
import { useToast } from "./Toast";
import ConfirmDialog from "./ConfirmDialog";

/**
 * The sticky admin toolbar shared by every editor. Shows live save/publish
 * status and the Save Draft / Discard / Publish actions, with a confirmation
 * modal before anything reaches the public site. Wording is deliberately
 * non-technical.
 */
export default function PublishBar<T>({
  controller,
  title,
  subtitle,
  viewLiveHref,
  // Optional pre-publish check; return an error string to block publishing.
  validate,
}: {
  controller: CmsDocController<T>;
  title: string;
  subtitle?: string;
  viewLiveHref?: string;
  validate?: (draft: T) => string | null;
}) {
  const toast = useToast();
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [summary, setSummary] = useState("");

  const { unsaved, pendingPublish, saving, publishing } = controller;

  async function handleSave() {
    if (controller.draft && validate) {
      const err = validate(controller.draft);
      if (err) {
        toast.error(err);
        return;
      }
    }
    const ok = await controller.saveDraft();
    toast[ok ? "success" : "error"](
      ok ? "Draft saved." : controller.actionError ?? "Could not save draft."
    );
  }

  function openPublish() {
    if (controller.draft && validate) {
      const err = validate(controller.draft);
      if (err) {
        toast.error(err);
        return;
      }
    }
    setConfirmPublish(true);
  }

  async function handlePublish() {
    const ok = await controller.publish(summary.trim() || undefined);
    setConfirmPublish(false);
    setSummary("");
    toast[ok ? "success" : "error"](
      ok
        ? "Changes published to the live website."
        : controller.actionError ?? "Publish failed."
    );
  }

  async function handleDiscard() {
    const ok = await controller.discard();
    setConfirmDiscard(false);
    toast[ok ? "success" : "error"](
      ok ? "Draft changes discarded." : controller.actionError ?? "Could not discard."
    );
  }

  return (
    <>
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-6 py-3.5 backdrop-blur sm:px-10">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-slate-900">{title}</h1>
          <p className="truncate text-xs text-slate-400">
            {subtitle ?? "Changes will not appear on the live website until you publish them."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusPill
            saving={saving || publishing}
            unsaved={unsaved}
            pendingPublish={pendingPublish}
            publishedAt={controller.publishedAt}
          />

          {viewLiveHref && (
            <a
              href={viewLiveHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">View live</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => setConfirmDiscard(true)}
            disabled={!pendingPublish || saving || publishing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            title="Discard unpublished changes"
          >
            <Undo2 className="h-4 w-4" />
            <span className="hidden sm:inline">Discard</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!unsaved || saving || publishing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#006d6e]/30 px-3 py-2 text-sm font-medium text-[#006d6e] transition hover:bg-[#006d6e]/5 disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Draft
          </button>

          <button
            type="button"
            onClick={openPublish}
            disabled={!pendingPublish || saving || publishing}
            className="inline-flex items-center gap-2 rounded-lg bg-[#006d6e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#00585a] disabled:opacity-50"
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {publishing ? "Publishing…" : "Publish Changes"}
          </button>
        </div>
      </div>

      {controller.actionError && (
        <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-10">
          {controller.actionError}
        </div>
      )}

      <ConfirmDialog
        open={confirmPublish}
        title="Publish to the live website?"
        tone="primary"
        busy={publishing}
        confirmLabel="Publish Changes"
        onCancel={() => setConfirmPublish(false)}
        onConfirm={handlePublish}
        body={
          <div className="space-y-3">
            <p>
              These updates will become visible to website visitors immediately.
            </p>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                Short note (optional) — appears in Version History
              </span>
              <input
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="e.g. Updated the phone number"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#006d6e] focus:ring-2 focus:ring-[#006d6e]/15"
              />
            </label>
          </div>
        }
      />

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard unpublished changes?"
        tone="danger"
        busy={saving}
        confirmLabel="Discard Changes"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={handleDiscard}
        body="This resets your draft back to what's currently live. Any edits you haven't published will be lost."
      />
    </>
  );
}

function StatusPill({
  saving,
  unsaved,
  pendingPublish,
  publishedAt,
}: {
  saving: boolean;
  unsaved: boolean;
  pendingPublish: boolean;
  publishedAt: string | null;
}) {
  if (saving) {
    return (
      <span className="hidden items-center gap-1.5 text-xs font-medium text-slate-500 sm:flex">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
      </span>
    );
  }
  if (unsaved) {
    return (
      <span className="hidden items-center gap-1.5 text-xs font-medium text-amber-600 sm:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes
      </span>
    );
  }
  if (pendingPublish) {
    return (
      <span className="hidden items-center gap-1.5 text-xs font-medium text-amber-600 sm:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Draft saved — not yet live
      </span>
    );
  }
  return (
    <span className="hidden items-center gap-1.5 text-xs font-medium text-emerald-600 sm:flex">
      <Check className="h-3.5 w-3.5" />
      {publishedAt ? `Published ${formatDate(publishedAt)}` : "All changes live"}
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}
