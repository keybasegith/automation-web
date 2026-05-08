/**
 * POST /api/ai/draft-email
 *
 * COMPLIANCE INVARIANT — read before editing:
 *   This route is the canonical entry point for compliance-safe AI email
 *   drafting. The contract is:
 *     1. Accept ONLY abstracted enum fields + clientId from the client.
 *     2. Look up the real client record INTERNALLY (never sent over the wire).
 *     3. Sanitize → produce SafeOpenAIInput (no PII, no financial figures).
 *     4. Build the safe prompt and call OpenAI with that ONLY.
 *     5. Receive a draft full of placeholders.
 *     6. Run the prohibited-phrase checker.
 *     7. Persist the draft (with placeholders intact) and return.
 *
 *   Placeholder substitution does NOT happen here — the advisor reviews
 *   the placeholder draft and the substitution+send happens in
 *   /api/email/send. This keeps OpenAI on a sanitized-only diet end-to-end.
 */

import {
  buildSafePrompt,
  SYSTEM_PROMPT,
} from "@/lib/compliance/safePromptBuilder";
import {
  assertSafeForOpenAI,
  sanitizeForOpenAI,
  type SafeOpenAIInput,
} from "@/lib/compliance/sanitizer";
import { checkProhibitedPhrases } from "@/lib/compliance/prohibitedPhraseChecker";
import { logAudit } from "@/lib/db/audit";
import { getClientById } from "@/lib/db/clientsRepo";
import { saveGeneratedEmail } from "@/lib/db/emailsRepo";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import { getCurrentUser } from "@/lib/currentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

interface OpenAiDraft {
  subject: string;
  body: string;
}

interface DraftEmailResponse {
  draftId: string;
  status: "DRAFT_GENERATED" | "COMPLIANCE_REVIEW_REQUIRED";
  subject: string;
  body: string;
  flaggedPhrases: ReturnType<
    typeof checkProhibitedPhrases
  >["flaggedPhrases"];
  isCompliant: boolean;
  /** Audit log row id for the AI_RESPONSE_RECEIVED event (for traceability). */
  auditLogId: string | null;
}

async function callOpenAi(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<
  | { ok: true; draft: OpenAiDraft }
  | { ok: false; status: number; error: string; detail?: string }
> {
  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

  const requestBody = {
    model,
    temperature: 0.4,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "client_email_draft",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["subject", "body"],
          properties: {
            subject: { type: "string" },
            body: { type: "string" },
          },
        },
      },
    },
  };

  // Defense-in-depth: throw if anything sensitive snuck into the call.
  // sanitizeForOpenAI() already enforces shape, but if a future refactor
  // dumps a real client object into a future field this guard catches it
  // before it ever leaves the server.
  assertSafeForOpenAI(requestBody);

  let upstream: Response;
  try {
    upstream = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error: "Failed to reach the AI provider.",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return {
      ok: false,
      status: 502,
      error: `AI provider returned ${upstream.status}.`,
      detail,
    };
  }

  let data: { choices?: { message?: { content?: string } }[] };
  try {
    data = await upstream.json();
  } catch {
    return { ok: false, status: 502, error: "AI returned non-JSON." };
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return { ok: false, status: 502, error: "AI returned an empty response." };
  }

  let parsed: OpenAiDraft;
  try {
    parsed = JSON.parse(content) as OpenAiDraft;
  } catch {
    return {
      ok: false,
      status: 502,
      error: "AI returned malformed JSON.",
      detail: content,
    };
  }

  if (
    typeof parsed.subject !== "string" ||
    typeof parsed.body !== "string" ||
    !parsed.subject.trim() ||
    !parsed.body.trim()
  ) {
    return { ok: false, status: 502, error: "AI returned an incomplete draft." };
  }

  return {
    ok: true,
    draft: { subject: parsed.subject.trim(), body: parsed.body.trim() },
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }
  if (!isServerSupabaseConfigured()) {
    return Response.json(
      { error: "Supabase is not configured. Cannot persist drafts." },
      { status: 500 }
    );
  }

  let raw: Record<string, unknown>;
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const clientId = typeof raw.clientId === "string" ? raw.clientId.trim() : "";
  if (!clientId) {
    return Response.json({ error: "clientId is required." }, { status: 400 });
  }

  // Internal lookup: the real client record stays on the server. None of
  // these fields will be passed to OpenAI; they exist only to (a) verify
  // the client exists and (b) drive abstracted enums on the server side
  // if the caller didn't supply them.
  const client = await getClientById(clientId).catch(() => null);
  if (!client) {
    return Response.json(
      { error: `Client with id ${clientId} not found.` },
      { status: 404 }
    );
  }

  const sanitizeResult = sanitizeForOpenAI({
    clientSegment: raw.clientSegment,
    clientStage: raw.clientStage,
    emailCategory: raw.emailCategory,
    tone: raw.tone,
    urgency: raw.urgency,
    communicationGoal: raw.communicationGoal,
  });

  if (!sanitizeResult.ok) {
    return Response.json(
      {
        error: sanitizeResult.reason,
        field: sanitizeResult.field,
        ...(sanitizeResult.matchedText
          ? { matchedText: sanitizeResult.matchedText }
          : {}),
      },
      { status: 400 }
    );
  }

  const safe: SafeOpenAIInput = sanitizeResult.safe;
  const user = getCurrentUser();

  // Audit step 1: AI draft requested. Metadata contains only abstracted
  // fields (no PII), so it is safe to retain indefinitely.
  await logAudit({
    userId: user.id,
    action: "AI_DRAFT_REQUESTED",
    entityType: "email",
    entityId: clientId,
    metadata: {
      emailCategory: safe.emailCategory,
      clientSegment: safe.clientSegment,
      clientStage: safe.clientStage,
      tone: safe.tone,
      urgency: safe.urgency,
    },
  });

  // Audit step 2: prompt built. Store the safe prompt — by construction
  // it cannot contain client identifying data (sanitizer guarantees it).
  const { systemPrompt, userPrompt } = buildSafePrompt(safe);
  await logAudit({
    userId: user.id,
    action: "AI_PROMPT_SANITIZED",
    entityType: "email",
    entityId: clientId,
    metadata: {
      systemPromptVersion: hashLine(SYSTEM_PROMPT),
      sanitizedUserPrompt: userPrompt,
    },
  });

  const ai = await callOpenAi(apiKey, systemPrompt, userPrompt);
  if (!ai.ok) {
    return Response.json(
      { error: ai.error, ...(ai.detail ? { detail: ai.detail } : {}) },
      { status: ai.status }
    );
  }

  // Persist the placeholder draft. Substitution happens later in
  // /api/email/send, so the row stays in `drafted` status until approved.
  const saved = await saveGeneratedEmail({
    clientId: client.id,
    subject: ai.draft.subject,
    body: ai.draft.body,
    createdBy: user.id,
  });

  // Run the compliance check on the placeholder text. High-severity hits
  // mean the model produced something we cannot allow even after
  // personalization (e.g. guarantee language); the draft is preserved but
  // the response status nudges the UI into compliance-review mode.
  const compliance = checkProhibitedPhrases({
    subject: ai.draft.subject,
    body: ai.draft.body,
  });

  await logAudit({
    userId: user.id,
    action: "AI_RESPONSE_RECEIVED",
    entityType: "email",
    entityId: saved.id,
    metadata: {
      emailCategory: safe.emailCategory,
      subjectLength: ai.draft.subject.length,
      bodyLength: ai.draft.body.length,
      // Sanitizer guarantees no PII in the safe prompt; the response is a
      // placeholder draft, so there's nothing identifying to redact here.
    },
  });

  await logAudit({
    userId: user.id,
    action: "PROHIBITED_PHRASE_CHECKED",
    entityType: "email",
    entityId: saved.id,
    metadata: {
      isCompliant: compliance.isCompliant,
      flagCount: compliance.flaggedPhrases.length,
      flags: compliance.flaggedPhrases.map((f) => ({
        flag: f.flag,
        severity: f.severity,
      })),
    },
  });

  const response: DraftEmailResponse = {
    draftId: saved.id,
    status: compliance.isCompliant
      ? "DRAFT_GENERATED"
      : "COMPLIANCE_REVIEW_REQUIRED",
    subject: ai.draft.subject,
    body: ai.draft.body,
    flaggedPhrases: compliance.flaggedPhrases,
    isCompliant: compliance.isCompliant,
    auditLogId: null,
  };
  return Response.json(response);
}

// Cheap stable identifier for the system prompt so audit rows can attest
// "this draft was generated against system-prompt v<hash>" without storing
// the whole prompt repeatedly. Not cryptographic — collision-resistance
// isn't a security property here.
function hashLine(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return `sp_${(h >>> 0).toString(16)}`;
}
