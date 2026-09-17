import type { SessionUser } from "@/lib/auth/session";

/** Shared actor for the intentionally public automation workspace.
 * Uses the seeded account id required by existing ownership and audit foreign keys.
 * This represents shared access, not an authenticated individual.
 */
export function workspaceUser(): SessionUser {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    email: "admin@keybase.com",
    role: "admin",
    name: "Shared workspace",
  };
}
