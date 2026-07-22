import type { MediaItemWithUrl } from "@/lib/cms/types";

/**
 * Shared browser-side upload flow for the media library and editors:
 * presign → PUT the file straight to object storage → complete (server-side
 * verification + metadata). File bodies never pass through our API routes.
 *
 * Throws Error with a user-facing message on any failure. A signed-out
 * session redirects to the CMS login like the rest of the admin.
 */
export async function uploadMediaFile(file: File): Promise<MediaItemWithUrl> {
  const presignRes = await fetch("/api/website-admin-cms/media/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSize: file.size,
    }),
  });
  if (presignRes.status === 401) {
    window.location.href = "/website-admin-cms";
    throw new Error("Signed out.");
  }
  const presign = await presignRes.json().catch(() => ({}));
  if (!presignRes.ok) {
    throw new Error(presign?.error ?? "Could not start the upload.");
  }

  const putRes = await fetch(presign.uploadUrl as string, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  }).catch(() => null);
  if (!putRes || !putRes.ok) {
    throw new Error(
      `The file could not be uploaded to storage${putRes ? ` (HTTP ${putRes.status})` : ""}.`
    );
  }

  const completeRes = await fetch("/api/website-admin-cms/media/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: presign.key, fileName: file.name }),
  });
  if (completeRes.status === 401) {
    window.location.href = "/website-admin-cms";
    throw new Error("Signed out.");
  }
  const complete = await completeRes.json().catch(() => ({}));
  if (!completeRes.ok) {
    throw new Error(complete?.error ?? "Upload failed.");
  }
  return complete.item as MediaItemWithUrl;
}
