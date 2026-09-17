/**
 * Which paths are internal, and which must stay open.
 *
 * This repository serves two things from one deployment: the public Keybase
 * website, and the internal automation dashboard. Getting that line wrong in
 * either direction is a bug — protecting a marketing page breaks the website,
 * and leaving a dashboard route open is the hole this phase exists to close.
 * So the line is written down once, here, and both the proxy and the tests
 * read it from this file.
 *
 * The rule is deny-by-default within a listed prefix: a path under a protected
 * prefix requires a session unless it appears in PUBLIC_EXCEPTIONS.
 */

/**
 * Internal pages. Every route whose layout renders AppShell, plus the
 * standalone dashboard tools that render their own chrome.
 */
export const PROTECTED_PAGE_PREFIXES: readonly string[] = [
  "/dashboard",
  "/internal-ai",
  "/financial-statement-generator",
  "/net-settlement",
  "/bp-dailysettlement",
  "/finance-intelligence",
  "/smart-document-intake",
  "/secure-email-generator",
  "/client-risk-questionnaire",
  "/discrepancy-detector",
  "/compound-interest",
  "/transcript-formatter",
  "/onboarding",
];

/**
 * Internal APIs. These back the pages above and were previously callable by
 * anyone who knew the URL.
 */
export const PROTECTED_API_PREFIXES: readonly string[] = [
  "/api/internal-ai",
  "/api/financial-statements",
  "/api/clients",
  "/api/finance-intelligence",
  "/api/form-processing",
  "/api/onboarding",
  "/api/emails",
  "/api/email",
  "/api/generate-email",
  "/api/ai",
  "/api/audit",
  "/api/compliance",
  "/api/departments",
  "/api/documents",
  "/api/document-intake",
  "/api/extract-client-data",
  "/api/secure-email-generator",
];

/**
 * Paths inside a protected prefix that must stay reachable without a
 * dashboard session. Each one is here for a stated reason — nothing is
 * exempted by accident.
 */
export const PUBLIC_EXCEPTIONS: readonly { path: string; why: string }[] = [
  {
    // A client signs a document from an emailed link. They are not staff and
    // have no dashboard account; the single-use token in the URL is the
    // credential. Protecting this would break external signing outright.
    path: "/api/onboarding/sign",
    why: "external signer, authenticated by the token in the link",
  },
];

/**
 * Not listed above, and deliberately so:
 *
 *   /api/contact, /api/careers, /api/become-an-advisor, /api/trivia-lead,
 *   /api/mexico-trip, /api/business-card, /api/keybase-answer
 *       Public website endpoints. Visitors must reach these.
 *
 *   /api/website-admin-cms, /api/content
 *       Separate products with their own sessions (lib/admin/auth.ts and
 *       lib/content/session.ts). Adding a second gate here would either
 *       lock out their own users or create two ways in.
 *
 *   /login, /api/auth/*
 *       The way in. Protecting these locks everyone out.
 *
 *   /sign/onboarding/[token]
 *       The external signing page, for the reason given above.
 */

const startsWithSegment = (pathname: string, prefix: string): boolean =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export function isPublicException(pathname: string): boolean {
  return PUBLIC_EXCEPTIONS.some((exception) =>
    startsWithSegment(pathname, exception.path)
  );
}

export function isProtectedApi(pathname: string): boolean {
  if (isPublicException(pathname)) return false;
  return PROTECTED_API_PREFIXES.some((prefix) => startsWithSegment(pathname, prefix));
}

export function isProtectedPage(pathname: string): boolean {
  if (isPublicException(pathname)) return false;
  return PROTECTED_PAGE_PREFIXES.some((prefix) => startsWithSegment(pathname, prefix));
}

/** Whether a request to this path needs a dashboard session at all. */
export function requiresSession(pathname: string): boolean {
  return isProtectedApi(pathname) || isProtectedPage(pathname);
}
