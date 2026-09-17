import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * Sessions for the automation dashboard.
 *
 * A signed, expiring token in an httpOnly cookie: `<userId>.<expiresAt>.<hmac>`
 * — the same construction the content system already uses
 * (lib/content/session.ts), because it is proven here and needs no dependency.
 * The signature proves this server issued the token; the expiry is checked on
 * every request; the cookie is never readable from JavaScript.
 *
 * This is the ONLY place a dashboard session is minted or verified. Routes,
 * pages, and the proxy all come through the functions below, so there is one
 * definition of "signed in" and one place to change when SSO replaces it.
 *
 * Deliberately a separate cookie from the website CMS (lib/admin/auth.ts) and
 * the content system, following the reasoning already recorded there: one
 * cookie doing several jobs means one bug hands out several grants.
 */

export const SESSION_COOKIE_NAME = "kb_dashboard_session";

/**
 * Eight hours — a working day. Long enough that staff are not re-typing a
 * password, short enough to bound a stolen token, which matters because a
 * stateless token cannot be revoked before it expires.
 */
export const SESSION_MAX_AGE = 60 * 60 * 8;

/** The identity a verified session resolves to. */
export interface SessionUser {
  id: string;
  email: string;
  role: "admin" | "advisor";
  name: string;
}

const DEV_SECRET = "kb-dashboard-session-development-secret";

/**
 * The signing key.
 *
 * A predictable key here would let anyone mint a session for anyone, so in
 * production a missing secret is fatal rather than a warning: the server
 * refuses to issue or accept tokens instead of accepting forged ones.
 */
function sessionSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SESSION_SECRET is not set. Refusing to sign dashboard sessions with a default key."
    );
  }
  return DEV_SECRET;
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Mint a token for a user who has just proved who they are. */
export function issueSessionToken(userId: string, now = Date.now()): string {
  const expiresAt = now + SESSION_MAX_AGE * 1000;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

/**
 * The user id inside a valid, unexpired token — or null for anything else:
 * a forged signature, a tampered expiry, a malformed string, or a token that
 * has run out. Never throws, so a bad cookie reads as "signed out".
 */
export function userIdFromToken(
  token: string | null | undefined,
  now = Date.now()
): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresAt, signature] = parts;
  if (!userId || !expiresAt || !signature) return null;

  let expected: string;
  try {
    expected = sign(`${userId}.${expiresAt}`);
  } catch {
    // No usable secret in production: accept nothing.
    return null;
  }
  if (!safeEqual(signature, expected)) return null;

  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || expiry <= now) return null;

  return userId;
}

/** Read the dashboard session cookie off an incoming Request. */
export function sessionTokenFromRequest(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const prefix = `${SESSION_COOKIE_NAME}=`;
  const entry = header.split(/;\s*/).find((c) => c.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
}

/** Cookie attributes shared by the sign-in and sign-out routes. */
export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

/** True when a session cookie is present and valid. Used by the proxy. */
export function requestHasValidSession(request: Request): boolean {
  return userIdFromToken(sessionTokenFromRequest(request)) !== null;
}

/** The signed-in user for an API request, or null. */
export async function sessionUserFromRequest(
  request: Request
): Promise<SessionUser | null> {
  const userId = userIdFromToken(sessionTokenFromRequest(request));
  if (!userId) return null;
  const { findUserById } = await import("@/lib/auth/users");
  return findUserById(userId);
}

/** The same, for a server component reading the cookie via next/headers. */
export async function sessionUserFromCookies(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const userId = userIdFromToken(token);
  if (!userId) return null;
  const { findUserById } = await import("@/lib/auth/users");
  return findUserById(userId);
}
