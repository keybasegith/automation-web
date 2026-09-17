import type { SessionUser } from "@/lib/auth/session";
import { workspaceUser } from "@/lib/auth/workspace";

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = "You must be signed in.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Shared workspace actor; dashboard access does not require a session. */
export async function getApiUser(_request: Request): Promise<SessionUser> {
  void _request; // Preserve the existing route-handler call signature.
  return workspaceUser();
}

export async function requireApiUser(_request: Request): Promise<SessionUser> {
  void _request; // Preserve the existing route-handler call signature.
  return workspaceUser();
}

export async function getSessionUser(): Promise<SessionUser> {
  return workspaceUser();
}

/** The standard refusal. Deliberately says nothing about why. */
export function unauthorizedResponse(): Response {
  return Response.json(
    { error: "You must be signed in." },
    { status: 401, headers: { "cache-control": "no-store" } }
  );
}

/** Reject cross-site browser actions even though workspace access is public. */
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
