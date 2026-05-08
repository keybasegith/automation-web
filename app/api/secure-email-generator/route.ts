import { getCurrentUser } from "@/lib/currentUser";
import { getClientById } from "@/lib/db/clientsRepo";
import { getComplianceSettings } from "@/lib/db/compliance";
import { insertSecureEmailDraft } from "@/lib/secureEmail/repo";
import {
  flagLabel,
  redactPII,
  scanForClientNameLeak,
  scanForRisks,
  type RiskFinding,
} from "@/lib/secureEmail/riskScanner";
import {
  buildSystemPrompt,
  buildUserPrompt,
} from "@/lib/secureEmail/prompt";
import {
  ADVISOR_NAME_PLACEHOLDER,
  CLIENT_FIRST_NAME_PLACEHOLDER,
  appendComplianceFooter,
  getApprovedTemplate,
  renderTemplate,
  substitutePlaceholders,
} from "@/lib/secureEmail/templates";
import {
  CLIENT_SEGMENTS,
  CLIENT_STAGES,
  EMAIL_PURPOSES,
  REGENERATION_MODES,
  TONES,
  URGENCIES,
  type GenerateDraftRequest,
  type GenerateDraftResponse,
} from "@/lib/secureEmail/types";
import {
  isServerSupabaseConfigured,
  SupabaseConfigError,
} from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o";

const inSet = <T extends string>(value: unknown, set: readonly T[]): value is T =>
  typeof value === "string" && (set as readonly string[]).includes(value);

type ParsedRequest = Omit<GenerateDraftRequest, "regenerationMode"> & {
  regenerationMode: NonNullable<GenerateDraftRequest["regenerationMode"]>;
};

function parseRequest(
  raw: unknown
):
  | { ok: true; value: ParsedRequest }
  | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }
  const r = raw as Record<string, unknown>;

  if (typeof r.clientId !== "string" || !r.clientId.trim()) {
    return { ok: false, error: "clientId is required." };
  }
  // Hard guard against the regeneration-leak vector. The generate route MUST
  // build the OpenAI prompt from abstracted fields only — if a caller (a buggy
  // client, a future refactor, or a malicious page) tries to feed back the
  // visible draft body, fail closed.
  for (const forbidden of ["body", "finalBody", "subject", "draft", "generatedDraft"]) {
    if (forbidden in r) {
      return {
        ok: false,
        error: `\`${forbidden}\` is not accepted on the generate route — regeneration must use abstracted form state only.`,
      };
    }
  }
  if (!inSet(r.emailPurpose, EMAIL_PURPOSES)) {
    return { ok: false, error: "emailPurpose is invalid." };
  }
  if (!inSet(r.clientSegment, CLIENT_SEGMENTS)) {
    return { ok: false, error: "clientSegment is invalid." };
  }
  if (!inSet(r.clientStage, CLIENT_STAGES)) {
    return { ok: false, error: "clientStage is invalid." };
  }
  if (!inSet(r.tone, TONES)) {
    return { ok: false, error: "tone is invalid." };
  }
  if (!inSet(r.urgency, URGENCIES)) {
    return { ok: false, error: "urgency is invalid." };
  }
  if (typeof r.communicationGoal !== "string" || !r.communicationGoal.trim()) {
    return { ok: false, error: "communicationGoal is required." };
  }
  if (r.communicationGoal.length > 600) {
    return { ok: false, error: "communicationGoal must be 600 characters or fewer." };
  }
  const notes = typeof r.notes === "string" ? r.notes : "";
  if (notes.length > 1500) {
    return { ok: false, error: "notes must be 1500 characters or fewer." };
  }

  const regenerationMode = r.regenerationMode;
  if (regenerationMode !== undefined && !inSet(regenerationMode, REGENERATION_MODES)) {
    return { ok: false, error: "regenerationMode is invalid." };
  }

  return {
    ok: true,
    value: {
      clientId: r.clientId.trim(),
      emailPurpose: r.emailPurpose,
      clientSegment: r.clientSegment,
      clientStage: r.clientStage,
      communicationGoal: r.communicationGoal.trim(),
      tone: r.tone,
      urgency: r.urgency,
      notes: notes.trim() || undefined,
      regenerationMode: regenerationMode ?? "default",
    },
  };
}

interface OpenAiEmail {
  subject: string;
  body: string;
}

interface OpenAiPayloadInputs {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Invariant check: the only text that ever reaches OpenAI is the system and
 * user prompts. Verify that neither contains the loaded client's first name,
 * full name, or email. If this check fails we abort BEFORE the network call
 * and surface a 500 — better to fail loudly than to leak.
 */
function assertNoPiiInOpenAiPayload(
  inputs: OpenAiPayloadInputs,
  pii: { firstName: string; fullName: string; email: string }
): { ok: true } | { ok: false; leaked: string } {
  const haystack = `${inputs.systemPrompt}\n${inputs.userPrompt}`.toLowerCase();
  const checks: Array<[string, string]> = [
    ["firstName", pii.firstName],
    ["fullName", pii.fullName],
    ["email", pii.email],
  ];
  for (const [label, value] of checks) {
    const v = value.trim().toLowerCase();
    if (!v) continue;
    // For names we want a whole-word match (so "Kim" inside "Kimball" is fine
    // and not a false positive). For the email a substring match is correct.
    if (label === "email") {
      if (haystack.includes(v)) return { ok: false, leaked: label };
    } else {
      const tokens = v.split(/\s+/).filter((t) => t.length >= 3);
      for (const token of tokens) {
        const re = new RegExp(
          `\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
          "i"
        );
        if (re.test(haystack)) return { ok: false, leaked: `${label}:${token}` };
      }
    }
  }
  return { ok: true };
}

async function callOpenAi(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<
  | { ok: true; email: OpenAiEmail }
  | { ok: false; status: number; error: string; detail?: string }
> {
  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
  let upstream: Response;
  try {
    upstream = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "secure_email_draft",
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
      }),
    });
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error: "Failed to reach the AI provider.",
      detail: String(err),
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
    return { ok: false, status: 502, error: "AI provider returned non-JSON." };
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return { ok: false, status: 502, error: "AI provider returned empty response." };
  }

  let parsed: OpenAiEmail;
  try {
    parsed = JSON.parse(content) as OpenAiEmail;
  } catch {
    return {
      ok: false,
      status: 502,
      error: "AI provider returned malformed JSON.",
      detail: content,
    };
  }
  if (
    typeof parsed.subject !== "string" ||
    typeof parsed.body !== "string" ||
    !parsed.subject.trim() ||
    !parsed.body.trim()
  ) {
    return { ok: false, status: 502, error: "AI provider returned an incomplete email." };
  }
  return {
    ok: true,
    email: { subject: parsed.subject.trim(), body: parsed.body.trim() },
  };
}

/**
 * Used when MOCK_AI=true or no OPENAI_API_KEY is set. Returns the rendered
 * template unchanged so the rest of the pipeline (disclaimer, risk scan, save)
 * can still be exercised end-to-end.
 */
function buildMockEmail(rendered: { subject: string; body: string }): OpenAiEmail {
  return { subject: rendered.subject, body: rendered.body };
}

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseRequest(raw);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const input = parsed.value;

  // 1. Resolve the client server-side. The id is the only client identifier
  //    that crosses the network boundary from the browser.
  let client;
  try {
    client = await getClientById(input.clientId);
  } catch (err) {
    return Response.json(
      {
        error: "Client lookup failed.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
  if (!client) {
    return Response.json({ error: "Client not found." }, { status: 404 });
  }

  // 2. Pre-flight risk scan on advisor input. Runs BEFORE anything is sent to
  //    OpenAI. Includes a client-name-leak check using the looked-up record
  //    (the advisor may have copy-pasted the name into the goal field).
  const findings: RiskFinding[] = [
    ...scanForRisks(input.communicationGoal),
    ...(input.notes ? scanForRisks(input.notes) : []),
  ];
  const goalNameLeak = scanForClientNameLeak(input.communicationGoal, client.name);
  if (goalNameLeak) findings.push(goalNameLeak);
  if (input.notes) {
    const noteNameLeak = scanForClientNameLeak(input.notes, client.name);
    if (noteNameLeak) findings.push(noteNameLeak);
  }

  if (findings.length > 0) {
    return Response.json(
      {
        error:
          "Please remove personally identifiable information or confidential financial details before generating the draft.",
        riskFlags: findings.map((f) => ({
          flag: f.flag,
          label: flagLabel(f.flag),
          message: f.message,
        })),
      },
      { status: 400 }
    );
  }

  // 3. Render the approved template. This template carries the [Client First
  //    Name] / [Advisor Name] placeholders verbatim — they are not filled in
  //    here and they are not filled in by the AI either.
  const template = getApprovedTemplate(input.emailPurpose);
  const rendered = renderTemplate(template, {
    clientSegment: input.clientSegment,
    clientStage: input.clientStage,
    tone: input.tone,
    urgency: input.urgency,
    communicationGoal: input.communicationGoal,
  });

  // 4. Build the OpenAI prompt. CRITICAL: the prompt is constructed from
  //    abstracted fields only. The looked-up client's name and email are
  //    NEVER passed to buildUserPrompt or buildSystemPrompt.
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({
    emailPurpose: input.emailPurpose,
    clientSegment: input.clientSegment,
    clientStage: input.clientStage,
    communicationGoal: input.communicationGoal,
    tone: input.tone,
    urgency: input.urgency,
    notes: input.notes,
    regenerationMode: input.regenerationMode,
    approvedTemplate: rendered,
  });

  // 5. Defence-in-depth: assert that the prompt we are about to send does NOT
  //    contain the client's first name, full name, or email. If it does, fail
  //    closed before the network call.
  const advisor = getCurrentUser();
  const compliance = await getComplianceSettings().catch(() => null);

  const piiCheck = assertNoPiiInOpenAiPayload(
    { systemPrompt, userPrompt },
    { firstName: client.name.split(/\s+/)[0] ?? "", fullName: client.name, email: client.email }
  );
  if (!piiCheck.ok) {
    return Response.json(
      {
        error:
          "Internal privacy guard tripped: PII would have been sent to the AI provider. Generation aborted.",
        detail: piiCheck.leaked,
      },
      { status: 500 }
    );
  }

  // 6. Call OpenAI (or the mock).
  const apiKey = process.env.OPENAI_API_KEY;
  const mockMode = process.env.MOCK_AI === "true" || !apiKey;

  let aiEmail: OpenAiEmail;
  if (mockMode) {
    aiEmail = buildMockEmail(rendered);
  } else {
    const ai = await callOpenAi(apiKey!, systemPrompt, userPrompt);
    if (!ai.ok) {
      return Response.json(
        { error: ai.error, ...(ai.detail ? { detail: ai.detail } : {}) },
        { status: ai.status }
      );
    }
    aiEmail = ai.email;
  }

  // 7. Output-side risk scan (still on placeholder text — substitution happens
  //    after this). If something risky slipped through, fall back to the
  //    rendered template body but keep the flag for audit.
  const outputFindings = scanForRisks(aiEmail.body);
  let placeholderSubject = aiEmail.subject;
  let placeholderBody = aiEmail.body;
  if (outputFindings.length > 0) {
    placeholderSubject = rendered.subject;
    placeholderBody = rendered.body;
  }

  // 8. Enforce that placeholders are still present. The model was told not to
  //    fill them in; if it did, we restore them by reverting to the rendered
  //    template body. This guarantees the audit copy is placeholder-only.
  const missingPlaceholder =
    !placeholderBody.includes(CLIENT_FIRST_NAME_PLACEHOLDER) ||
    !placeholderBody.includes(ADVISOR_NAME_PLACEHOLDER);
  if (missingPlaceholder) {
    placeholderSubject = rendered.subject;
    placeholderBody = rendered.body;
  }
  const generatedDraftBody = appendComplianceFooter(
    placeholderBody,
    compliance?.mandatoryFooter ?? ""
  );

  // 9. Server-side substitution. We substitute the client's first name now —
  //    the client is known. We deliberately leave [Advisor Name] as a
  //    placeholder; it will be replaced at send time using the user resolved
  //    from the PIN that approved the send.
  const firstName = client.name.split(/\s+/)[0] ?? "";
  const finalSubject = substitutePlaceholders(placeholderSubject, { firstName });
  const finalBody = substitutePlaceholders(generatedDraftBody, { firstName });

  // 10. Persist with sanitized context only. The notes field is redacted
  //     defensively even though the risk scanner already passed.
  try {
    const sanitizedNotes = input.notes ? redactPII(input.notes) : null;

    const allFlags = Array.from(
      new Set([...findings, ...outputFindings].map((f) => f.flag))
    );

    const saved = await insertSecureEmailDraft({
      advisorId: advisor.id,
      clientId: client.id,
      emailPurpose: input.emailPurpose,
      clientSegment: input.clientSegment,
      clientStage: input.clientStage,
      tone: input.tone,
      urgency: input.urgency,
      sanitizedContext: {
        communicationGoal: input.communicationGoal,
        notes: sanitizedNotes,
        regenerationMode: input.regenerationMode,
        outputStripped: outputFindings.length > 0,
        placeholderRestored: missingPlaceholder,
        mock: mockMode,
        complianceProof:
          "AI draft generated with placeholders only. Personalization applied after generation.",
      },
      generatedDraft: `Subject: ${placeholderSubject}\n\n${generatedDraftBody}`,
      finalBody,
      finalSubject,
      recipientEmail: client.email,
      templateName: template.name,
      riskFlags: allFlags,
    });

    return Response.json({
      draftId: saved.id,
      templateName: saved.template_name,
      subject: finalSubject,
      generatedDraft: saved.generated_draft,
      finalBody,
      recipientEmail: client.email,
      status: saved.status,
      riskFlags: saved.risk_flags,
    } satisfies GenerateDraftResponse);
  } catch (err) {
    if (err instanceof SupabaseConfigError) {
      return Response.json({ error: err.message }, { status: 500 });
    }
    return Response.json(
      {
        error: "Failed to save draft.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
