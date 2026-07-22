/**
 * Media reference resolution — client-safe (no Node imports).
 *
 * CMS content stores uploaded media as object-storage KEYS (e.g.
 * "uploads/1721650000-ab12cd34-photo.jpg"), never absolute URLs, so a future
 * CDN/domain change is a config change, not a content migration. The public
 * base URL comes from NEXT_PUBLIC_MEDIA_BASE_URL (e.g. the bucket's CDN
 * origin) and is attached only at render time.
 *
 * Legacy values — absolute URLs ("https://…") and site-relative paths
 * ("/images/…", "/media/…") — pass through untouched.
 */

export function mediaBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
  if (!base) {
    throw new Error(
      "NEXT_PUBLIC_MEDIA_BASE_URL is not set — cannot resolve media keys to URLs."
    );
  }
  return base.replace(/\/+$/, "");
}

/** True when a stored reference is an object-storage key (not a URL/path). */
export function isMediaKey(ref: string): boolean {
  return !/^([a-z][a-z0-9+.-]*:|\/)/i.test(ref);
}

/**
 * Resolve a stored media reference to a renderable URL. Null stays null;
 * URLs and site-relative paths pass through; keys get the media base URL.
 */
export function resolveMediaRef(ref: string | null | undefined): string | null {
  if (!ref) return null;
  if (!isMediaKey(ref)) return ref;
  return `${mediaBaseUrl()}/${ref.split("/").map(encodeURIComponent).join("/")}`;
}
