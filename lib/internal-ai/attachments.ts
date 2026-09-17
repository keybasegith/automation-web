/**
 * What may be attached to a message, and how big it may be.
 *
 * Deliberately isomorphic — no Node or DOM imports — because the browser and
 * the route must apply exactly one policy. The client copy is UX: it explains
 * a rejection before the upload starts. The server copy is the enforcement;
 * nothing is trusted because the browser allowed it.
 *
 * Browsers report MIME types unevenly (a .heic or .csv often arrives with an
 * empty type), so a file is accepted when EITHER its MIME type or its
 * extension is on the list.
 */

export type AttachmentKind = "image" | "document";

interface AcceptedType {
  kind: AttachmentKind;
  mimeTypes: readonly string[];
  extensions: readonly string[];
}

const ACCEPTED_TYPES: readonly AcceptedType[] = [
  {
    kind: "image",
    mimeTypes: [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/webp",
      "image/bmp",
      "image/tiff",
      "image/heic",
      "image/heif",
    ],
    extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp", "tif", "tiff", "heic", "heif"],
  },
  {
    kind: "document",
    mimeTypes: [
      "application/pdf",
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/json",
      "application/rtf",
      "text/rtf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.oasis.opendocument.text",
      "application/vnd.oasis.opendocument.spreadsheet",
      // Vector art is accepted as a document, never previewed as an image:
      // an <img> will not run script, but nothing here needs to render it.
      "image/svg+xml",
    ],
    extensions: [
      "pdf", "txt", "md", "markdown", "csv", "json", "rtf",
      "doc", "docx", "xls", "xlsx", "xlsm", "ppt", "pptx",
      "odt", "ods", "svg",
    ],
  },
];

/** The `accept` attribute for the file input. Mirrors the list above. */
export const ATTACHMENT_ACCEPT_ATTR = [
  "image/*",
  ...ACCEPTED_TYPES.flatMap((t) => t.extensions.map((ext) => `.${ext}`)),
].join(",");

export interface AttachmentLimits {
  maxCount: number;
  maxBytesPerFile: number;
  maxTotalBytes: number;
}

/** Metadata every layer agrees on. Bytes are carried separately. */
export interface AttachmentDescriptor {
  name: string;
  mimeType: string;
  sizeBytes: number;
}

/** A descriptor plus its content, held only for the life of one request. */
export interface AttachmentPayload extends AttachmentDescriptor {
  kind: AttachmentKind;
  bytes: Uint8Array;
}

/** What crosses a boundary when only metadata is needed. */
export interface AttachmentSummary extends AttachmentDescriptor {
  kind: AttachmentKind;
}

export function fileExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  if (idx < 0 || idx === name.length - 1) return "";
  return name.slice(idx + 1).toLowerCase();
}

/** Short uppercase badge for a file with no thumbnail. */
export function extensionLabel(name: string): string {
  return fileExtension(name).slice(0, 4).toUpperCase() || "FILE";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** The kind of an accepted file, or null when the type is not accepted. */
export function classifyAttachment(name: string, mimeType: string): AttachmentKind | null {
  const mime = mimeType.trim().toLowerCase();
  const ext = fileExtension(name);
  for (const type of ACCEPTED_TYPES) {
    if (mime && type.mimeTypes.includes(mime)) return type.kind;
    if (ext && type.extensions.includes(ext)) return type.kind;
  }
  return null;
}

export type AttachmentRejection =
  | { reason: "type"; message: string }
  | { reason: "empty"; message: string }
  | { reason: "file_size"; message: string }
  | { reason: "total_size"; message: string }
  | { reason: "count"; message: string };

export type AttachmentCheck =
  | { ok: true; kind: AttachmentKind }
  | { ok: false; rejection: AttachmentRejection };

/**
 * Check one file against the limits, given what is already attached.
 *
 * `acceptedCount` and `acceptedBytes` describe the files ahead of this one, so
 * a caller adding several at once can apply the batch limits correctly.
 */
export function checkAttachment(
  file: AttachmentDescriptor,
  limits: AttachmentLimits,
  accepted: { count: number; bytes: number } = { count: 0, bytes: 0 }
): AttachmentCheck {
  const kind = classifyAttachment(file.name, file.mimeType);
  if (!kind) {
    return {
      ok: false,
      rejection: {
        reason: "type",
        message: `${file.name} — that file type is not supported. Attach an image or a document.`,
      },
    };
  }
  if (file.sizeBytes <= 0) {
    return {
      ok: false,
      rejection: { reason: "empty", message: `${file.name} — that file is empty.` },
    };
  }
  if (accepted.count >= limits.maxCount) {
    return {
      ok: false,
      rejection: {
        reason: "count",
        message: `${file.name} — up to ${limits.maxCount} files can be attached to one message.`,
      },
    };
  }
  if (file.sizeBytes > limits.maxBytesPerFile) {
    return {
      ok: false,
      rejection: {
        reason: "file_size",
        message: `${file.name} — larger than ${formatBytes(limits.maxBytesPerFile)}.`,
      },
    };
  }
  if (accepted.bytes + file.sizeBytes > limits.maxTotalBytes) {
    return {
      ok: false,
      rejection: {
        reason: "total_size",
        message: `${file.name} — that would take the message past ${formatBytes(limits.maxTotalBytes)} in total.`,
      },
    };
  }
  return { ok: true, kind };
}

export const toSummary = (attachment: AttachmentPayload): AttachmentSummary => ({
  name: attachment.name,
  mimeType: attachment.mimeType,
  sizeBytes: attachment.sizeBytes,
  kind: attachment.kind,
});
