import { randomUUID } from "crypto";
import { sanitizeFileName } from "@/lib/cms/validation";
import { getCmsBackend } from "@/lib/cms/storage";
import { getMediaObjectStore } from "@/lib/cms/media/objectStore";
import { maxBytesFor, validateUpload } from "@/lib/cms/media/policy";
import { resolveMediaRef } from "@/lib/cms/media/url";
import type { MediaItem, MediaItemWithUrl } from "@/lib/cms/types";

/**
 * Media library — metadata in the CMS backend (Postgres in production),
 * binaries in S3-compatible object storage (lib/cms/media/objectStore.ts).
 *
 * Uploads are presigned: beginUpload() validates the request and hands the
 * browser a short-lived PUT URL; completeUpload() verifies the object that
 * actually landed in storage (size and type, server-side) before the metadata
 * row is created. An object that fails verification is deleted again.
 */

function withUrl(item: MediaItem): MediaItemWithUrl {
  return { ...item, fileUrl: resolveMediaRef(item.fileKey) ?? item.fileKey };
}

export async function listMedia(): Promise<MediaItemWithUrl[]> {
  return (await getCmsBackend().listMedia()).map(withUrl);
}

export async function getMedia(id: string): Promise<MediaItemWithUrl | null> {
  const item = await getCmsBackend().getMedia(id);
  return item ? withUrl(item) : null;
}

export interface PendingUpload {
  key: string;
  uploadUrl: string;
  expiresInSeconds: number;
  maxBytes: number;
}

/** Validate an upload request and issue a presigned PUT URL for it. */
export async function beginUpload(args: {
  fileName: string;
  fileType: string;
  fileSize: number;
}): Promise<{ ok: true; upload: PendingUpload } | { ok: false; error: string }> {
  const rejection = validateUpload(args);
  if (rejection) return { ok: false, error: rejection };

  const safe = sanitizeFileName(args.fileName || "file");
  const key = `uploads/${Date.now()}-${randomUUID().slice(0, 8)}-${safe}`;
  const { uploadUrl, expiresInSeconds } = await getMediaObjectStore().presignUpload({
    key,
    contentType: args.fileType,
  });
  return {
    ok: true,
    upload: { key, uploadUrl, expiresInSeconds, maxBytes: maxBytesFor(args.fileType) },
  };
}

/**
 * Verify the uploaded object server-side and record its metadata. The browser
 * calls this after the presigned PUT succeeds.
 */
export async function completeUpload(args: {
  key: string;
  fileName: string;
  uploadedBy: string;
  altText?: string;
}): Promise<{ ok: true; item: MediaItemWithUrl } | { ok: false; error: string }> {
  // Only accept keys this repo could have issued — never arbitrary paths.
  if (!/^uploads\/[0-9]+-[0-9a-f]{8}-[^/]+$/.test(args.key)) {
    return { ok: false, error: "Unknown upload key." };
  }

  const objectStore = getMediaObjectStore();
  const head = await objectStore.head(args.key);
  if (!head) {
    return { ok: false, error: "The upload did not reach storage. Please try again." };
  }

  const rejection = validateUpload({
    fileName: args.fileName,
    fileType: head.contentType,
    fileSize: head.contentLength,
  });
  if (rejection) {
    // The object that landed violates policy (size/type) — remove it.
    await objectStore.delete(args.key).catch(() => {});
    return { ok: false, error: rejection };
  }

  const item: MediaItem = {
    id: randomUUID(),
    fileKey: args.key,
    fileName: args.fileName,
    fileType: head.contentType,
    fileSize: head.contentLength,
    altText: args.altText ?? "",
    uploadedBy: args.uploadedBy,
    uploadedAt: new Date().toISOString(),
  };
  await getCmsBackend().insertMedia(item);
  return { ok: true, item: withUrl(item) };
}

export async function updateMediaAlt(
  id: string,
  altText: string
): Promise<MediaItemWithUrl | null> {
  const backend = getCmsBackend();
  const item = await backend.getMedia(id);
  if (!item) return null;
  const updated: MediaItem = { ...item, altText };
  await backend.updateMedia(updated);
  return withUrl(updated);
}

/** Remove the metadata row and the stored object. */
export async function deleteMedia(id: string): Promise<void> {
  const backend = getCmsBackend();
  const item = await backend.getMedia(id);
  if (!item) return;
  await backend.deleteMedia(id);
  // Best-effort: a leftover object is orphaned storage, not broken content.
  await getMediaObjectStore()
    .delete(item.fileKey)
    .catch((err) => console.error("[cms] media object delete failed:", err));
}
