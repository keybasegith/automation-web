import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit/createAuditLog";
import { verifyComplianceUserPin } from "@/lib/forms/pin";
import {
  insertComplianceReview,
  updateSubmissionStatus,
  upsertBpProcessing,
} from "@/lib/forms/repo";
import { DEMO_USERS, getDemoComplianceUserId } from "@/lib/forms/roles";
import type { AuditAction, ComplianceDecision } from "@/lib/forms/types";
import { COMPLIANCE_DECISIONS } from "@/lib/forms/types";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ComplianceBody {
  decision?: unknown;
  notes?: unknown;
  pin?: unknown;
  acknowledged?: unknown;
}

const inSet = <T extends string>(value: unknown, set: readonly T[]): value is T =>
  typeof value === "string" && (set as readonly string[]).includes(value);

const STATUS_FOR_DECISION: Record<ComplianceDecision, string> = {
  approved: "approved_by_compliance",
  returned_to_advisor: "returned_to_advisor",
  clarification_requested: "clarification_requested",
  rejected: "rejected_by_compliance",
};

const AUDIT_FOR_DECISION: Record<ComplianceDecision, AuditAction> = {
  approved: "approved_by_compliance",
  returned_to_advisor: "returned_to_advisor",
  clarification_requested: "clarification_requested",
  rejected: "rejected_by_compliance",
};

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
  const body = raw as ComplianceBody;

  if (!inSet(body.decision, COMPLIANCE_DECISIONS)) {
    return Response.json(
      { error: `decision must be one of ${COMPLIANCE_DECISIONS.join(", ")}` },
      { status: 400 }
    );
  }
  const decision: ComplianceDecision = body.decision;
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  // Per-decision validation.
  if (decision === "approved") {
    if (body.acknowledged !== true) {
      return Response.json(
        { error: "Approval requires explicit acknowledgement." },
        { status: 400 }
      );
    }
    if (typeof body.pin !== "string" || body.pin.length === 0) {
      return Response.json(
        { error: "Compliance PIN is required to approve." },
        { status: 400 }
      );
    }
  } else if (decision === "rejected" || decision === "returned_to_advisor") {
    if (!notes) {
      return Response.json(
        { error: "A reason is required for this decision." },
        { status: 400 }
      );
    }
  } else if (decision === "clarification_requested") {
    if (!notes) {
      return Response.json(
        { error: "A clarification question is required." },
        { status: 400 }
      );
    }
  }

  const reviewerId = getDemoComplianceUserId();

  let pinVerified = false;
  if (decision === "approved") {
    const ok = await verifyComplianceUserPin(reviewerId, body.pin as string);
    if (!ok) {
      return Response.json(
        { error: "PIN does not match. Approval refused." },
        { status: 401 }
      );
    }
    pinVerified = true;
  }

  const review = await insertComplianceReview({
    submissionId,
    reviewerId,
    decision,
    notes: notes || null,
    pinVerified,
  });

  // For approvals, also flip submission status and seed the BP queue.
  if (decision === "approved") {
    await updateSubmissionStatus(submissionId, "approved_by_compliance");
    await upsertBpProcessing({
      submissionId,
      status: "awaiting_processing",
    });
    // Move directly into the BP queue so the back-office sees it next.
    await updateSubmissionStatus(submissionId, "sent_to_bp");
  } else {
    await updateSubmissionStatus(
      submissionId,
      STATUS_FOR_DECISION[decision] as Parameters<typeof updateSubmissionStatus>[1]
    );
  }

  const h = await headers();
  await createAuditLog({
    submissionId,
    userId: reviewerId,
    userRole: DEMO_USERS.compliance.role,
    action: AUDIT_FOR_DECISION[decision],
    afterValue: {
      decision,
      notes: notes || null,
      pinVerified,
    },
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent") ?? null,
  });

  if (decision === "approved") {
    await createAuditLog({
      submissionId,
      userId: reviewerId,
      userRole: DEMO_USERS.compliance.role,
      action: "sent_to_bp",
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent") ?? null,
    });
  }

  return Response.json({
    reviewId: review.id,
    decision,
    pinVerified,
  });
}
