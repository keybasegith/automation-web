/**
 * POST /api/email/send
 *
 * Compliance-gated email send. NEVER calls OpenAI. The flow is:
 *   1. Look up the draft and the linked client internally.
 *   2. Run the prohibited-phrase checker on the FINAL text the advisor
 *      typed; refuse on any high-severity hit.
 *   3. Substitute placeholders ([CLIENT_NAME], [ADVISOR_NAME], [FIRM_NAME],
 *      [DATE]) using internal data only — substitution happens INSIDE this
 *      route, not in OpenAI.
 *   4. Refuse to send if any allowed placeholder remains unfilled (indicates
 *      missing client/advisor data, not advisor intent).
 *   5. Mark the email row as `sent` and audit.
 *   6. TODO: dispatch via the company email API (currently stubbed).
 *
 * Inputs:
 *   { draftId, advisorId?, finalSubject, finalBody }
 *
 * NOTE: advisorId is logged but the canonical actor is `getCurrentUser()`.
 * If those don't match, the route refuses (defense-in-depth).
 */

import { checkProhibitedPhrases } from "@/lib/compliance/prohibitedPhraseChecker";
import {
  hasUnfilledPlaceholders,
  substitutePlaceholders,
  deriveFirstName,
} from "@/lib/compliance/placeholders";
import { logAudit } from "@/lib/db/audit";
import { getClientById } from "@/lib/db/clientsRepo";
import { getEmailById, updateEmailStatus } from "@/lib/db/emailsRepo";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import { getCurrentUser } from "@/lib/currentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SendEmailRequest {
  draftId: string;
  advisorId?: string;
  finalSubject: string;
  finalBody: string;
}

const FIRM_NAME = process.env.FIRM_NAME ?? "Keybase";

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured()) {
    return Response.json(
      { error: "Supabase is not configured. Cannot send emails." },
      { status: 500 }
    );
  }

  let raw: SendEmailRequest;
  try {
    raw = (await request.json()) as SendEmailRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof raw.draftId !== "string" || raw.draftId.trim().length === 0) {
    return Response.json({ error: "draftId is required." }, { status: 400 });
  }
  if (typeof raw.finalSubject !== "string" || !raw.finalSubject.trim()) {
    return Response.json(
      { error: "finalSubject is required." },
      { status: 400 }
    );
  }
  if (typeof raw.finalBody !== "string" || !raw.finalBody.trim()) {
    return Response.json({ error: "finalBody is required." }, { status: 400 });
  }

  const draft = await getEmailById(raw.draftId).catch(() => null);
  if (!draft) {
    return Response.json(
      { error: `Draft ${raw.draftId} not found.` },
      { status: 404 }
    );
  }
  if (draft.status === "sent") {
    return Response.json(
      { error: "This draft has already been sent." },
      { status: 409 }
    );
  }

  const user = getCurrentUser();
  if (raw.advisorId && raw.advisorId !== user.id) {
    return Response.json(
      {
        error:
          "advisorId does not match the authenticated user. Refusing to send.",
      },
      { status: 403 }
    );
  }

  const client = await getClientById(draft.client_id).catch(() => null);
  if (!client) {
    return Response.json(
      { error: "Linked client record could not be loaded." },
      { status: 500 }
    );
  }

  // Compliance check on the FINAL text. Even if the AI-generated draft was
  // clean, the advisor may have edited in something prohibited. Refuse on
  // any high-severity finding.
  const compliance = checkProhibitedPhrases({
    subject: raw.finalSubject,
    body: raw.finalBody,
  });

  await logAudit({
    userId: user.id,
    action: "PROHIBITED_PHRASE_CHECKED",
    entityType: "email",
    entityId: draft.id,
    metadata: {
      isCompliant: compliance.isCompliant,
      flagCount: compliance.flaggedPhrases.length,
      stage: "pre_send",
    },
  });

  if (!compliance.isCompliant) {
    return Response.json(
      {
        error: "Email failed compliance check; cannot send.",
        flaggedPhrases: compliance.flaggedPhrases,
        recommendedStatus: "COMPLIANCE_REVIEW_REQUIRED",
      },
      { status: 422 }
    );
  }

  // Placeholder substitution happens here, INSIDE our system, with values
  // pulled from internal storage. None of these values were ever sent to
  // OpenAI; the AI draft contained tokens like [CLIENT_NAME] only.
  const today = new Date().toISOString().slice(0, 10);
  const subjectSubstituted = substitutePlaceholders(raw.finalSubject, {
    CLIENT_NAME: client.name,
    CLIENT_FIRST_NAME: deriveFirstName(client.name),
    ADVISOR_NAME: user.email, // TODO: replace with users.name once auth is wired.
    FIRM_NAME,
    DATE: today,
  });
  const bodySubstituted = substitutePlaceholders(raw.finalBody, {
    CLIENT_NAME: client.name,
    CLIENT_FIRST_NAME: deriveFirstName(client.name),
    ADVISOR_NAME: user.email,
    FIRM_NAME,
    DATE: today,
  });

  if (
    hasUnfilledPlaceholders(subjectSubstituted.text) ||
    hasUnfilledPlaceholders(bodySubstituted.text)
  ) {
    return Response.json(
      {
        error:
          "The final text still contains unfilled placeholder tokens. Add the missing client/advisor data and try again.",
        unfilledInSubject: subjectSubstituted.remaining,
        unfilledInBody: bodySubstituted.remaining,
      },
      { status: 422 }
    );
  }

  await logAudit({
    userId: user.id,
    action: "PLACEHOLDERS_SUBSTITUTED",
    entityType: "email",
    entityId: draft.id,
    metadata: {
      substitutedInSubject: subjectSubstituted.substituted,
      substitutedInBody: bodySubstituted.substituted,
    },
  });

  // ---------------------------------------------------------------------
  // TODO: dispatch via the company-provided email API (e.g. SES, Mailgun,
  // an internal SMTP relay, or a compliance-monitored mail gateway). The
  // dispatcher MUST:
  //   - Be a server-side service the firm controls.
  //   - Never round-trip the body through any external LLM.
  //   - Surface non-2xx responses to this caller for retry.
  //
  // Example shape (uncomment and wire when the provider is chosen):
  //
  //   const dispatch = await sendViaCompanyEmailApi({
  //     to: client.email,
  //     subject: subjectSubstituted.text,
  //     body: bodySubstituted.text,
  //     fromUserId: user.id,
  //   });
  //   if (!dispatch.ok) {
  //     return Response.json({ error: dispatch.error }, { status: 502 });
  //   }
  // ---------------------------------------------------------------------

  await updateEmailStatus(draft.id, "sent");

  await logAudit({
    userId: user.id,
    action: "SEND_EMAIL",
    entityType: "email",
    entityId: draft.id,
    metadata: {
      // Recipient address is intentionally NOT logged here — it lives on
      // the clients table and should be retrieved from there for audit
      // queries. Storing it twice creates two surfaces to scrub if a
      // client requests deletion.
      clientId: client.id,
      subjectLength: subjectSubstituted.text.length,
      bodyLength: bodySubstituted.text.length,
      stub: true,
    },
  });

  return Response.json({
    ok: true,
    draftId: draft.id,
    status: "SENT",
    sentAt: new Date().toISOString(),
    finalSubject: subjectSubstituted.text,
    finalBody: bodySubstituted.text,
    note: "Email is marked as sent in the database. Real delivery via the company email API is not yet wired (see TODO in app/api/email/send/route.ts).",
  });
}
