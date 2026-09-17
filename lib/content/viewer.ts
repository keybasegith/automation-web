import { currentUser } from "@/lib/content/session";
import type { ContentUser } from "@/lib/content/types";

/**
 * The signed-in user, for a server component under /content.
 *
 * Every page in the module calls this and renders the sign-in form when it
 * returns null, rather than trusting a shared layout to have done it. A layout
 * cannot see which route it is wrapping, and a page that forgot to check would
 * be a page that renders somebody else's article — so the check lives on the
 * page that does the rendering.
 */
export async function getViewer(): Promise<ContentUser | null> {
  try {
    return await currentUser();
  } catch (err) {
    // An unreachable database must not render a broken shell to somebody who
    // may well be signed in — the sign-in form is the honest fallback.
    console.error("[content] could not resolve the current user:", err);
    return null;
  }
}

/** The subset of a user the client screens are given. Never the whole row. */
export function viewerProps(user: ContentUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
