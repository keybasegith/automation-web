import { isSameOrigin } from "@/lib/auth/guard";
import { workspaceUser } from "@/lib/auth/workspace";
import { InternalAiError } from "@/lib/internal-ai/errors";

export interface InternalAiUser {
  id: string;
  email: string;
}

const UNAUTHORIZED = "Cross-site requests are not allowed.";

export async function requireInternalAiUser(request: Request): Promise<InternalAiUser> {
  const user = workspaceUser();
  if (!isSameOrigin(request)) {
    throw new InternalAiError("unauthorized", UNAUTHORIZED, {
      detail: "request was cross-site",
    });
  }

  return { id: user.id, email: user.email };
}
