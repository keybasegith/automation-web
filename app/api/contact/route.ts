import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InquiryPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  topic?: string;
  message: string;
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

  const data = body as Partial<InquiryPayload>;

  if (!isString(data.firstName)) {
    return NextResponse.json(
      { error: "First name is required." },
      { status: 400 },
    );
  }
  if (!isString(data.lastName)) {
    return NextResponse.json(
      { error: "Last name is required." },
      { status: 400 },
    );
  }
  if (!isString(data.email) || !EMAIL_RE.test(data.email)) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 400 },
    );
  }
  if (!isString(data.message)) {
    return NextResponse.json(
      { error: "Please include a message." },
      { status: 400 },
    );
  }
  if (data.consent !== true) {
    return NextResponse.json(
      { error: "Consent is required." },
      { status: 400 },
    );
  }

  const payload = {
    submittedAt: new Date().toISOString(),
    source: "contact-form",
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone?.trim() ?? "",
    topic: data.topic?.trim() ?? "General Inquiry",
    message: data.message.trim(),
    consent: true,
  };

  // Always log the inquiry server-side as a recovery backup, so submissions
  // are never lost even if the webhook is unset or fails.
  console.log("[contact]", JSON.stringify(payload));

  const webhookUrl = process.env.CONTACT_INQUIRY_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn(
      "[contact] CONTACT_INQUIRY_WEBHOOK_URL is not set — inquiry logged above but not forwarded.",
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
        "[contact] Webhook returned non-2xx:",
        response.status,
        text,
      );
      return NextResponse.json({ ok: true, forwarded: false });
    }
  } catch (err) {
    console.error("[contact] Failed to call webhook:", err);
    return NextResponse.json({ ok: true, forwarded: false });
  }

  return NextResponse.json({ ok: true, forwarded: true });
}
