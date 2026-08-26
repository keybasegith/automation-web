/**
 * Domain-safe URL helpers for structured data and, later, canonical metadata.
 *
 * Keybase's production domain has not been chosen yet. Everything here is built
 * so that the day it is, setting one environment variable turns absolute URLs on
 * across every schema builder — and until then, builders omit URL-shaped fields
 * rather than emitting a guess.
 *
 *   NEXT_PUBLIC_SITE_URL=https://<production-domain>
 *
 * Deliberately absent: any fallback to VERCEL_URL, NEXT_PUBLIC_VERCEL_URL, or a
 * hardcoded staging host. A preview deployment URL is not a stable identity for
 * an organization, and a schema @id that points at one is worse than no @id at
 * all — it is a permanent claim about a temporary address.
 */

/** Deploy-preview hosts that must never become a permanent entity identifier. */
const EPHEMERAL_HOSTS = [".vercel.app", ".netlify.app", "localhost", "127.0.0.1"];

let warned = false;

/**
 * The configured production origin, without a trailing slash, or `null` when
 * none is set (or when what is set is an ephemeral deploy host).
 */
export function siteUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    warnOnce(`NEXT_PUBLIC_SITE_URL is not a valid URL: ${raw}`);
    return null;
  }

  if (EPHEMERAL_HOSTS.some((h) => parsed.hostname === h || parsed.hostname.endsWith(h))) {
    warnOnce(
      `NEXT_PUBLIC_SITE_URL points at a deploy-preview host (${parsed.hostname}). ` +
        "Structured data will omit absolute URLs rather than treat it as a permanent identity.",
    );
    return null;
  }

  return parsed.origin;
}

/** `/about` → `https://…/about`, or `undefined` when no production origin is set. */
export function absoluteUrl(path: string): string | undefined {
  const base = siteUrl();
  if (!base) return undefined;
  return new URL(path, base + "/").toString();
}

/**
 * A stable `@id` for a sitewide entity, e.g. `entityId("organization")` →
 * `https://…/#organization`. Undefined until a production origin exists — never
 * a random UUID, which would change identity on every build.
 */
export function entityId(fragment: string): string | undefined {
  const base = siteUrl();
  return base ? `${base}/#${fragment}` : undefined;
}

function warnOnce(message: string) {
  if (warned || process.env.NODE_ENV === "production") return;
  warned = true;
  console.warn(`[seo] ${message}`);
}

/** Test-only: clears the one-shot warning latch. */
export function __resetSiteUrlWarning() {
  warned = false;
}
