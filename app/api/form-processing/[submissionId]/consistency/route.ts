import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit/createAuditLog";
import { checkKycCrqConsistency } from "@/lib/forms/checkKycCrqConsistency";
import {
  getCrqDraft,
  getKycDraft,
  insertConsistencyResult,
  updateSubmissionStatus,
} from "@/lib/forms/repo";
import { getActingUser } from "@/lib/forms/roles";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ submissionId: string }> }
) {
  if (!isServerSupabaseConfigured()) {
    return Response.json({ error: "Database is not configured." }, { status: 500 });
  }
  const { submissionId } = await ctx.params;

  const [kyc, crq] = await Promise.all([
    getKycDraft(submissionId),
    getCrqDraft(submissionId),
  ]);
  if (!kyc) {
    return Response.json({ error: "KYC draft missing." }, { status: 400 });
  }
  if (!crq) {
    return Response.json({ error: "CRQ draft missing." }, { status: 400 });
  }

  const result = checkKycCrqConsistency({ submissionId, kyc, crq });
  const persisted = await insertConsistencyResult({
    submissionId,
    result,
  });

  await updateSubmissionStatus(submissionId, "ready_for_consistency_check", {
    mismatchCount: result.flags.length,
  });

  const acting = getActingUser();
  const h = await headers();
  await createAuditLog({
    submissionId,
    userId: acting.id,
    userRole: acting.role,
    action: "consistency_check_run",
    afterValue: {
      overallStatus: result.overallStatus,
      flagCount: result.flags.length,
      severities: countBySeverity(result.flags),
    },
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent") ?? null,
  });

  return Response.json(persisted);
}

function countBySeverity(
  flags: { severity: "Low" | "Medium" | "High" }[]
): Record<string, number> {
  const out: Record<string, number> = { Low: 0, Medium: 0, High: 0 };
  for (const f of flags) out[f.severity] = (out[f.severity] ?? 0) + 1;
  return out;
}
