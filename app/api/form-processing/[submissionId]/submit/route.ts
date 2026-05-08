import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit/createAuditLog";
import {
  getLatestConsistencyResult,
  updateSubmissionStatus,
} from "@/lib/forms/repo";
import { getActingUser } from "@/lib/forms/roles";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Submit a package to compliance for review.
 *
 * Hard rule per spec: if the most recent consistency result is
 * `blocked_missing_required` the submission is refused. Compliance never sees
 * a package with missing required fields.
 */
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ submissionId: string }> }
) {
  if (!isServerSupabaseConfigured()) {
    return Response.json({ error: "Database is not configured." }, { status: 500 });
  }
  const { submissionId } = await ctx.params;

  const consistency = await getLatestConsistencyResult(submissionId);
  if (!consistency) {
    return Response.json(
      { error: "Run a consistency check before submitting to compliance." },
      { status: 400 }
    );
  }
  if (consistency.overallStatus === "blocked_missing_required") {
    return Response.json(
      {
        error:
          "Cannot submit: required fields are missing. Resolve them and re-run the consistency check.",
      },
      { status: 400 }
    );
  }

  await updateSubmissionStatus(submissionId, "submitted_to_compliance");

  const acting = getActingUser();
  const h = await headers();
  await createAuditLog({
    submissionId,
    userId: acting.id,
    userRole: acting.role,
    action: "submitted_to_compliance",
    afterValue: {
      consistencyStatus: consistency.overallStatus,
      mismatchCount: consistency.flags.length,
    },
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent") ?? null,
  });

  return Response.json({ submissionId, status: "submitted_to_compliance" });
}
