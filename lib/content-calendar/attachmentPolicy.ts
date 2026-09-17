/**
 * What may be attached to a calendar item — the single place that decides.
 *
 * Deliberately wider than the website media policy (lib/cms/media/policy.ts):
 * that one guards what can be published to the public site, this one guards a
 * working folder, where a brief is a .docx and a deck is a .pptx. Both are
 * enforced server-side; the browser only reads these to set `accept` and to
 * refuse an oversized file before spending the upload.
 */

export const ATTACHMENT_TYPES: readonly string[] = [
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/heic",
  // Video / audio
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/markdown",
  // Design / packaged assets
  "application/zip",
  "application/x-zip-compressed",
];

export const ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024; // 50 MB
export const ATTACHMENT_VIDEO_MAX_BYTES = 200 * 1024 * 1024; // 200 MB

/** The `accept` attribute for the file input, matching the server policy. */
export const ATTACHMENT_ACCEPT_ATTR = ATTACHMENT_TYPES.join(",");

export const attachmentMaxBytesFor = (fileType: string): number =>
  fileType.startsWith("video/") ? ATTACHMENT_VIDEO_MAX_BYTES : ATTACHMENT_MAX_BYTES;

const mb = (bytes: number) => Math.round(bytes / 1024 / 1024);

/** A human-readable rejection, or null when the file is acceptable. */
export function validateAttachment(args: {
  fileName: string;
  fileType: string;
  fileSize: number;
}): string | null {
  const { fileType, fileSize } = args;

  if (!fileSize || fileSize <= 0) return "That file is empty.";
  if (!ATTACHMENT_TYPES.includes(fileType)) {
    return (
      `${fileType || "That file type"} can't be attached. Images, video, PDF, ` +
      "Office documents, text, and ZIP archives are accepted."
    );
  }
  const max = attachmentMaxBytesFor(fileType);
  if (fileSize > max) {
    return `That file is ${mb(fileSize)} MB — the limit is ${mb(max)} MB.`;
  }
  return null;
}

/** Compact size for the UI. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
