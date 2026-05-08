import { updateSecureEmailDraftStatus } from "@/lib/secureEmail/repo";
import { DRAFT_STATUSES, type DraftStatus } from "@/lib/secureEmail/types";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inSet = <T extends string>(value: unknown, set: readonly T[]): value is T =>
  typeof value === "string" && (set as readonly string[]).includes(value);

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!isServerSupabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  const { id } = await ctx.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const body = raw as { status?: unknown };
  if (!inSet(body.status, DRAFT_STATUSES)) {
    return Response.json({ error: "status is invalid." }, { status: 400 });
  }
  // Generation always sets advisor_review_required; clients can only move it
  // forward, never back to draft_generated.
  if (body.status === "draft_generated") {
    return Response.json(
      { error: "draft_generated is set automatically by the generator." },
      { status: 400 }
    );
  }
  const status = body.status as DraftStatus;

  try {
    const updated = await updateSecureEmailDraftStatus(id, status);
    return Response.json({
      id: updated.id,
      status: updated.status,
      reviewedAt: updated.reviewed_at,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
