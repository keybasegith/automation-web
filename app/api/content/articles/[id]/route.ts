import { isResponse, readJson, requireUser, respond, serverError } from "@/lib/content/http";
import { loadWorkspace, updateSettings } from "@/lib/content/service";
import { readingTimeMinutes } from "@/lib/content/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET   → everything one article's screens need: the working draft, the
 *         submitted and published revisions, the full version history, the
 *         compliance decisions, the audit trail, and this viewer's permissions.
 * PATCH → article-level settings (content type, and the slug for an admin).
 */

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (isResponse(auth)) return auth.response;
  const { id } = await ctx.params;

  try {
    return respond(await loadWorkspace(auth.user, id), (workspace) => ({
      ...workspace,
      readingTimeMinutes: workspace.draft
        ? readingTimeMinutes(workspace.draft.payload)
        : 0,
      viewer: {
        id: auth.user.id,
        name: auth.user.name,
        role: auth.user.role,
      },
    }));
  } catch (err) {
    return serverError(err, "Could not load that article.");
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (isResponse(auth)) return auth.response;
  const { id } = await ctx.params;

  const parsed = await readJson(req);
  if ("response" in parsed) return parsed.response;

  try {
    return respond(
      await updateSettings(auth.user, id, {
        contentType: parsed.body.contentType,
        slug: parsed.body.slug,
      }),
      (article) => ({ article })
    );
  } catch (err) {
    return serverError(err, "Could not save those settings.");
  }
}
