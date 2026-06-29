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
  const contentType = req.headers.get("content-type") || "";
  let data: ApplicationFields = {};
  let resume: ResumeFile | null = null;

  try {
    if (contentType.includes("multipart/form-data")) {
      const fd = await req.formData();
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
      const body = await req.json();
      const json = body as ApplicationFields;
      data = { ...json, consent: json.consent === true };
    }
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

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

  // Always log the application server-side as a recovery backup, so submissions
  // are never lost even if the webhook is unset or fails. The resume bytes are
  // omitted here — only its metadata is logged — to keep logs readable.
  console.log(
    "[careers]",
    JSON.stringify({
      ...payload,
      resume: resume
        ? { filename: resume.filename, type: resume.type, size: resume.size }
        : null,
    }),
  );

  const webhookUrl = process.env.CAREERS_APPLICATION_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn(
      "[careers] CAREERS_APPLICATION_WEBHOOK_URL is not set — application logged above but not forwarded.",
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
        "[careers] Webhook returned non-2xx:",
        response.status,
        text,
      );
      return NextResponse.json({ ok: true, forwarded: false });
    }
  } catch (err) {
    console.error("[careers] Failed to call webhook:", err);
    return NextResponse.json({ ok: true, forwarded: false });
  }

  return NextResponse.json({ ok: true, forwarded: true });
}
