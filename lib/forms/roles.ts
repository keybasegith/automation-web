import { requireCurrentUser } from "@/lib/currentUser";

/**
 * Role resolution for form processing.
 *
 * The acting user is now the real signed-in session (`getActingUser`). The
 * compliance / BP / admin entries below remain seed constants pointing at the
 * demo rows in supabase/006-form-processing.sql: they exist so audit entries
 * have a valid foreign key for those roles, which the single internal account
 * cannot yet represent.
 *
 * When SSO brings real per-person roles, these constants go and the routes
 * check the acting user's own role instead.
 */

export const DEMO_USERS = {
  advisor: {
    id: "00000000-0000-0000-0000-000000000001",
    email: "admin@keybase.com",
    role: "advisor" as const,
  },
  compliance: {
    id: "00000000-0000-0000-0000-000000000002",
    email: "compliance@keybase.com",
    role: "compliance" as const,
  },
  bp: {
    id: "00000000-0000-0000-0000-000000000003",
    email: "bp@keybase.com",
    role: "bp" as const,
  },
  admin: {
    id: "00000000-0000-0000-0000-000000000004",
    email: "admin@keybase.local",
    role: "admin" as const,
  },
} as const;

export type AppRole = "advisor" | "compliance" | "bp" | "admin";

/**
 * Convenience for API routes that need a "compliance reviewer id" — falls
 * back to the demo compliance user when no real session is available.
 *
 * TODO: replace with a real session lookup once auth is wired. The route
 * should verify the caller actually has the compliance role before allowing
 * approval.
 */
export function getDemoComplianceUserId(): string {
  return DEMO_USERS.compliance.id;
}

export function getDemoBpUserId(): string {
  return DEMO_USERS.bp.id;
}

/** The signed-in dashboard user. Throws UnauthorizedError when there is none. */
export async function getActingUser() {
  return requireCurrentUser();
}
