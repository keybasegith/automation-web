/**
 * Who may reach Internal AI.
 *
 * This is the feature's single authorization choke point — the route calls
 * nothing else — and it verifies a real, server-issued session:
 *
 *   1. The request must carry a valid dashboard session cookie: signed by this
 *      server, unexpired, and resolving to a configured account. Knowing the
 *      URL is not enough, and neither is any header a caller can set.
 *   2. The request must be same-origin. That is CSRF defence, layered on top
 *      of SameSite=Lax — it is NOT authentication, and it cannot admit a
 *      caller who fails step 1.
 *
 * Session parsing itself lives in lib/auth/session.ts and is not duplicated
 * here. When SSO replaces the credential store, this function does not change.
 */

import { isSameOrigin } from "@/lib/auth/guard";
import { sessionUserFromRequest } from "@/lib/auth/session";
import { InternalAiError } from "@/lib/internal-ai/errors";

export interface InternalAiUser {
  id: string;
  email: string;
}

const UNAUTHORIZED = "You must be signed in to use Internal AI.";

export async function requireInternalAiUser(request: Request): Promise<InternalAiUser> {
  const user = await sessionUserFromRequest(request);
  if (!user) {
    throw new InternalAiError("unauthorized", UNAUTHORIZED, {
      detail: "no valid dashboard session",
    });
  }

  // Checked after authentication, so a cross-site attempt with a real session
  // is refused as CSRF rather than mistaken for an anonymous request.
  if (!isSameOrigin(request)) {
    throw new InternalAiError("unauthorized", UNAUTHORIZED, {
      detail: "request was cross-site",
    });
  }

  return { id: user.id, email: user.email };
}
