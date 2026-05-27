import {
  sendBusinessCardLead,
  type BusinessCardLead,
} from "@/lib/email/sendBusinessCardLead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_RECIPIENTS = new Set<string>([
  "daxs@keybase.com",
  "dstrukan@keybase.com",
  "shutchinson@keybase.com",
  "nalford@keybase.com",
  "mark.garcia@keybase.com",
]);

type RawPayload = Partial<Record<keyof BusinessCardLead, unknown>>;

function asTrimmedString(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(request: Request) {
  let raw: RawPayload;
  try {
    raw = (await request.json()) as RawPayload;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const recipientEmail = asTrimmedString(raw.recipientEmail, 200).toLowerCase();
  const recipientName = asTrimmedString(raw.recipientName, 120);
  const name = asTrimmedString(raw.name, 120);
  const email = asTrimmedString(raw.email, 200);
  const phone = asTrimmedString(raw.phone, 40);
  const company = asTrimmedString(raw.company, 120);
  const preferredContactRaw = asTrimmedString(raw.preferredContact, 20);
  const message = asTrimmedString(raw.message, 2000);

  if (!ALLOWED_RECIPIENTS.has(recipientEmail)) {
    return Response.json(
      { error: "Unknown recipient." },
      { status: 400 },
    );
  }
  if (!recipientName) {
    return Response.json({ error: "recipientName is required." }, { status: 400 });
  }
  if (!name) {
    return Response.json({ error: "Name is required." }, { status: 400 });
  }
  if (!email || !isEmail(email)) {
    return Response.json({ error: "A valid email is required." }, { status: 400 });
  }
  const preferredContact =
    preferredContactRaw === "email" ||
    preferredContactRaw === "phone" ||
    preferredContactRaw === "either"
      ? (preferredContactRaw as BusinessCardLead["preferredContact"])
      : null;
  if (!preferredContact) {
    return Response.json(
      { error: "preferredContact must be one of: email, phone, either." },
      { status: 400 },
    );
  }
  if (preferredContact === "phone" && !phone) {
    return Response.json(
      { error: "Phone number is required when preferred contact is phone." },
      { status: 400 },
    );
  }

  const result = await sendBusinessCardLead({
    recipientEmail,
    recipientName,
    name,
    email,
    phone: phone || undefined,
    company: company || undefined,
    preferredContact,
    message: message || undefined,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 502 });
  }
  return Response.json({ ok: true, delivered: result.delivered });
}
