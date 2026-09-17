import type { SessionUser } from "@/lib/auth/session";
import { workspaceUser } from "@/lib/auth/workspace";

export type CurrentUser = SessionUser;

/** Shared actor used for existing ownership and audit relationships. */
export async function getCurrentUser(): Promise<CurrentUser> {
  return workspaceUser();
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  return workspaceUser();
}

export async function getCurrentUserFromRequest(_request: Request): Promise<CurrentUser> {
  void _request; // Preserve the existing route-handler call signature.
  return workspaceUser();
}
