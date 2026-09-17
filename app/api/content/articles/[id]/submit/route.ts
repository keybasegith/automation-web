import { isResponse, requireUser, respond, serverError } from "@/lib/content/http";
import { submitForReview } from "@/lib/content/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST → hand the current draft to compliance.
 *
 * The revision is frozen in the same transaction that hands it over, so the
 * reviewer and the author are looking at the same bytes from this moment on.
 * A 400 here carries `details`: the list of things the author still has to
 * complete, shown all at once rather than one at a time.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (isResponse(auth)) return auth.response;
  const { id } = await ctx.params;

  try {
    return respond(await submitForReview(auth.user, id));
  } catch (err) {
    return serverError(err, "Could not submit the article.");
  }
}
