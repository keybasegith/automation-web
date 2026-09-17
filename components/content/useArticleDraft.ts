"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ArticlePayload,
  ContentArticle,
  ContentAuditEntry,
  ContentReview,
  ContentRevision,
  ContentRole,
  ContentUser,
} from "@/lib/content/types";
import type { ArticlePermissions } from "@/lib/content/authz";

/**
 * Drives one article's editing session: load, edit, autosave, submit.
 *
 * Three things this deliberately does NOT do:
 *
 *   - Save on every keystroke. Edits are debounced, and a save in flight is
 *     never raced by another; anything typed meanwhile is picked up by the
 *     save that follows.
 *   - Overwrite the author's text with the server's copy. A successful save
 *     updates the revision pointer and the saved-at time, and leaves what is on
 *     screen alone — the author is still typing into it.
 *   - Lose anything quietly. A failed save keeps `dirty` true so it retries on
 *     the next edit, shows the reason, and the beforeunload guard stays armed.
 */

export interface Workspace {
  article: ContentArticle;
  draft: ContentRevision | null;
  submitted: ContentRevision | null;
  published: ContentRevision | null;
  revisions: ContentRevision[];
  reviews: ContentReview[];
  audit: ContentAuditEntry[];
  owner: ContentUser | null;
  permissions: ArticlePermissions;
  openFeedback: ContentReview | null;
  readingTimeMinutes: number;
  viewer: { id: string; name: string; role: ContentRole };
}

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

/** How long the author has to stop typing before a save goes out. */
const AUTOSAVE_DEBOUNCE_MS = 1_500;

export interface DraftController {
  loading: boolean;
  loadError: string | null;
  workspace: Workspace | null;
  payload: ArticlePayload | null;
  patch: (changes: Partial<ArticlePayload>) => void;
  setPayload: (updater: (prev: ArticlePayload) => ArticlePayload) => void;
  saveState: SaveState;
  saveError: string | null;
  savedAt: string | null;
  /** Set when the server refused a save because the article moved on. */
  conflict: string | null;
  dirty: boolean;
  readingTime: number;
  saveNow: () => Promise<boolean>;
  submit: () => Promise<{ ok: boolean; error?: string; details?: string[] }>;
  updateSettings: (patch: {
    contentType?: string;
    slug?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  reload: () => Promise<void>;
}

export function useArticleDraft(articleId: string): DraftController {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [payload, setPayloadState] = useState<ArticlePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [readingTime, setReadingTime] = useState(0);

  // Refs, not state: the autosave timer reads these at fire time and must see
  // the newest values without re-arming itself on every character typed.
  const payloadRef = useRef<ArticlePayload | null>(null);
  const revisionRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dirty, setDirty] = useState(false);

  const applyWorkspace = useCallback((data: Workspace) => {
    setWorkspace(data);
    revisionRef.current = data.draft?.id ?? null;
    setReadingTime(data.readingTimeMinutes ?? 0);
    setSavedAt(data.draft?.updatedAt ?? null);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/content/articles/${articleId}`);
      if (res.status === 401) {
        window.location.href = "/content";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not load that article.");
      applyWorkspace(data as Workspace);
      const next = (data as Workspace).draft?.payload ?? null;
      setPayloadState(next);
      payloadRef.current = next;
      dirtyRef.current = false;
      setDirty(false);
      setSaveState("idle");
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Could not load that article."
      );
    } finally {
      setLoading(false);
    }
  }, [articleId, applyWorkspace]);

  // Wrapped rather than `void load()`: every state update inside `load` happens
  // after an await, so the effect body itself stays free of synchronous
  // setState. The same shape lib/../useCmsDoc.ts already uses.
  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  /**
   * Push the current payload to the server.
   *
   * Returns false without doing anything when a save is already in flight; the
   * debounce timer will come back around, and the newest text goes with it.
   */
  const push = useCallback(async (): Promise<boolean> => {
    if (inFlight.current || !payloadRef.current) return false;
    inFlight.current = true;
    setSaveState("saving");
    setSaveError(null);

    // Captured before the request so edits made while it is in flight are not
    // mistakenly marked saved when it returns.
    const sent = payloadRef.current;

    try {
      const res = await fetch(`/api/content/articles/${articleId}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: sent,
          expectedRevisionId: revisionRef.current ?? undefined,
        }),
      });
      if (res.status === 401) {
        window.location.href = "/content";
        return false;
      }
      const data = await res.json();

      if (res.status === 409) {
        // The article moved on somewhere else. Say so and stop autosaving into
        // a version that no longer exists — the author's text is still on
        // screen, and reloading is their call.
        setConflict(data?.error ?? "This article changed somewhere else.");
        setSaveState("error");
        return false;
      }
      if (!res.ok) throw new Error(data?.error ?? "Could not save your draft.");

      revisionRef.current = data.revision.id;
      setSavedAt(data.savedAt ?? data.revision.updatedAt);
      setReadingTime(data.readingTimeMinutes ?? 0);
      setWorkspace((prev) =>
        prev ? { ...prev, article: data.article, draft: data.revision } : prev
      );

      // Only clean if nothing was typed while the request was out.
      if (payloadRef.current === sent) {
        dirtyRef.current = false;
        setDirty(false);
        setSaveState("saved");
      } else {
        setSaveState("dirty");
      }
      return true;
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Could not save your draft."
      );
      setSaveState("error");
      return false;
    } finally {
      inFlight.current = false;
    }
  }, [articleId]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (dirtyRef.current && !conflict) void push();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [push, conflict]);

  const setPayload = useCallback(
    (updater: (prev: ArticlePayload) => ArticlePayload) => {
      setPayloadState((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        payloadRef.current = next;
        return next;
      });
      dirtyRef.current = true;
      setDirty(true);
      setSaveState("dirty");
      schedule();
    },
    [schedule]
  );

  const patch = useCallback(
    (changes: Partial<ArticlePayload>) => {
      setPayload((prev) => ({ ...prev, ...changes }));
    },
    [setPayload]
  );

  const saveNow = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    return push();
  }, [push]);

  /** Save first, so compliance is handed exactly what is on screen. */
  const submit = useCallback(async () => {
    if (dirtyRef.current) {
      const saved = await saveNow();
      if (!saved) {
        return { ok: false, error: saveError ?? "Save your draft before submitting." };
      }
    }
    try {
      const res = await fetch(`/api/content/articles/${articleId}/submit`, {
        method: "POST",
      });
      if (res.status === 401) {
        window.location.href = "/content";
        return { ok: false };
      }
      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          error: data?.error ?? "Could not submit the article.",
          details: data?.details,
        };
      }
      await load();
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not submit the article.",
      };
    }
  }, [articleId, saveNow, saveError, load]);

  const updateSettings = useCallback(
    async (settings: { contentType?: string; slug?: string }) => {
      try {
        const res = await fetch(`/api/content/articles/${articleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });
        const data = await res.json();
        if (!res.ok) {
          return { ok: false, error: data?.error ?? "Could not save those settings." };
        }
        setWorkspace((prev) => (prev ? { ...prev, article: data.article } : prev));
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Could not save those settings.",
        };
      }
    },
    [articleId]
  );

  // Nothing an author typed may vanish because they closed a tab.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return useMemo(
    () => ({
      loading,
      loadError,
      workspace,
      payload,
      patch,
      setPayload,
      saveState,
      saveError,
      savedAt,
      conflict,
      dirty,
      readingTime,
      saveNow,
      submit,
      updateSettings,
      reload: load,
    }),
    [
      loading,
      loadError,
      workspace,
      payload,
      patch,
      setPayload,
      saveState,
      saveError,
      savedAt,
      conflict,
      dirty,
      readingTime,
      saveNow,
      submit,
      updateSettings,
      load,
    ]
  );
}

export type { ArticlePermissions };
