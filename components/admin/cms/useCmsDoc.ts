"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Client hook that drives the draft → publish workflow for one CMS resource.
 *
 * It loads the document from /api/website-admin-cms/cms/<resource>, keeps a local editable
 * draft, tracks unsaved vs unpublished state, and exposes save / publish /
 * discard / restore actions. Every editor screen uses this so the workflow and
 * status semantics are identical everywhere.
 */

export interface VersionMeta {
  id: string;
  versionNumber: number;
  changeSummary: string;
  createdBy: string;
  createdAt: string;
}

interface AdminDocView<T> {
  resource: string;
  draft: T;
  published: T | null;
  versions: VersionMeta[];
  draftUpdatedAt: string;
  draftUpdatedBy: string;
  publishedAt: string | null;
  publishedBy: string | null;
  hasUnpublishedChanges: boolean;
}

export interface CmsDocController<T> {
  loading: boolean;
  loadError: string | null;
  /** The live editable draft. Mutate via setDraft. */
  draft: T | null;
  setDraft: (updater: T | ((prev: T) => T)) => void;
  published: T | null;
  versions: VersionMeta[];
  publishedAt: string | null;
  publishedBy: string | null;
  /** Local edits not yet saved to the server draft. */
  unsaved: boolean;
  /** Draft differs from the live site (unsaved OR saved-but-unpublished). */
  pendingPublish: boolean;
  saving: boolean;
  publishing: boolean;
  actionError: string | null;
  reload: () => Promise<void>;
  saveDraft: () => Promise<boolean>;
  publish: (changeSummary?: string) => Promise<boolean>;
  discard: () => Promise<boolean>;
  restore: (versionId: string) => Promise<boolean>;
}

export function useCmsDoc<T>(resource: string): CmsDocController<T> {
  const [server, setServer] = useState<AdminDocView<T> | null>(null);
  const [draft, setDraftState] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const inFlight = useRef(false);

  // No synchronous setState here — state updates happen after the await so the
  // effect that calls this on mount stays side-effect-clean.
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/website-admin-cms/cms/${resource}`);
      if (res.status === 401) {
        window.location.href = "/website-admin-cms";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load.");
      const doc = data.doc as AdminDocView<T>;
      setServer(doc);
      setDraftState(doc.draft);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [resource]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const setDraft = useCallback((updater: T | ((prev: T) => T)) => {
    setDraftState((prev) => {
      if (prev === null) return prev;
      return typeof updater === "function"
        ? (updater as (p: T) => T)(prev)
        : updater;
    });
    setActionError(null);
  }, []);

  const unsaved = useMemo(() => {
    if (!server || draft === null) return false;
    return JSON.stringify(draft) !== JSON.stringify(server.draft);
  }, [server, draft]);

  const pendingPublish = unsaved || (server?.hasUnpublishedChanges ?? false);

  // Warn before navigating away with unsaved edits.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (unsaved) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [unsaved]);

  const post = useCallback(
    async (body: Record<string, unknown>): Promise<boolean> => {
      if (inFlight.current) return false; // prevent duplicate requests
      inFlight.current = true;
      setActionError(null);
      try {
        const res = await fetch(`/api/website-admin-cms/cms/${resource}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.status === 401) {
          window.location.href = "/website-admin-cms";
          return false;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");
        const doc = data.doc as AdminDocView<T>;
        setServer(doc);
        setDraftState(doc.draft);
        return true;
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Something went wrong.");
        return false;
      } finally {
        inFlight.current = false;
      }
    },
    [resource, inFlight]
  );

  const saveDraft = useCallback(async () => {
    if (draft === null) return false;
    setSaving(true);
    const ok = await post({ action: "save_draft", content: draft });
    setSaving(false);
    return ok;
  }, [draft, post]);

  const publish = useCallback(
    async (changeSummary?: string) => {
      if (draft === null) return false;
      setPublishing(true);
      const ok = await post({ action: "publish", content: draft, changeSummary });
      setPublishing(false);
      return ok;
    },
    [draft, post]
  );

  const discard = useCallback(async () => {
    setSaving(true);
    const ok = await post({ action: "discard_draft" });
    setSaving(false);
    return ok;
  }, [post]);

  const restore = useCallback(
    async (versionId: string) => {
      setSaving(true);
      const ok = await post({ action: "restore_version", versionId });
      setSaving(false);
      return ok;
    },
    [post]
  );

  return {
    loading,
    loadError,
    draft,
    setDraft,
    published: server?.published ?? null,
    versions: server?.versions ?? [],
    publishedAt: server?.publishedAt ?? null,
    publishedBy: server?.publishedBy ?? null,
    unsaved,
    pendingPublish,
    saving,
    publishing,
    actionError,
    reload: load,
    saveDraft,
    publish,
    discard,
    restore,
  };
}
