import { requireCurrentUser } from "@/lib/currentUser";

/**
 * Who is acting.
 *
 * `getActingFinanceUser` is the seam this file always described, now wired to
 * the real dashboard session: every route and audit entry goes through
 * `authorize`, so signing in is what grants finance access, and the actor
 * recorded against a statement package is the person who signed in.
 *
 * Roles are not yet per-person — the single internal account acts as finance
 * admin. When SSO brings real roles, `getActingFinanceUser` maps them onto
 * FinanceRole and the permission table below starts doing real work.
 */

export type FinanceRole = "finance_admin" | "finance_user" | "read_only";

export interface FinanceActor {
  id: string;
  name: string;
  role: FinanceRole;
}

export type FinanceAction =
  | "upload" | "generate" | "edit_mapping" | "resolve_exception"
  | "finalize" | "reopen" | "export" | "view";

export async function getActingFinanceUser(): Promise<FinanceActor> {
  const user = await requireCurrentUser();
  return { id: user.id, name: user.name, role: "finance_admin" };
}

const PERMISSIONS: Record<FinanceRole, FinanceAction[]> = {
  finance_admin: ["upload", "generate", "edit_mapping", "resolve_exception", "finalize", "reopen", "export", "view"],
  finance_user: ["upload", "generate", "resolve_exception", "export", "view"],
  read_only: ["view", "export"],
};

export class FinanceAuthorizationError extends Error {
  constructor(action: FinanceAction, role: FinanceRole) {
    super(`Your role (${role}) cannot ${action.replace(/_/g, " ")}.`);
    this.name = "FinanceAuthorizationError";
  }
}

export async function authorize(action: FinanceAction): Promise<FinanceActor> {
  const actor = await getActingFinanceUser();
  if (!PERMISSIONS[actor.role].includes(action)) {
    throw new FinanceAuthorizationError(action, actor.role);
  }
  return actor;
}
