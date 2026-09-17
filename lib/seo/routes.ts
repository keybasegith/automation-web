import { SERVICE_SLUGS } from "./public-paths";

/**
 * The public route inventory: which URLs Keybase wants search engines to hold.
 *
 * One list, read by three things that must never disagree:
 *   - app/sitemap.ts, which submits these URLs;
 *   - app/robots.ts, which decides what stays out;
 *   - the canonical helpers in ./metadata, which declare the preferred URL.
 *
 * A route missing here is invisible to search; a route here that 404s is a
 * broken promise in the sitemap. Both failures are worse than the maintenance
 * cost of listing routes explicitly, which is why this is a hand-kept list
 * rather than a filesystem crawl — the app directory holds far more internal
 * tooling than public marketing, and the two must not be confused.
 */

/**
 * Marketing pages that exist at a fixed path.
 *
 * Deliberately excluded, because each is a tool rather than a page search
 * should rank: the operations dashboard, the CMS, the settlement and finance
 * tools, the document intake and email utilities, the internal AI console,
 * onboarding, login, the event microsites, and the per-person business cards.
 * INTERNAL_PREFIXES below is the machine-readable form of that same decision.
 */
export const STATIC_ROUTES = [
  "/",
  "/about",
  "/key-executives",
  "/our-advisors",
  "/become-an-advisor",
  "/ceo-message",
  // Not "/services": it redirects to the first service tab rather than
  // rendering a landing view, and a sitemap should list destinations only.
  "/careers",
  "/newsroom",
  "/contact",
  "/privacy",
  "/complaints",
  "/accessibility",
  "/media",
  "/locations/richmond-hill",
  "/tools/compound-interest-calculator",
] as const;

/**
 * The 16 service pages, each of which is also reachable under /services/<slug>.
 *
 * The standalone path is the canonical one — it is the shorter URL, it is what
 * the homepage cards and the CMS links point at, and it is what /services/[slug]
 * already names in its own canonical tag. Listing the slugs from SERVICE_BODIES
 * keeps this in step with the routes that actually exist: a body added there
 * appears in the sitemap without anyone remembering to add it twice.
 */
export function serviceRoutes(): string[] {
  return SERVICE_SLUGS.map((slug) => `/${slug}`);
}

/**
 * Path prefixes that must never be indexed, whatever else happens.
 *
 * These are the internal surfaces of the app: staff tooling, authenticated
 * areas, API handlers, and the single-purpose microsites that carry no search
 * intent. robots.ts turns each into a Disallow rule, so a crawler is told to
 * stay out even if a link to one of them leaks into the wild.
 */
export const INTERNAL_PREFIXES = [
  "/api/",
  "/contact/thank-you",
  "/search",
  "/dashboard",
  "/website-admin-cms",
  "/login",
  "/onboarding",
  "/content",
  "/internal-ai",
  "/keybase-answer",
  "/finance-intelligence",
  "/financial-statement-generator",
  "/bp-dailysettlement",
  "/net-settlement",
  "/discrepancy-detector",
  "/smart-document-intake",
  "/secure-email-generator",
  "/client-risk-questionnaire",
  "/compound-calculator",
  "/compound-interest",
  "/transcript-formatter",
  "/testapi",
  "/sign",
  "/people/preview",
  // Event microsites and personal cards: real pages, but not search surfaces.
  "/mexico-trip",
  "/bike-fest",
  "/trivia-game",
  "/trivia-game-form",
  "/world-cup-challenge",
  "/tradeshow-booth-connect-qr",
  "/businesscard-",
  "/profile-jleung",
  "/wealth-offering",
] as const;

/** Whether a path belongs to an internal surface that must stay unindexed. */
export function isInternalPath(path: string): boolean {
  return INTERNAL_PREFIXES.some((prefix) => path.startsWith(prefix));
}
