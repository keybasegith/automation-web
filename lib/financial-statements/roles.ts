/**
 * Who is acting.
 *
 * This tool runs behind the internal app's existing perimeter and has no
 * sign-in of its own yet. `getActingFinanceUser` is the single seam to replace
 * when real authentication arrives — every route and audit entry goes through
 * it, so nothing else needs to change.
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

const DEFAULT_ACTOR: FinanceActor = {
  id: "internal-finance",
  name: "Finance (internal)",
  role: "finance_admin",
};

export function getActingFinanceUser(): FinanceActor {
  return DEFAULT_ACTOR;
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

export function authorize(action: FinanceAction): FinanceActor {
  const actor = getActingFinanceUser();
  if (!PERMISSIONS[actor.role].includes(action)) {
    throw new FinanceAuthorizationError(action, actor.role);
  }
  return actor;
}
