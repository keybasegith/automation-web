import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit/createAuditLog";
import {
  getBpProcessing,
  updateSubmissionStatus,
  upsertBpProcessing,
} from "@/lib/forms/repo";
import { DEMO_USERS, getDemoBpUserId } from "@/lib/forms/roles";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BpBody {
  action?: unknown;
  notes?: unknown;
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ submissionId: string }> }
) {
  if (!isServerSupabaseConfigured()) {
    return Response.json({ error: "Database is not configured." }, { status: 500 });
  }
  const { submissionId } = await ctx.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const body = raw as BpBody;
  const action = typeof body.action === "string" ? body.action : "";
  if (!["push_to_windfund", "add_note"].includes(action)) {
    return Response.json(
      { error: "action must be 'push_to_windfund' or 'add_note'." },
      { status: 400 }
    );
  }

  const bpUserId = getDemoBpUserId();
  const existing = await getBpProcessing(submissionId);
  if (!existing) {
    return Response.json(
      { error: "Submission has not reached BP yet." },
      { status: 400 }
    );
  }

  const h = await headers();
  const ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = h.get("user-agent") ?? null;

  if (action === "push_to_windfund") {
    if (existing.status === "pushed_to_windfund") {
      return Response.json(
        { error: "Package is already marked as pushed to WindFund." },
        { status: 400 }
      );
    }
    const now = new Date().toISOString();
    await upsertBpProcessing({
      submissionId,
      status: "pushed_to_windfund",
      bpUserId,
      pushedToWindFundAt: now,
    });
    await updateSubmissionStatus(submissionId, "pushed_to_windfund");

    await createAuditLog({
      submissionId,
      userId: bpUserId,
      userRole: DEMO_USERS.bp.role,
      action: "marked_as_pushed_to_windfund",
      afterValue: { pushedAt: now },
      ipAddress,
      userAgent,
    });
    return Response.json({ status: "pushed_to_windfund", pushedToWindFundAt: now });
  }

  // add_note
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  if (!notes) {
    return Response.json({ error: "Note text is required." }, { status: 400 });
  }
  await upsertBpProcessing({
    submissionId,
    bpUserId,
    notes,
  });
  return Response.json({ ok: true });
}
