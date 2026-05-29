import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LeadPayload = {
  fullName: string;
  email: string;
  phone: string;
  timeline?: string;
  consent: boolean;
};

const isString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const data = body as Partial<LeadPayload>;

  if (!isString(data.fullName)) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!isString(data.email) || !EMAIL_RE.test(data.email)) {
    return NextResponse.json(
      { error: "Valid email is required." },
      { status: 400 },
    );
  }
  if (!isString(data.phone)) {
    return NextResponse.json({ error: "Phone is required." }, { status: 400 });
  }
  if (data.consent !== true) {
    return NextResponse.json(
      { error: "Consent is required." },
      { status: 400 },
    );
  }

  const payload = {
    submittedAt: new Date().toISOString(),
    source: "trivia-game-form",
    fullName: data.fullName.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone.trim(),
    timeline: data.timeline?.trim() ?? "",
    consent: true,
  };

  // Always log the lead server-side as a recovery backup. If the webhook
  // ever fails, leads can still be recovered from server logs.
  console.log("[trivia-lead]", JSON.stringify(payload));

  const webhookUrl = process.env.TRIVIA_LEAD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn(
      "[trivia-lead] TRIVIA_LEAD_WEBHOOK_URL is not set — lead logged above but not forwarded to Google Sheets.",
    );
    return NextResponse.json({ ok: true, forwarded: false });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        "[trivia-lead] Apps Script webhook returned non-2xx:",
        response.status,
        text,
      );
      return NextResponse.json({ ok: true, forwarded: false });
    }
  } catch (err) {
    console.error("[trivia-lead] Failed to call Apps Script webhook:", err);
    return NextResponse.json({ ok: true, forwarded: false });
  }

  return NextResponse.json({ ok: true, forwarded: true });
}
