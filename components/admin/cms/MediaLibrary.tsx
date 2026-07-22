"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Upload, Trash2, Search, Check, ImageOff } from "lucide-react";
import type { MediaItemWithUrl } from "@/lib/cms/types";
import { MEDIA_ACCEPT_ATTR } from "@/lib/cms/media/policy";
import { uploadMediaFile } from "./uploadMedia";
import { ToastProvider, useToast } from "./Toast";
import ConfirmDialog from "./ConfirmDialog";

/**
 * Media Library — upload, browse, search, edit alt text, and delete images.
 * Deleting an in-use image is blocked until the admin confirms (the server
 * reports where it's used).
 */
export default function MediaLibrary() {
  return (
    <ToastProvider>
      <Library />
    </ToastProvider>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Library() {
  const toast = useToast();
  const [items, setItems] = useState<MediaItemWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ item: MediaItemWithUrl; usage: string[] } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // State updates happen only after the await, so calling this on mount doesn't
  // trigger a synchronous setState inside the effect.
  async function load() {
    try {
      const res = await fetch("/api/website-admin-cms/media");
      if (res.status === 401) {
        window.location.href = "/website-admin-cms";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load.");
      setItems(data.items as MediaItemWithUrl[]);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, []);

  async function upload(files: FileList) {
    setUploading(true);
    let anyOk = false;
    for (const file of Array.from(files)) {
      try {
        const item = await uploadMediaFile(file);
        setItems((prev) => [item, ...prev]);
        anyOk = true;
      } catch (err) {
        toast.error(`${file.name}: ${err instanceof Error ? err.message : "Upload failed."}`);
      }
    }
    if (anyOk) toast.success("Uploaded.");
    setUploading(false);
  }

  async function saveAlt(item: MediaItemWithUrl, altText: string) {
    setItems((prev) => prev.map((m) => (m.id === item.id ? { ...m, altText } : m)));
    try {
      await fetch(`/api/website-admin-cms/media/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ altText }),
      });
    } catch {
      toast.error("Could not save alt text.");
    }
  }

  async function requestDelete(item: MediaItemWithUrl) {
    // First attempt without force — the server tells us if it's in use.
    try {
      const res = await fetch(`/api/website-admin-cms/media/${item.id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((m) => m.id !== item.id));
        toast.success("Image deleted.");
        return;
      }
      const data = await res.json();
      if (res.status === 409) {
        setPendingDelete({ item, usage: data.usage ?? [] });
      } else {
        toast.error(data?.error ?? "Could not delete.");
      }
    } catch {
      toast.error("Could not delete.");
    }
  }

  async function confirmForceDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/website-admin-cms/media/${pendingDelete.item.id}?force=true`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems((prev) => prev.filter((m) => m.id !== pendingDelete.item.id));
        toast.success("Image deleted.");
      } else {
        toast.error("Could not delete.");
      }
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  const filtered = useMemo(
    () => items.filter((m) => m.fileName.toLowerCase().includes(query.trim().toLowerCase())),
    [items, query]
  );

  return (
    <div className="flex min-h-screen flex-col">
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-6 py-3.5 backdrop-blur sm:px-10">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Media Library</h1>
          <p className="text-xs text-slate-400">Upload and manage images and videos used across the website.</p>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-lg bg-[#006d6e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#00585a] disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={MEDIA_ACCEPT_ATTR}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex-1 px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="relative mb-6 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by filename…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-[#006d6e] focus:ring-2 focus:ring-[#006d6e]/15"
            />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-24 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {loadError}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 py-20 text-center text-sm text-slate-400">
              <ImageOff className="h-8 w-8" strokeWidth={1.5} />
              {items.length === 0 ? "No images uploaded yet." : "No images match your search."}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  onSaveAlt={(alt) => saveAlt(item, alt)}
                  onDelete={() => requestDelete(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="This image is in use"
        tone="danger"
        busy={deleting}
        confirmLabel="Delete Anyway"
        cancelLabel="Keep Image"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmForceDelete}
        body={
          <div className="space-y-2">
            <p>This image is currently used in:</p>
            <ul className="list-disc space-y-1 pl-5 text-slate-700">
              {pendingDelete?.usage.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
            <p>Deleting it may leave those places without an image.</p>
          </div>
        }
      />
    </div>
  );
}

function MediaCard({
  item,
  onSaveAlt,
  onDelete,
}: {
  item: MediaItemWithUrl;
  onSaveAlt: (alt: string) => void;
  onDelete: () => void;
}) {
  const [alt, setAlt] = useState(item.altText);
  const [saved, setSaved] = useState(false);
  const dirty = alt !== item.altText;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="relative aspect-[4/3] bg-slate-100">
        {item.fileType.startsWith("video/") ? (
          <video
            src={item.fileUrl}
            className="h-full w-full object-cover"
            muted
            playsInline
            controls
            preload="metadata"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.fileUrl} alt={item.altText || item.fileName} className="h-full w-full object-cover" />
        )}
        <button
          type="button"
          title="Delete image"
          aria-label="Delete image"
          onClick={onDelete}
          className="absolute right-1.5 top-1.5 rounded-md bg-white/90 p-1.5 text-slate-500 opacity-0 shadow-sm ring-1 ring-black/5 transition hover:text-red-600 group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="truncate text-xs font-medium text-slate-600" title={item.fileName}>
          {item.fileName}
        </p>
        <p className="text-[11px] text-slate-400">{formatSize(item.fileSize)}</p>
        <input
          value={alt}
          onChange={(e) => {
            setAlt(e.target.value);
            setSaved(false);
          }}
          onBlur={() => {
            if (dirty) {
              onSaveAlt(alt);
              setSaved(true);
            }
          }}
          placeholder="Describe this image…"
          aria-label={`Alt text for ${item.fileName}`}
          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-[#006d6e] focus:ring-2 focus:ring-[#006d6e]/15"
        />
        {saved && !dirty && (
          <span className="flex items-center gap-1 text-[11px] text-emerald-600">
            <Check className="h-3 w-3" /> Alt text saved
          </span>
        )}
      </div>
    </div>
  );
}
