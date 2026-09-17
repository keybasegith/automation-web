import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { findUserForLogin, getUser } from "@/lib/content/repo";
import { verifyPassword } from "@/lib/content/password";
import type { ContentUser } from "@/lib/content/types";

/**
 * Sessions for the content system.
 *
 * A signed, expiring token in an httpOnly cookie: `<userId>.<expiresAt>.<hmac>`.
 * The signature proves the server issued it; the user record is then loaded on
 * every request, so deactivating an account or changing someone's role takes
 * effect immediately rather than at their next sign-in.
 *
 * Separate from the website CMS cookie (lib/admin/auth.ts) on purpose. That one
 * grants the whole website admin; this one grants content authoring at a role.
 * A single cookie doing both jobs would mean one bug hands out both.
 */

export const CONTENT_COOKIE_NAME = "kb_content_session";
export const CONTENT_SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours

/**
 * The signing key. Falls back to the CMS secret and then to a development
 * default, and warns loudly in production if neither is configured — a
 * predictable key here would let anyone mint a session for any role.
 */
function sessionSecret(): string {
  const secret =
    process.env.CONTENT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    console.error(
      "[content] CONTENT_SESSION_SECRET is not set. Session tokens are signed " +
        "with a default key, which is not safe in production."
    );
  }
  return "kb-content-session-development-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function issueToken(userId: string): string {
  const expiresAt = Date.now() + CONTENT_SESSION_MAX_AGE * 1000;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

/** The user id inside a valid, unexpired token — or null for anything else. */
function userIdFromToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresAt, signature] = parts;

  if (!safeEqual(signature, sign(`${userId}.${expiresAt}`))) return null;

  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return null;

  return userId;
}

/** Read the content session cookie off an incoming Request. */
function tokenFromRequest(req: Request): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  const prefix = `${CONTENT_COOKIE_NAME}=`;
  const entry = header.split(/;\s*/).find((c) => c.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
}

/**
 * The signed-in user for an API request, or null.
 *
 * Deactivated accounts resolve to null: a valid token for a user who has been
 * switched off is not a session.
 */
export async function currentUserFromRequest(
  req: Request
): Promise<ContentUser | null> {
  const userId = userIdFromToken(tokenFromRequest(req));
  if (!userId) return null;
  const user = await getUser(userId);
  return user?.isActive ? user : null;
}

/** The same, for a server component reading the cookie via next/headers. */
export async function currentUser(): Promise<ContentUser | null> {
  const token = (await cookies()).get(CONTENT_COOKIE_NAME)?.value;
  const userId = userIdFromToken(token);
  if (!userId) return null;
  const user = await getUser(userId);
  return user?.isActive ? user : null;
}

export interface SignInResult {
  ok: boolean;
  user?: ContentUser;
  token?: string;
  error?: string;
}

/**
 * Verify credentials.
 *
 * A wrong password and an unknown email return the same message, and an unknown
 * email still runs a hash comparison, so response timing does not reveal which
 * addresses have accounts.
 */
export async function signIn(
  email: unknown,
  password: unknown
): Promise<SignInResult> {
  if (typeof email !== "string" || typeof password !== "string") {
    return { ok: false, error: "Enter your email and password." };
  }

  const found = await findUserForLogin(email);
  const hash =
    found?.passwordHash ??
    // A well-formed hash of a value nobody knows, so the failing path costs the
    // same as the succeeding one.
    "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

  const matches = await verifyPassword(password, hash);
  if (!found || !matches) {
    return { ok: false, error: "That email and password do not match." };
  }
  if (!found.user.isActive) {
    return { ok: false, error: "This account is no longer active." };
  }

  return { ok: true, user: found.user, token: issueToken(found.user.id) };
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
