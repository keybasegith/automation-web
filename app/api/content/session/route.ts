import { NextResponse } from "next/server";
import {
  CONTENT_COOKIE_NAME,
  CONTENT_SESSION_MAX_AGE,
  currentUserFromRequest,
  sessionCookieOptions,
  signIn,
} from "@/lib/content/session";
import { readJson, serverError } from "@/lib/content/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The content system's session endpoint.
 *   GET    → who is signed in (and at what role)
 *   POST   → sign in
 *   DELETE → sign out
 */

export async function GET(req: Request) {
  try {
    const user = await currentUserFromRequest(req);
    if (!user) return NextResponse.json({ authenticated: false });
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        personId: user.personId,
        authorTitle: user.authorTitle,
      },
    });
  } catch (err) {
    return serverError(err, "Could not check your session.");
  }
}

export async function POST(req: Request) {
  const parsed = await readJson(req);
  if ("response" in parsed) return parsed.response;

  try {
    const result = await signIn(parsed.body.email, parsed.body.password);
    if (!result.ok || !result.user || !result.token) {
      return NextResponse.json(
        { error: result.error ?? "Sign in failed." },
        { status: 401 }
      );
    }

    const res = NextResponse.json({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
    });
    res.cookies.set(
      CONTENT_COOKIE_NAME,
      result.token,
      sessionCookieOptions(CONTENT_SESSION_MAX_AGE)
    );
    return res;
  } catch (err) {
    return serverError(err, "Could not sign you in.");
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CONTENT_COOKIE_NAME, "", sessionCookieOptions(0));
  return res;
}
