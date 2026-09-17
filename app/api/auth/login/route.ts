import { NextResponse } from "next/server";

import { isSameOrigin } from "@/lib/auth/guard";
import {
  issueSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
} from "@/lib/auth/session";
import { isAuthConfigured, verifyCredentials } from "@/lib/auth/users";

/**
 * POST /api/auth/login
 *
 * Verifies credentials server-side and sets the httpOnly session cookie. The
 * browser never sees the token's contents, the signing secret, or the stored
 * password hash — only whether it worked and the display name to show.
 *
 * Every failure returns the same message and the same status. Nothing here
 * reveals whether an address has an account.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_FAILURE = "Incorrect email or password.";
const MAX_BODY_BYTES = 4 * 1024;

const refuse = (status: number, error: string) =>
  NextResponse.json({ error }, { status, headers: { "cache-control": "no-store" } });

export async function POST(request: Request) {
  // Cookie-setting endpoint: refuse a cross-site submission outright.
  if (!isSameOrigin(request)) return refuse(403, GENERIC_FAILURE);

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return refuse(400, GENERIC_FAILURE);
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return refuse(400, GENERIC_FAILURE);
    body = JSON.parse(text);
  } catch {
    return refuse(400, GENERIC_FAILURE);
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return refuse(400, GENERIC_FAILURE);
  }

  const { email, password } = body as Record<string, unknown>;
  const result = await verifyCredentials(email, password);
  if (!result.ok || !result.user) {
    if (!isAuthConfigured() && process.env.NODE_ENV === "production") {
      console.error(
        "[auth] Sign-in refused: INTERNAL_ADMIN_PASSWORD_HASH is not configured."
      );
    }
    return refuse(401, GENERIC_FAILURE);
  }

  const response = NextResponse.json(
    {
      // Safe display fields only. No token, no hash, no secret.
      user: {
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
    },
    { headers: { "cache-control": "no-store" } }
  );
  response.cookies.set(
    SESSION_COOKIE_NAME,
    issueSessionToken(result.user.id),
    sessionCookieOptions(SESSION_MAX_AGE)
  );
  return response;
}
