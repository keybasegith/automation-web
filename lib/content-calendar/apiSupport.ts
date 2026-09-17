import { getSessionUser, isSameOrigin, unauthorizedResponse } from "@/lib/auth/guard";
import { getDepartment } from "@/lib/departments";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import type { Department } from "@/lib/departments";
import type { Actor } from "@/lib/content-calendar/repo";

/**
 * The checks every calendar route makes, in one place: database configured,
 * signed in, real department, and — for anything that writes — a same-origin
 * request.
 *
 * Routes call `openCalendar` and either get a context or a Response to return
 * as-is, so no route can accidentally run one check and skip another.
 */

export interface CalendarContext {
  department: Department;
  actor: Actor;
}

export type Opened =
  | { ok: true; ctx: CalendarContext }
  | { ok: false; response: Response };

const problem = (error: string, status: number): Response =>
  Response.json({ error }, { status, headers: { "cache-control": "no-store" } });

export async function openCalendar(
  request: Request,
  slug: string,
  options: { write?: boolean } = {}
): Promise<Opened> {
  if (!isServerSupabaseConfigured()) {
    return { ok: false, response: problem("Database is not configured.", 500) };
  }
  if (options.write && !isSameOrigin(request)) {
    return { ok: false, response: problem("Request refused.", 403) };
  }

  const user = await getSessionUser();
  if (!user) return { ok: false, response: unauthorizedResponse() };

  const department = getDepartment(slug);
  if (!department) {
    return { ok: false, response: problem(`Unknown department: ${slug}`, 404) };
  }

  return {
    ok: true,
    ctx: { department, actor: { id: user.id, name: user.name } },
  };
}

/**
 * Who to credit for the action.
 *
 * Everyone signs in through one shared internal account today
 * (lib/auth/users.ts), so the session name is "Admin" for all of them. The UI
 * asks each person for their name once and sends it with every write; that is
 * what goes in the history. The session id is stored alongside it, so when SSO
 * arrives the id becomes the record and this argument can go away.
 */
export function actorFrom(ctx: CalendarContext, suppliedName: unknown): Actor {
  const name =
    typeof suppliedName === "string" && suppliedName.trim()
      ? suppliedName.trim().slice(0, 60)
      : ctx.actor.name;
  return { id: ctx.actor.id, name };
}

/** JSON body, or null when the request did not carry parseable JSON. */
export async function readJson<T = Record<string, unknown>>(
  request: Request
): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export const badRequest = (error: string): Response => problem(error, 400);
export const notFound = (error = "Not found."): Response => problem(error, 404);
export const conflict = (error: string): Response => problem(error, 409);

/** Turn a thrown error into a response without leaking a stack trace. */
export function serverError(err: unknown): Response {
  const detail = err instanceof Error ? err.message : String(err);
  return problem(detail || "Something went wrong.", 500);
}

export const jsonOk = (payload: unknown, status = 200): Response =>
  Response.json(payload, { status, headers: { "cache-control": "no-store" } });
