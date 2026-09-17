import { isResponse, readJson, requireUser, respond, serverError } from "@/lib/content/http";
import { saveDraft } from "@/lib/content/service";
import { readingTimeMinutes } from "@/lib/content/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PUT → save the working draft. This is the autosave endpoint.
 *
 * `expectedRevisionId` is the revision the browser believed it was editing. A
 * mismatch means the article moved on somewhere else — submitted from another
 * tab, or sent back by compliance — and the save is refused with 409 rather
 * than written where the author will never see it. Their words stay on screen.
 */
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (isResponse(auth)) return auth.response;
  const { id } = await ctx.params;

  const parsed = await readJson(req);
  if ("response" in parsed) return parsed.response;

  const expected =
    typeof parsed.body.expectedRevisionId === "string"
      ? parsed.body.expectedRevisionId
      : undefined;

  try {
    return respond(
      await saveDraft(auth.user, id, parsed.body.payload, expected),
      (saved) => ({
        article: saved.article,
        revision: saved.revision,
        newRevision: saved.newRevision,
        readingTimeMinutes: readingTimeMinutes(saved.revision.payload),
        savedAt: saved.revision.updatedAt,
      })
    );
  } catch (err) {
    return serverError(err, "Could not save your draft.");
  }
}
