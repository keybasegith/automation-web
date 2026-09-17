import { randomUUID } from "crypto";
import { sanitizeFileName } from "@/lib/cms/validation";
import { getMediaObjectStore } from "@/lib/cms/media/objectStore";
import {
  attachmentMaxBytesFor,
  validateAttachment,
} from "@/lib/content-calendar/attachmentPolicy";
import {
  deleteAttachmentRow,
  getAttachmentRow,
  insertAttachment,
  recordEvent,
  type Actor,
} from "@/lib/content-calendar/repo";
import type { CalendarAttachment } from "@/lib/content-calendar/types";

/**
 * File attachments on a calendar item.
 *
 * Same two-step flow the media library uses (lib/cms/mediaRepo.ts): the server
 * validates the request and issues a short-lived presigned PUT, the browser
 * uploads the body straight to storage, then the server verifies what actually
 * landed before writing the metadata row. Bodies never pass through a route
 * handler, which is what keeps a 200 MB video from having to fit in a
 * serverless function's request limit.
 *
 * Storage is the same S3-compatible bucket the website media library uses
 * (MEDIA_S3_*, MinIO locally) — one storage module for the whole repository —
 * but under its own `calendar/` key prefix, and read back through presigned
 * GET rather than the public media URL, because these are internal working
 * files, not published assets.
 */

const KEY_PREFIX = "calendar";

/** Only keys this module could have issued. Never trust a client-supplied path. */
const ISSUED_KEY = /^calendar\/[0-9a-f-]{36}\/[0-9]+-[0-9a-f]{8}-[^/]+$/;

export interface PendingAttachmentUpload {
  key: string;
  uploadUrl: string;
  expiresInSeconds: number;
  maxBytes: number;
}

export type BeginResult =
  | { ok: true; upload: PendingAttachmentUpload }
  | { ok: false; error: string };

/** Validate an upload request and hand back a presigned PUT URL. */
export async function beginAttachmentUpload(args: {
  itemId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}): Promise<BeginResult> {
  const rejection = validateAttachment(args);
  if (rejection) return { ok: false, error: rejection };

  const safe = sanitizeFileName(args.fileName || "file");
  const key = `${KEY_PREFIX}/${args.itemId}/${Date.now()}-${randomUUID().slice(0, 8)}-${safe}`;
  const { uploadUrl, expiresInSeconds } = await getMediaObjectStore().presignUpload({
    key,
    contentType: args.fileType,
  });

  return {
    ok: true,
    upload: {
      key,
      uploadUrl,
      expiresInSeconds,
      maxBytes: attachmentMaxBytesFor(args.fileType),
    },
  };
}

export type CompleteResult =
  | { ok: true; attachment: CalendarAttachment }
  | { ok: false; error: string };

/**
 * Verify the uploaded object and record it. Everything is re-checked here
 * against what is really in storage — the browser's claimed size and type were
 * only ever a courtesy check.
 */
export async function completeAttachmentUpload(args: {
  itemId: string;
  key: string;
  fileName: string;
  actor: Actor;
}): Promise<CompleteResult> {
  if (!ISSUED_KEY.test(args.key) || !args.key.startsWith(`${KEY_PREFIX}/${args.itemId}/`)) {
    return { ok: false, error: "Unknown upload key." };
  }

  const store = getMediaObjectStore();
  const head = await store.head(args.key);
  if (!head) {
    return { ok: false, error: "The upload did not reach storage. Please try again." };
  }

  const rejection = validateAttachment({
    fileName: args.fileName,
    fileType: head.contentType,
    fileSize: head.contentLength,
  });
  if (rejection) {
    // What landed is not what was promised: take it back out of the bucket.
    await store.delete(args.key).catch(() => {
      /* the metadata row is what matters; a stray object is not worth failing on */
    });
    return { ok: false, error: rejection };
  }

  const attachment = await insertAttachment({
    itemId: args.itemId,
    fileKey: args.key,
    fileName: sanitizeFileName(args.fileName),
    contentType: head.contentType,
    sizeBytes: head.contentLength,
    actor: args.actor,
  });

  return { ok: true, attachment };
}

/** A short-lived signed URL that downloads the file under its own name. */
export async function attachmentDownloadUrl(
  itemId: string,
  attachmentId: string
): Promise<{ url: string; expiresInSeconds: number; fileName: string } | null> {
  const row = await getAttachmentRow(itemId, attachmentId);
  if (!row) return null;

  const { url, expiresInSeconds } = await getMediaObjectStore().presignDownload({
    key: row.file_key,
    downloadName: row.file_name,
  });
  return { url, expiresInSeconds, fileName: row.file_name };
}

/** Remove the metadata row, then the object. Returns false if it was already gone. */
export async function removeAttachment(
  itemId: string,
  attachmentId: string,
  actor: Actor
): Promise<boolean> {
  const row = await deleteAttachmentRow(itemId, attachmentId);
  if (!row) return false;

  await getMediaObjectStore()
    .delete(row.file_key)
    .catch(() => {
      /* The row is gone, so the file is unreachable from the app either way.
         An orphaned object is a storage-cleanup problem, not a user-facing one. */
    });

  await recordEvent({
    itemId,
    kind: "attachment_removed",
    note: row.file_name,
    actor,
  });
  return true;
}
