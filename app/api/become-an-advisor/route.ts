import { randomUUID } from "node:crypto";
import { rateLimited, validOrigin, readSmallJson } from "@/lib/public-forms/request";
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
  if (!validOrigin(req)) return NextResponse.json({error:"Invalid origin."},{status:403});
  if (rateLimited(req)) return NextResponse.json({error:"Please wait before trying again."},{status:429,headers:{"Retry-After":"600"}});

  let body: unknown;
  try {
    body = await readSmallJson(req);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({error:"Invalid request."},{status:400});
  const record = body as Record<string,unknown>;
  if (Object.entries(record).some(([key,value]) => key !== "consent" && (Array.isArray(value) ? value.length > 20 || value.some(v=>typeof v !== "string" || v.length>200) : typeof value !== "string" || value.length>500))) return NextResponse.json({error:"Invalid field or field too long."},{status:400});
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

  const submissionId = randomUUID();
  const webhookUrl =
    process.env.ADVISOR_APPLICATION_WEBHOOK_URL ??
    process.env.CONTACT_INQUIRY_WEBHOOK_URL;
  if (!webhookUrl) return NextResponse.json({error:"Online applications are temporarily unavailable. Please contact Keybase directly."},{status:503});

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": submissionId },
      signal: AbortSignal.timeout(8000), redirect:"error",
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Delivery rejected");
  } catch {
    console.error("[application] Delivery failed", submissionId);
    return NextResponse.json({error:"Your application could not be delivered. Please try again or contact Keybase directly."},{status:502});
  }

  return NextResponse.json({ ok: true, forwarded: true });
}
