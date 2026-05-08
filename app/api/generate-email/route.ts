import { generateMockEmail } from "@/lib/email/mockGenerator";
import { buildPrompt } from "@/lib/email/prompt";
import {
  CLIENT_TYPES,
  COMMUNICATION_STYLES,
  EVENT_TYPES,
  INVESTMENT_HORIZONS,
  RISK_TOLERANCES,
  SEVERITIES,
  TONES,
  type DocumentRefreshContext,
  type DocumentRefreshItem,
  type GenerateEmailRequest,
  type GenerateEmailResponse,
  type MarketContext,
} from "@/lib/email/types";
import { logAudit } from "@/lib/db/audit";
import { upsertClientByEmail, getClientById } from "@/lib/db/clientsRepo";
import { getComplianceSettings } from "@/lib/db/compliance";
import { saveGeneratedEmail } from "@/lib/db/emailsRepo";
import {
  isServerSupabaseConfigured,
  SupabaseConfigError,
} from "@/lib/supabaseClient";
import { getCurrentUser } from "@/lib/currentUser";
import { assertSafeForOpenAI } from "@/lib/compliance/sanitizer";
import {
  substitutePlaceholders,
  deriveFirstName,
} from "@/lib/compliance/placeholders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o";

const inSet = <T extends string>(value: unknown, set: readonly T[]): value is T =>
  typeof value === "string" && (set as readonly string[]).includes(value);

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const isEmail = (value: unknown): value is string =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function validate(payload: unknown):
  | { ok: true; value: GenerateEmailRequest }
  | { ok: false; error: string } {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const p = payload as Record<string, unknown>;
  const client = p.client as Record<string, unknown> | undefined;
  const event = p.event as Record<string, unknown> | undefined;
  const preferences = p.preferences as Record<string, unknown> | undefined;

  if (!client || !event || !preferences) {
    return { ok: false, error: "Missing client, event, or preferences." };
  }

  if (typeof client.clientName !== "string" || !client.clientName.trim()) {
    return { ok: false, error: "client.clientName is required." };
  }
  if (!isEmail(client.email)) {
    return { ok: false, error: "client.email must be a valid email address." };
  }
  const age = Number(client.age);
  if (!Number.isFinite(age) || age < 18 || age > 120) {
    return { ok: false, error: "client.age must be a number between 18 and 120." };
  }
  if (!inSet(client.riskTolerance, RISK_TOLERANCES)) {
    return { ok: false, error: "client.riskTolerance is invalid." };
  }
  if (!inSet(client.investmentHorizon, INVESTMENT_HORIZONS)) {
    return { ok: false, error: "client.investmentHorizon is invalid." };
  }
  const portfolioValue = Number(client.portfolioValue);
  if (!Number.isFinite(portfolioValue) || portfolioValue < 0) {
    return { ok: false, error: "client.portfolioValue must be a non-negative number." };
  }
  if (!inSet(client.clientType, CLIENT_TYPES)) {
    return { ok: false, error: "client.clientType is invalid." };
  }

  if (!inSet(event.eventType, EVENT_TYPES)) {
    return { ok: false, error: "event.eventType is invalid." };
  }
  const eventDetails =
    typeof event.eventDetails === "string" ? event.eventDetails : "";

  if (!inSet(preferences.tone, TONES)) {
    return { ok: false, error: "preferences.tone is invalid." };
  }
  if (!inSet(preferences.communicationStyle, COMMUNICATION_STYLES)) {
    return { ok: false, error: "preferences.communicationStyle is invalid." };
  }

  let marketContext: MarketContext | undefined;
  if (p.marketContext !== undefined && p.marketContext !== null) {
    if (typeof p.marketContext !== "object") {
      return { ok: false, error: "marketContext must be an object." };
    }
    const mc = p.marketContext as Record<string, unknown>;
    const sp500Change = Number(mc.sp500Change);
    const nasdaqChange = Number(mc.nasdaqChange);
    if (!Number.isFinite(sp500Change) || !Number.isFinite(nasdaqChange)) {
      return {
        ok: false,
        error: "marketContext.sp500Change and nasdaqChange must be numbers.",
      };
    }
    if (typeof mc.date !== "string" || !mc.date.trim()) {
      return { ok: false, error: "marketContext.date is required." };
    }
    if (!inSet(mc.severity, SEVERITIES)) {
      return { ok: false, error: "marketContext.severity is invalid." };
    }
    marketContext = {
      sp500Change,
      nasdaqChange,
      date: mc.date,
      severity: mc.severity,
    };
  }

  let documentContext: DocumentRefreshContext | undefined;
  if (p.documentContext !== undefined && p.documentContext !== null) {
    if (typeof p.documentContext !== "object") {
      return { ok: false, error: "documentContext must be an object." };
    }
    const dc = p.documentContext as Record<string, unknown>;
    if (dc.priority !== "HIGH" && dc.priority !== "MEDIUM") {
      return {
        ok: false,
        error: "documentContext.priority must be HIGH or MEDIUM.",
      };
    }
    if (!Array.isArray(dc.documents) || dc.documents.length === 0) {
      return {
        ok: false,
        error: "documentContext.documents must be a non-empty array.",
      };
    }
    const docs: DocumentRefreshItem[] = [];
    for (const raw of dc.documents) {
      if (!raw || typeof raw !== "object") {
        return { ok: false, error: "documentContext.documents item invalid." };
      }
      const item = raw as Record<string, unknown>;
      if (typeof item.type !== "string" || !item.type.trim()) {
        return { ok: false, error: "document.type is required." };
      }
      if (item.status !== "expiring" && item.status !== "expired") {
        return {
          ok: false,
          error: "document.status must be 'expiring' or 'expired'.",
        };
      }
      if (typeof item.expiryDate !== "string" || !item.expiryDate.trim()) {
        return { ok: false, error: "document.expiryDate is required." };
      }
      docs.push({
        type: item.type.trim(),
        status: item.status,
        expiryDate: item.expiryDate.trim(),
      });
    }
    documentContext = { priority: dc.priority, documents: docs };
  }

  let clientId: string | undefined;
  if (p.clientId !== undefined && p.clientId !== null) {
    if (!isUuid(p.clientId)) {
      return { ok: false, error: "clientId must be a UUID." };
    }
    clientId = p.clientId;
  }

  return {
    ok: true,
    value: {
      client: {
        clientName: client.clientName.trim(),
        email: client.email.trim(),
        age,
        riskTolerance: client.riskTolerance,
        investmentHorizon: client.investmentHorizon,
        portfolioValue,
        clientType: client.clientType,
      },
      event: {
        eventType: event.eventType,
        eventDetails: eventDetails.trim(),
      },
      preferences: {
        tone: preferences.tone,
        communicationStyle: preferences.communicationStyle,
      },
      ...(marketContext ? { marketContext } : {}),
      ...(documentContext ? { documentContext } : {}),
      ...(clientId ? { clientId } : {}),
    },
  };
}

interface OpenAiEmail {
  subject: string;
  body: string;
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

  // Defense-in-depth: the prompt is built from non-PII enums (see prompt.ts
  // contract) but if a future refactor accidentally adds a forbidden key
  // to the request body, this assertion stops the leak before fetch().
  const requestBody = {
    model,
    temperature: 0.7,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "client_email",
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
    return {
      ok: false,
      status: 502,
      error: "AI provider returned a non-JSON response.",
    };
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return { ok: false, status: 502, error: "AI provider returned an empty response." };
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

export async function POST(request: Request) {
  const mockMode = process.env.MOCK_AI === "true";
  const apiKey = process.env.OPENAI_API_KEY;

  if (!mockMode && !apiKey) {
    return Response.json(
      {
        error:
          "Server is not configured. Set OPENAI_API_KEY in .env.local (or MOCK_AI=true for demo mode) and restart the dev server.",
      },
      { status: 500 }
    );
  }

  if (!isServerSupabaseConfigured()) {
    return Response.json(
      {
        error:
          "Database is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local. Compliance requires every email to be persisted.",
      },
      { status: 500 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = validate(raw);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  let aiEmail: { subject: string; body: string };
  if (mockMode) {
    aiEmail = await generateMockEmail(result.value);
  } else {
    // Pull firm compliance overrides (signature, mandatory footer, allow/deny phrases)
    // and inject them into the system prompt before calling the model.
    let complianceSettings;
    try {
      complianceSettings = await getComplianceSettings();
    } catch {
      // If the compliance table doesn't exist yet (migration 002 not run),
      // fall back to base prompt rather than failing the request.
      complianceSettings = undefined;
    }
    const { systemPrompt, userPrompt } = buildPrompt(
      result.value,
      complianceSettings
    );
    const ai = await callOpenAi(apiKey!, systemPrompt, userPrompt);
    if (!ai.ok) {
      return Response.json(
        { error: ai.error, ...(ai.detail ? { detail: ai.detail } : {}) },
        { status: ai.status }
      );
    }
    aiEmail = ai.email;
  }

  // Persist + audit. Compliance requires this to succeed.
  try {
    const user = getCurrentUser();
    const { client, event, marketContext, documentContext, clientId } =
      result.value;

    let resolvedClientId: string;
    if (clientId) {
      const existing = await getClientById(clientId);
      if (!existing) {
        return Response.json(
          { error: `Client with id ${clientId} not found.` },
          { status: 404 }
        );
      }
      resolvedClientId = existing.id;
    } else {
      const upserted = await upsertClientByEmail({
        name: client.clientName,
        email: client.email,
        riskTolerance: client.riskTolerance,
        portfolioValue: client.portfolioValue,
      });
      resolvedClientId = upserted.id;
    }

    // The model returns the draft with [CLIENT_NAME] tokens. Substitution
    // happens here, INSIDE our system, with the real name pulled from the
    // validated request. The personalized text is what we persist + return,
    // but it never re-enters any OpenAI call.
    const subjectSub = substitutePlaceholders(aiEmail.subject, {
      CLIENT_NAME: client.clientName,
      CLIENT_FIRST_NAME: deriveFirstName(client.clientName),
    });
    const bodySub = substitutePlaceholders(aiEmail.body, {
      CLIENT_NAME: client.clientName,
      CLIENT_FIRST_NAME: deriveFirstName(client.clientName),
    });

    const saved = await saveGeneratedEmail({
      clientId: resolvedClientId,
      subject: subjectSub.text,
      body: bodySub.text,
      createdBy: user.id,
    });

    // Audit metadata intentionally OMITS clientName and clientEmail — those
    // are joinable from the clients row by clientId and don't need a second
    // home in audit_logs (which is exported for compliance review and may
    // be retained longer than active client data).
    await logAudit({
      userId: user.id,
      action: "GENERATE_EMAIL",
      entityType: "email",
      entityId: saved.id,
      metadata: {
        clientId: resolvedClientId,
        eventType: event.eventType,
        placeholdersSubstituted: Array.from(
          new Set([...subjectSub.substituted, ...bodySub.substituted])
        ),
        ...(marketContext
          ? {
              marketContext: {
                sp500Change: marketContext.sp500Change,
                nasdaqChange: marketContext.nasdaqChange,
                severity: marketContext.severity,
                date: marketContext.date,
              },
            }
          : {}),
        ...(documentContext
          ? {
              documentRefresh: {
                priority: documentContext.priority,
                documentTypes: documentContext.documents.map((d) => d.type),
                documentCount: documentContext.documents.length,
              },
            }
          : {}),
      },
    });

    return Response.json({
      subject: subjectSub.text,
      body: bodySub.text,
      emailId: saved.id,
    } satisfies GenerateEmailResponse);
  } catch (err) {
    if (err instanceof SupabaseConfigError) {
      return Response.json({ error: err.message }, { status: 500 });
    }
    return Response.json(
      {
        error: "Failed to persist generated email.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
