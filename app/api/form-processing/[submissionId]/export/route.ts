import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit/createAuditLog";
import { exportWindFundCoreCsv } from "@/lib/export/exportWindFundCoreCsv";
import {
  getCrqDraft,
  getKycDraft,
  listComplianceReviews,
} from "@/lib/forms/repo";
import { DEMO_USERS, getDemoBpUserId } from "@/lib/forms/roles";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ submissionId: string }> }
) {
  if (!isServerSupabaseConfigured()) {
    return new Response("Database is not configured.", { status: 500 });
  }
  const { submissionId } = await ctx.params;

  const [kyc, crq, reviews] = await Promise.all([
    getKycDraft(submissionId),
    getCrqDraft(submissionId),
    listComplianceReviews(submissionId),
  ]);
  if (!kyc) {
    return new Response("KYC draft missing.", { status: 400 });
  }
  const approval = reviews.find((r) => r.decision === "approved");
  if (!approval) {
    return new Response("Submission has not been approved by compliance.", {
      status: 400,
    });
  }

  const csv = exportWindFundCoreCsv([
    {
      kyc: kyc.fields,
      // Account number lives on the CRQ (it has a dedicated field).
      accountNumber: crq?.fields.accountNumber ?? "",
      complianceApprovedAt: approval.reviewedAt,
    },
  ]);

  const h = await headers();
  await createAuditLog({
    submissionId,
    userId: getDemoBpUserId(),
    userRole: DEMO_USERS.bp.role,
    action: "exported_csv",
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent") ?? null,
  });

  const filename = `windfund-core-${submissionId.slice(0, 8)}.csv`;
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
