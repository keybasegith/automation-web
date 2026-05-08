import type { UserRow } from "@/lib/db/types";

/**
 * Mock current user — matches the seeded row in supabase/schema.sql.
 * Replace with a real session lookup once auth is wired.
 */
export const MOCK_USER: Pick<UserRow, "id" | "email" | "role"> = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "admin@keybase.com",
  role: "advisor",
};

export function getCurrentUser() {
  return MOCK_USER;
}
