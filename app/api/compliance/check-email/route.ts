/**
 * POST /api/compliance/check-email
 *
 * Stateless compliance check used by the UI to highlight prohibited
 * phrases as the advisor edits a draft. NEVER calls OpenAI. Optionally
 * audits the check when a `draftId` is supplied.
 *
 * The check is a pure function of (subject, body) → flagged phrases. It
 * does not reject or mutate the text — the advisor edits in-place.
 */

import { checkProhibitedPhrases } from "@/lib/compliance/prohibitedPhraseChecker";
import { logAudit } from "@/lib/db/audit";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import { getCurrentUser } from "@/lib/currentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CheckEmailRequest {
  draftId?: string;
  subject: string;
  body: string;
}

type RecommendedStatus =
  | "APPROVED"
  | "ADVISOR_REVIEW"
  | "COMPLIANCE_REVIEW_REQUIRED";

export async function POST(request: Request) {
  let raw: CheckEmailRequest;
  try {
    raw = (await request.json()) as CheckEmailRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof raw.subject !== "string" || typeof raw.body !== "string") {
    return Response.json(
      { error: "subject and body must be strings." },
      { status: 400 }
    );
  }

  const result = checkProhibitedPhrases({
    subject: raw.subject,
    body: raw.body,
  });

  const hasHigh = result.flaggedPhrases.some((f) => f.severity === "high");
  const hasMedium = result.flaggedPhrases.some((f) => f.severity === "medium");
  const recommendedStatus: RecommendedStatus = hasHigh
    ? "COMPLIANCE_REVIEW_REQUIRED"
    : hasMedium
      ? "ADVISOR_REVIEW"
      : "APPROVED";

  // Audit only when called against a known draft, and only when Supabase
  // is configured. Stateless live-typing checks don't need to fill the
  // audit log.
  if (raw.draftId && isServerSupabaseConfigured()) {
    try {
      const user = getCurrentUser();
      await logAudit({
        userId: user.id,
        action: "PROHIBITED_PHRASE_CHECKED",
        entityType: "email",
        entityId: raw.draftId,
        metadata: {
          isCompliant: result.isCompliant,
          flagCount: result.flaggedPhrases.length,
          recommendedStatus,
        },
      });
    } catch {
      // Compliance posture: keep the check usable even if audit storage is
      // misconfigured. The audit failure is surfaced separately by the
      // server logs.
    }
  }

  return Response.json({
    isCompliant: result.isCompliant,
    flaggedPhrases: result.flaggedPhrases,
    recommendedStatus,
  });
}
