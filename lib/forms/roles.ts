import { getCurrentUser, MOCK_USER } from "@/lib/currentUser";

/**
 * Demo-mode role resolution. The existing app does not have real auth, so the
 * mock advisor is the user-of-record. The form-processing feature also needs
 * compliance / BP / admin roles for the audit trail, so we expose constants
 * pointing at the demo seed users created in supabase/006-form-processing.sql.
 *
 * Production wiring would replace these with real session lookups (e.g.
 * Supabase auth / NextAuth) and a per-page role gate.
 */

export const DEMO_USERS = {
  advisor: MOCK_USER,
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

/** Currently always returns the mock advisor — kept as a seam for real auth. */
export function getActingUser() {
  return getCurrentUser();
}
