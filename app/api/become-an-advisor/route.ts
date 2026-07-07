import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdvisorPayload = {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  bookOfBusiness?: string;
  investments?: string[];
  doesInsurance?: string;
  licensing?: string[];
  ageRange?: string;
  yearsInBusiness?: string;
  businessMode?: string;
  consent: boolean;
};

const isString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const data = body as Partial<AdvisorPayload>;

  if (!isString(data.name)) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!isString(data.email) || !EMAIL_RE.test(data.email)) {
    return NextResponse.json(
      { error: "A valid email is required." },
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
    source: "become-an-advisor-form",
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone?.trim() ?? "",
    location: data.location?.trim() ?? "",
    bookOfBusiness: data.bookOfBusiness?.trim() ?? "",
    investments: asStringArray(data.investments),
    doesInsurance: data.doesInsurance?.trim() ?? "",
    licensing: asStringArray(data.licensing),
    ageRange: data.ageRange?.trim() ?? "",
    yearsInBusiness: data.yearsInBusiness?.trim() ?? "",
    businessMode: data.businessMode?.trim() ?? "",
    consent: true,
  };

  // Always log the submission server-side as a recovery backup, so it is
  // never lost even if the webhook is unset or fails.
  console.log("[become-an-advisor]", JSON.stringify(payload));

  const webhookUrl =
    process.env.ADVISOR_APPLICATION_WEBHOOK_URL ??
    process.env.CONTACT_INQUIRY_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn(
      "[become-an-advisor] No webhook URL set — submission logged above but not forwarded.",
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
        "[become-an-advisor] Webhook returned non-2xx:",
        response.status,
        text,
      );
      return NextResponse.json({ ok: true, forwarded: false });
    }
  } catch (err) {
    console.error("[become-an-advisor] Failed to call webhook:", err);
    return NextResponse.json({ ok: true, forwarded: false });
  }

  return NextResponse.json({ ok: true, forwarded: true });
}
