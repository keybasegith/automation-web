import {
  EMPTY_EXTRACTION,
  EXTRACTION_FIELDS,
  SOURCE_TYPES,
  type ExtractedClientData,
  type SourceType,
} from "@/lib/extraction/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_INPUT_CHARS = 20_000;

const SYSTEM_PROMPT = `You are a data extraction assistant for financial documents.

Extract structured client information from the input text.

Rules:
- Do NOT infer or guess missing values.
- Only extract what is explicitly present in the input.
- If a field is missing or ambiguous, return null for that field.
- Do NOT auto-correct, normalize, or reformat values beyond trimming whitespace.
- Output strictly valid JSON matching the provided schema.`;

const buildUserPrompt = (text: string, source: SourceType) =>
  `Source document type: ${source}

Document content:
"""
${text}
"""

Extract the following fields. Return null for any field not explicitly present:
- full_name
- date_of_birth
- address
- email
- phone
- employment_status
- annual_income
- risk_tolerance
- investment_horizon

Return JSON only.`;

const inSet = <T extends string>(value: unknown, set: readonly T[]): value is T =>
  typeof value === "string" && (set as readonly string[]).includes(value);

const nullableStringSchema = { type: ["string", "null"] };

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [...EXTRACTION_FIELDS],
  properties: Object.fromEntries(
    EXTRACTION_FIELDS.map((f) => [f, nullableStringSchema])
  ),
};

function normalizeValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function shapeExtraction(raw: unknown): ExtractedClientData {
  if (!raw || typeof raw !== "object") return { ...EMPTY_EXTRACTION };
  const record = raw as Record<string, unknown>;
  const result = { ...EMPTY_EXTRACTION };
  for (const field of EXTRACTION_FIELDS) {
    result[field] = normalizeValue(record[field]);
  }
  return result;
}

/**
 * Regex-based fallback used when MOCK_AI=true. Intentionally weak — matches
 * obvious formats (email, phone, ISO date, dollar amount) and leaves the
 * rest as null. Real extraction quality only comes from the OpenAI path.
 */
function mockExtract(text: string): ExtractedClientData {
  const result = { ...EMPTY_EXTRACTION };

  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (emailMatch) result.email = emailMatch[0];

  const phoneMatch = text.match(
    /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/
  );
  if (phoneMatch) result.phone = phoneMatch[0];

  const dobMatch = text.match(/\b(19|20)\d{2}-\d{2}-\d{2}\b/);
  if (dobMatch) result.date_of_birth = dobMatch[0];

  const incomeMatch = text.match(/\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/);
  if (incomeMatch) result.annual_income = incomeMatch[1].replace(/,/g, "");

  const riskMatch = text.match(/risk[\s:_-]+tolerance[\s:_-]+(low|medium|high)/i);
  if (riskMatch) result.risk_tolerance = riskMatch[1];

  const horizonMatch = text.match(/(\d+\+?\s*years?|short-term|long-term|medium-term)/i);
  if (horizonMatch) result.investment_horizon = horizonMatch[1];

  return result;
}

interface ExtractRequestBody {
  text?: unknown;
  source?: unknown;
}

export async function POST(request: Request) {
  let body: ExtractRequestBody;
  try {
    body = (await request.json()) as ExtractRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.text !== "string" || !body.text.trim()) {
    return Response.json(
      { error: "`text` is required and must be a non-empty string." },
      { status: 400 }
    );
  }
  if (body.text.length > MAX_INPUT_CHARS) {
    return Response.json(
      {
        error: `Input is ${body.text.length} characters; maximum is ${MAX_INPUT_CHARS}.`,
      },
      { status: 413 }
    );
  }
  if (!inSet(body.source, SOURCE_TYPES)) {
    return Response.json(
      { error: `\`source\` must be one of: ${SOURCE_TYPES.join(", ")}.` },
      { status: 400 }
    );
  }

  const text = body.text;
  const source = body.source;

  // Demo / offline path.
  if (process.env.MOCK_AI === "true") {
    return Response.json({
      data: mockExtract(text),
      source,
      model: "mock",
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "Server is not configured. Set OPENAI_API_KEY in .env.local (or MOCK_AI=true) and restart the dev server.",
      },
      { status: 500 }
    );
  }

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
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(text, source) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "extracted_client_data",
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
      }),
    });
  } catch (err) {
    return Response.json(
      { error: "Failed to reach the AI provider.", detail: String(err) },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return Response.json(
      { error: `AI provider returned ${upstream.status}.`, detail },
      { status: 502 }
    );
  }

  let payload: { choices?: { message?: { content?: string } }[] };
  try {
    payload = await upstream.json();
  } catch {
    return Response.json(
      { error: "AI provider returned a non-JSON response." },
      { status: 502 }
    );
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    return Response.json(
      { error: "AI provider returned an empty response." },
      { status: 502 }
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return Response.json(
      { error: "AI provider returned malformed JSON.", detail: content },
      { status: 502 }
    );
  }

  return Response.json({
    data: shapeExtraction(parsed),
    source,
    model,
  });
}
