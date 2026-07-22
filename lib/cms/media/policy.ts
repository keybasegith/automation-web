/**
 * Upload policy for the media library — THE single place that decides which
 * file formats and sizes are accepted. The video rules are still being agreed
 * with the backend team (currently MP4/H.264+AAC only), so keeping every rule
 * here makes the eventual swap a one-file change.
 */

export const MEDIA_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

/** MP4 (H.264/AAC) only until the video policy is finalized. */
export const MEDIA_VIDEO_TYPES = ["video/mp4"];

export const MEDIA_IMAGE_MAX_BYTES = 8 * 1024 * 1024; // 8 MB
export const MEDIA_VIDEO_MAX_BYTES = 200 * 1024 * 1024; // 200 MB

/** The accept attribute for upload inputs, matching the server policy. */
export const MEDIA_ACCEPT_ATTR = [...MEDIA_IMAGE_TYPES, ...MEDIA_VIDEO_TYPES].join(",");

export function maxBytesFor(fileType: string): number {
  return fileType.startsWith("video/")
    ? MEDIA_VIDEO_MAX_BYTES
    : MEDIA_IMAGE_MAX_BYTES;
}

/**
 * Validate an upload request. Returns a human-readable rejection message, or
 * null when the file is acceptable. Deliberately explicit for video: an
 * unsupported format gets a clear explanation, never a silent failure.
 */
export function validateUpload(args: {
  fileName: string;
  fileType: string;
  fileSize: number;
}): string | null {
  const { fileName, fileType, fileSize } = args;

  if (!fileSize || fileSize <= 0) return "That file is empty.";

  if (fileType.startsWith("video/")) {
    if (!MEDIA_VIDEO_TYPES.includes(fileType) || !/\.mp4$/i.test(fileName)) {
      return (
        "Only MP4 video (H.264 video with AAC audio) is supported right now. " +
        "Please convert the file to MP4 and upload again."
      );
    }
    if (fileSize > MEDIA_VIDEO_MAX_BYTES) {
      return `Videos must be ${Math.round(MEDIA_VIDEO_MAX_BYTES / 1024 / 1024)} MB or smaller.`;
    }
    return null;
  }

  if (!MEDIA_IMAGE_TYPES.includes(fileType)) {
    return "Only JPG, PNG, WEBP, GIF, or SVG images — or MP4 video — are allowed.";
  }
  if (fileSize > MEDIA_IMAGE_MAX_BYTES) {
    return `Images must be ${Math.round(MEDIA_IMAGE_MAX_BYTES / 1024 / 1024)} MB or smaller.`;
  }
  return null;
}
