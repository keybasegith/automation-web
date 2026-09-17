import { randomUUID } from "node:crypto";
import { rateLimited, validOrigin, readSmallJson, readSmallBody } from "@/lib/public-forms/request";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ApplicationFields = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string;
  linkedin?: string;
  message?: string;
  consent?: boolean;
};

type ResumeFile = {
  filename: string;
  type: string;
  size: number;
  dataBase64: string;
};

const isString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const RESUME_EXT_RE = /\.(pdf|doc|docx)$/i;

export async function POST(req: Request) {
  if (!validOrigin(req)) return NextResponse.json({error:"Invalid origin."},{status:403});
  if (rateLimited(req)) return NextResponse.json({error:"Please wait before trying again."},{status:429,headers:{"Retry-After":"600"}});

  const contentType = req.headers.get("content-type") || "";
  let data: ApplicationFields = {};
  let resume: ResumeFile | null = null;

  try {
    if (contentType.includes("multipart/form-data")) {
      const raw = await readSmallBody(req,6*1024*1024);
      const fd = await new Response(new Uint8Array(raw),{headers:{"Content-Type":contentType}}).formData();
      const str = (key: string) => {
        const v = fd.get(key);
        return typeof v === "string" ? v : undefined;
      };
      data = {
        firstName: str("firstName"),
        lastName: str("lastName"),
        email: str("email"),
        phone: str("phone"),
        position: str("position"),
        linkedin: str("linkedin"),
        message: str("message"),
        consent: str("consent") === "true",
      };

      const file = fd.get("resume");
      if (file && typeof file === "object" && "arrayBuffer" in file) {
        const f = file as File;
        if (f.size > 0) {
          if (!RESUME_EXT_RE.test(f.name)) {
            return NextResponse.json(
              { error: "Resume must be a PDF or Word document." },
              { status: 400 },
            );
          }
          if (f.size > MAX_RESUME_BYTES) {
            return NextResponse.json(
              { error: "Resume must be 5MB or smaller." },
              { status: 400 },
            );
          }
          const buf = Buffer.from(await f.arrayBuffer());
          resume = {
            filename: f.name,
            type: f.type || "application/octet-stream",
            size: f.size,
            dataBase64: buf.toString("base64"),
          };
        }
      }
    } else {
      const body = await readSmallJson(req);
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid request");
      const json = body as ApplicationFields;
      data = { ...json, consent: json.consent === true };
    }
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (Object.entries(data).some(([key,value])=>key !== "consent" && value !== undefined && (typeof value !== "string" || value.length > (key === "message" ? 5000 : 500)))) return NextResponse.json({error:"Invalid field or field too long."},{status:400});
  if (!resume && !data.message?.trim()) return NextResponse.json({error:"Please provide a resume or a short note."},{status:400});
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
  if (!isString(data.position)) {
    return NextResponse.json(
      { error: "Please select the role you're applying for." },
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
    source: "careers-application",
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone?.trim() ?? "",
    position: data.position.trim(),
    linkedin: data.linkedin?.trim() ?? "",
    message: data.message?.trim() ?? "",
    consent: true,
    resume,
  };

  const submissionId = randomUUID();
  const webhookUrl = process.env.CAREERS_APPLICATION_WEBHOOK_URL;
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
