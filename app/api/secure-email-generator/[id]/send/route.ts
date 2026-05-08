import { getComplianceSettings } from "@/lib/db/compliance";
import { resolveUserByPin } from "@/lib/secureEmail/pinResolver";
import { markDraftSent } from "@/lib/secureEmail/repo";
import {
  flagLabel,
  scanForRisks,
  type RiskFinding,
} from "@/lib/secureEmail/riskScanner";
import {
  ADVISOR_NAME_PLACEHOLDER,
  appendComplianceFooter,
  substitutePlaceholders,
} from "@/lib/secureEmail/templates";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SendBody {
  subject?: unknown;
  body?: unknown;
  recipientEmail?: unknown;
  /**
   * 4-8 digit PIN that identifies the approving employee. The raw PIN is
   * never stored — only the resolved user id and their display-name snapshot
   * are persisted for audit.
   */
  pin?: unknown;
}

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
  const body = raw as SendBody;

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const messageBody = typeof body.body === "string" ? body.body.trim() : "";
  const recipientEmail =
    typeof body.recipientEmail === "string"
      ? body.recipientEmail.trim().toLowerCase()
      : "";
  const pin = typeof body.pin === "string" ? body.pin.trim() : "";

  if (!subject) {
    return Response.json(
      { error: "Subject cannot be empty." },
      { status: 400 }
    );
  }
  if (!messageBody) {
    return Response.json(
      { error: "Email body cannot be empty." },
      { status: 400 }
    );
  }
  if (!EMAIL_PATTERN.test(recipientEmail)) {
    return Response.json(
      { error: "A valid recipient email is required." },
      { status: 400 }
    );
  }
  if (subject.length > 250) {
    return Response.json(
      { error: "Subject must be 250 characters or fewer." },
      { status: 400 }
    );
  }
  if (messageBody.length > 8000) {
    return Response.json(
      { error: "Email body must be 8000 characters or fewer." },
      { status: 400 }
    );
  }
  if (!/^\d{4,8}$/.test(pin)) {
    return Response.json(
      { error: "A 4-8 digit PIN is required to approve this send." },
      { status: 400 }
    );
  }

  // Resolve the PIN to a user BEFORE running the rest of the pipeline. If the
  // PIN doesn't match anyone, refuse the send with 401 — this is the auth gate.
  let approver;
  try {
    approver = await resolveUserByPin(pin);
  } catch (err) {
    return Response.json(
      {
        error: "Could not verify PIN.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
  if (!approver) {
    return Response.json(
      { error: "PIN not recognized. Approval refused." },
      { status: 401 }
    );
  }

  // The advisor may have edited the AI draft. We re-run the same risk scanner
  // so a manually-typed SIN, account number, or guarantee can't slip through.
  // The recipient email field is intentionally NOT scanned — an email is the
  // bare minimum needed to deliver, and EMAIL_PATTERN already constrains it.
  const findings: RiskFinding[] = [
    ...scanForRisks(subject),
    ...scanForRisks(messageBody),
  ];
  if (findings.length > 0) {
    return Response.json(
      {
        error:
          "Please remove sensitive or regulated information from the email before sending.",
        riskFlags: findings.map((f) => ({
          flag: f.flag,
          label: flagLabel(f.flag),
          message: f.message,
        })),
      },
      { status: 400 }
    );
  }

  // Substitute [Advisor Name] with the PIN-resolved approver's name. This is
  // the FIRST and ONLY place the approver's display name enters the body.
  const personalizedSubject = substitutePlaceholders(subject, {
    advisorName: approver.name,
  });
  const personalizedBody = substitutePlaceholders(messageBody, {
    advisorName: approver.name,
  });

  // Re-append the firm's compliance footer at send time. The advisor may have
  // accidentally trimmed it during their edit pass; we always want the
  // approved footer on what actually goes out.
  const compliance = await getComplianceSettings().catch(() => null);
  const finalBody = appendComplianceFooter(
    personalizedBody,
    compliance?.mandatoryFooter ?? ""
  );

  // Defence-in-depth: the [Advisor Name] placeholder must not survive into
  // the sent body. If it does, refuse the send so we don't email a client
  // a literal placeholder.
  if (finalBody.includes(ADVISOR_NAME_PLACEHOLDER)) {
    return Response.json(
      {
        error:
          "Internal error: advisor name placeholder was not substituted. Please retry.",
      },
      { status: 500 }
    );
  }

  try {
    const updated = await markDraftSent({
      id,
      finalSubject: personalizedSubject,
      finalBody,
      recipientEmail,
      appendedRiskFlags: [],
      approvedBy: approver.id,
      approvedNameSnapshot: approver.name,
    });

    // TODO: hook up the real email-delivery API here. For now we just record
    // the intent. A future implementation should:
    //   1. read updated.final_subject / final_body / recipient_email
    //   2. call the delivery provider
    //   3. on failure, optionally roll the row back to status='reviewed'
    // The call deliberately lives AFTER the DB write so that a sent record
    // exists for compliance even if the network call later fails.

    return Response.json({
      id: updated.id,
      status: updated.status,
      sentAt: updated.sent_at,
      recipientEmail: updated.recipient_email,
      finalSubject: updated.final_subject,
      finalBody: updated.final_body,
      approvedBy: updated.approved_by,
      approvedAt: updated.approved_at,
      approvedName: updated.approved_name_snapshot,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
