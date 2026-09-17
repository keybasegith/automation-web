/**
 * The reusable authorization guard for internal API routes.
 *
 * One import, one call, one shape of refusal — so a route cannot be protected
 * slightly differently from its neighbour. The proxy already turns away
 * sessionless requests before they reach a handler; this is the second check
 * that does not depend on routing configuration being right, which is what
 * keeps a mistake in the matcher from becoming an open endpoint.
 */

import {
  sessionUserFromCookies,
  sessionUserFromRequest,
  type SessionUser,
} from "@/lib/auth/session";

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = "You must be signed in.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** The signed-in user, or null. Never throws. */
export async function getApiUser(request: Request): Promise<SessionUser | null> {
  return sessionUserFromRequest(request);
}

/** The signed-in user, or a thrown UnauthorizedError. */
export async function requireApiUser(request: Request): Promise<SessionUser> {
  const user = await sessionUserFromRequest(request);
  if (!user) throw new UnauthorizedError();
  return user;
}

/**
 * The signed-in user, resolved from the request's cookies via next/headers.
 *
 * For route handlers that do not need the Request object; pairs with
 * `unauthorizedResponse()` so a handler refuses with a 401 rather than
 * throwing into a 500.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  return sessionUserFromCookies();
}

/** The standard refusal. Deliberately says nothing about why. */
export function unauthorizedResponse(): Response {
  return Response.json(
    { error: "You must be signed in." },
    { status: 401, headers: { "cache-control": "no-store" } }
  );
}

/**
 * Origin check for cookie-authenticated state-changing requests.
 *
 * SameSite=Lax already stops a cross-site POST from carrying the session
 * cookie; this is the second layer, and it is CSRF defence — never
 * authentication. A same-origin request from a signed-out browser is still
 * refused by the guard above.
 */
export function isSameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none";

  const origin = request.headers.get("origin");
  if (!origin) return true; // Non-browser caller: no ambient cookie to abuse.
  const host = request.headers.get("host");
  try {
    return Boolean(host) && new URL(origin).host === host;
  } catch {
    return false;
  }
}
