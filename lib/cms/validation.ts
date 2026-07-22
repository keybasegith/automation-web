/**
 * Shared, framework-free validation helpers used by both the admin UI (for
 * friendly inline messages) and the server routes (as the real gate). Every
 * mutation is validated server-side — the client checks are only for UX.
 */

/** Result of validating one value. */
export type FieldResult = { ok: true } | { ok: false; message: string };

const ok: FieldResult = { ok: true };
const fail = (message: string): FieldResult => ({ ok: false, message });

export function required(value: string, label = "This field"): FieldResult {
  return value.trim().length > 0 ? ok : fail(`${label} is required.`);
}

export function maxLength(
  value: string,
  max: number,
  label = "This field"
): FieldResult {
  return value.length <= max
    ? ok
    : fail(`${label} must be ${max} characters or fewer.`);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function email(value: string, label = "Email"): FieldResult {
  if (value.trim().length === 0) return ok; // optional unless paired with required()
  return EMAIL_RE.test(value.trim()) ? ok : fail(`${label} is not a valid email address.`);
}

/**
 * Validate a link that an admin typed. Accepts:
 *  - site-relative paths beginning with `/` (e.g. /about)
 *  - in-page anchors (`#`)
 *  - absolute http(s) URLs
 *  - mailto: and tel: links
 * Rejects dangerous schemes such as javascript:, data:, and vbscript: that
 * could inject script when rendered into an href.
 */
export function safeUrl(value: string, label = "Link"): FieldResult {
  const v = value.trim();
  if (v.length === 0) return ok; // optional; pair with required() where needed
  if (v === "#" || v.startsWith("/") || v.startsWith("#")) return ok;

  const lower = v.toLowerCase();
  const dangerous = ["javascript:", "data:", "vbscript:", "file:"];
  if (dangerous.some((scheme) => lower.startsWith(scheme))) {
    return fail(`${label} uses a blocked or unsafe address.`);
  }

  if (lower.startsWith("mailto:") || lower.startsWith("tel:")) return ok;

  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    try {
      new URL(v);
      return ok;
    } catch {
      return fail(`${label} is not a valid web address.`);
    }
  }

  return fail(
    `${label} must start with "/", "#", "http://", "https://", "mailto:", or "tel:".`
  );
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slug(value: string, label = "Slug"): FieldResult {
  const v = value.trim();
  if (v.length === 0) return fail(`${label} is required.`);
  return SLUG_RE.test(v)
    ? ok
    : fail(`${label} may only contain lowercase letters, numbers, and hyphens.`);
}

/** Sanitize a supplied filename into something safe for the filesystem. */
export function sanitizeFileName(name: string): string {
  return (
    name
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .replace(/^\.+/, "") // no leading dots (avoids hidden / traversal names)
      .slice(0, 120) || "file"
  );
}

/**
 * Run a set of checks and return the first failure message, or null if all
 * pass. Handy for building a single error string in a route.
 */
export function firstError(...results: FieldResult[]): string | null {
  for (const r of results) if (!r.ok) return r.message;
  return null;
}
