import type { UserRow } from "@/lib/db/types";
import { UnauthorizedError } from "@/lib/auth/guard";
import {
  sessionUserFromCookies,
  sessionUserFromRequest,
  type SessionUser,
} from "@/lib/auth/session";

/**
 * The acting user.
 *
 * This used to return a hardcoded mock. It now resolves the real dashboard
 * session, and it is the single function the rest of the application asks
 * "who is this?" — routes, server components, and audit attribution all come
 * through here, so session parsing is defined once (lib/auth/session.ts) and
 * duplicated nowhere.
 *
 * `getCurrentUser()` reads the request's cookies through next/headers and so
 * is async; callers must await it.
 */

export type CurrentUser = Pick<UserRow, "id" | "email"> & {
  role: SessionUser["role"];
  name: string;
};

const toCurrentUser = (user: SessionUser): CurrentUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
  name: user.name,
});

/** The signed-in user, or null. Never throws. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const user = await sessionUserFromCookies();
  return user ? toCurrentUser(user) : null;
}

/**
 * The signed-in user, or a thrown UnauthorizedError.
 *
 * For code that has no meaningful behaviour when signed out — most internal
 * API routes, which need an actor to attribute the work to.
 */
export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** The same, resolved from an explicit Request rather than ambient cookies. */
export async function getCurrentUserFromRequest(
  request: Request
): Promise<CurrentUser | null> {
  const user = await sessionUserFromRequest(request);
  return user ? toCurrentUser(user) : null;
}
