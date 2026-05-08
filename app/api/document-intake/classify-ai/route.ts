import { NextResponse } from "next/server";
import {
  DOCUMENT_CATALOG,
  DOCUMENT_CATEGORIES,
} from "@/lib/document-intake/documentCatalog";

export const dynamic = "force-dynamic";

interface RequestBody {
  pageNumber: number;
  text: string;
  keywordResult: {
    documentName: string;
    category: string;
    documentCode?: string;
    confidence: number;
    reason: string;
    matchedKeywords: string[];
  };
}

interface AIResultPayload {
  documentName: string;
  documentCode?: string;
  category: string;
  confidence: number;
  reason: string;
}

const MAX_TEXT_CHARS = 4000;

function buildSystemPrompt(): string {
  // Strict guardrails per the compliance language requirements: the model
  // must never approve, validate, or imply legal validity. It only suggests
  // a likely document type.
  return [
    "You are a document classification assistant for a Canadian regulated financial firm.",
    "You ONLY suggest the likely document type for a single page of an onboarding package.",
    "You DO NOT approve, validate, or comment on compliance.",
    "You DO NOT say a document is valid, compliant, complete, or correct.",
    "You DO NOT give compliance advice or legal opinions.",
    "Use safe language only: 'likely document type', 'detected', 'possible match', 'needs review'.",
    "Always respond with a single JSON object — no prose, no markdown.",
    "If you are uncertain, return documentName='Unknown', category='Unknown', confidence < 50, and explain why in the reason.",
  ].join(" ");
}

function buildUserPrompt(body: RequestBody): string {
  const allowedDocs = DOCUMENT_CATALOG.map((d) =>
    d.documentCode
      ? `- ${d.documentName} (code ${d.documentCode}, category ${d.category})`
      : `- ${d.documentName} (category ${d.category})`
  ).join("\n");

  const truncated = body.text.length > MAX_TEXT_CHARS
    ? body.text.slice(0, MAX_TEXT_CHARS) + " …[truncated]"
    : body.text;

  return [
    `Page number: ${body.pageNumber}`,
    "",
    "Existing keyword classifier result (low confidence — that is why you are being consulted):",
    JSON.stringify(body.keywordResult, null, 2),
    "",
    "Allowed document categories:",
    DOCUMENT_CATEGORIES.join(", "),
    "",
    "Allowed document names (must pick one of these, or 'Other' / 'Unknown'):",
    allowedDocs,
    "",
    "Extracted text from this page:",
    "<<<TEXT_START>>>",
    truncated,
    "<<<TEXT_END>>>",
    "",
    'Return JSON in this exact shape: {"documentName": string, "documentCode": string | null, "category": string, "confidence": number (0-99), "reason": string}',
    "Do not include any other text, markdown, or commentary outside the JSON.",
  ].join("\n");
}

function parseJsonObject(raw: string): AIResultPayload | null {
  // Strip code fences if the model included them despite instructions.
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  }
  // Find the outermost {...} block.
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  s = s.slice(start, end + 1);
  try {
    const parsed = JSON.parse(s) as Partial<AIResultPayload> & {
      documentCode?: string | null;
    };
    if (
      typeof parsed.documentName !== "string" ||
      typeof parsed.category !== "string" ||
      typeof parsed.reason !== "string" ||
      typeof parsed.confidence !== "number"
    ) {
      return null;
    }
    return {
      documentName: parsed.documentName,
      documentCode:
        typeof parsed.documentCode === "string" && parsed.documentCode.trim() !== ""
          ? parsed.documentCode
          : undefined,
      category: parsed.category,
      confidence: Math.max(0, Math.min(99, Math.round(parsed.confidence))),
      reason: parsed.reason,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        message:
          "AI classification is not configured. Set OPENAI_API_KEY in the server environment to enable it.",
      },
      { status: 503 }
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, configured: true, message: "Invalid JSON body" },
      { status: 400 }
    );
  }
  if (
    typeof body?.pageNumber !== "number" ||
    typeof body?.text !== "string" ||
    !body?.keywordResult
  ) {
    return NextResponse.json(
      { ok: false, configured: true, message: "Missing required fields" },
      { status: 400 }
    );
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt(body) },
        ],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          configured: true,
          message: `OpenAI returned ${upstream.status}: ${errText.slice(0, 200)}`,
        },
        { status: 502 }
      );
    }

    const data = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = parseJsonObject(content);
    if (!parsed) {
      return NextResponse.json(
        {
          ok: false,
          configured: true,
          message: "AI classifier returned an unparseable response",
        },
        { status: 502 }
      );
    }

    // Sanity-clamp confidence and strip any compliance-flavored phrasing the
    // model might have slipped into the reason field.
    const reason = parsed.reason.replace(
      /\b(compliant|compliance passed|approved|legally valid|verified)\b/gi,
      "detected"
    );

    return NextResponse.json({
      ok: true,
      configured: true,
      result: {
        documentName: parsed.documentName,
        documentCode: parsed.documentCode,
        category: parsed.category,
        confidence: parsed.confidence,
        reason,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        message:
          err instanceof Error
            ? `AI classifier failed: ${err.message}`
            : "AI classifier failed",
      },
      { status: 502 }
    );
  }
}
