/**
 * Shared request handling for the client-onboarding API routes.
 */

import { getSessionUser, isSameOrigin, unauthorizedResponse } from "@/lib/auth/guard";
import { isServerSupabaseConfigured, SupabaseConfigError } from "@/lib/supabaseClient";

import { reviveDraft, type OnboardingDraft } from "./draft";
import { OnboardingLockedError } from "./repo";

export const json = (body: unknown, status = 200) => Response.json(body, { status });

/**
 * Internal routes: a dashboard session, and a same-origin browser request
 * (these write client records, so a cross-site form post must not reach them).
 */
export async function guardInternal(request: Request): Promise<Response | null> {
  if (!(await getSessionUser())) return unauthorizedResponse();
  if (request.method !== "GET" && !isSameOrigin(request)) return json({ error: "Cross-site request refused." }, 403);
  return null;
}

/** 503 when the database is not set up at all. */
export function requireStorage(): Response | null {
  return isServerSupabaseConfigured()
    ? null
    : json({ error: "Client storage is not configured on this deployment.", code: "storage_unavailable" }, 503);
}

export async function readJson(request: Request): Promise<Record<string, unknown> | Response> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : json({ error: "Expected a JSON object." }, 400);
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }
}

export function draftFrom(body: Record<string, unknown>): OnboardingDraft | Response {
  return reviveDraft(body.draft) ?? json({ error: "The onboarding answers are missing or malformed." }, 400);
}

/**
 * Maps a thrown error to a response. An unreachable database is a 503 the
 * wizard can explain ("not saved — storage unavailable"), not a 500.
 */
export function errorResponse(err: unknown, context: string): Response {
  if (err instanceof OnboardingLockedError) return json({ error: err.message, code: "locked" }, 409);
  if (err instanceof SupabaseConfigError) return json({ error: err.message, code: "storage_unavailable" }, 503);
  const message = err instanceof Error ? err.message : String(err);
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT/i.test(message)) {
    console.error(`[client-onboarding] ${context}: storage unreachable`, err);
    return json({ error: "Client storage could not be reached. Nothing was saved.", code: "storage_unavailable" }, 503);
  }
  console.error(`[client-onboarding] ${context}:`, err);
  return json({ error: message }, 500);
}

export const clientMeta = (request: Request) => ({
  ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  userAgent: request.headers.get("user-agent"),
});
