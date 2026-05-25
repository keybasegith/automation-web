import { getCurrentUser } from "@/lib/currentUser";
import { logAudit } from "@/lib/db/audit";
import { getEmailProvider } from "@/lib/email/providers";
import { getDepartment } from "@/lib/departments";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import type { MessageDirection } from "@/lib/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_DIRECTIONS: readonly MessageDirection[] = [
  "inbound",
  "outbound",
];

function isEmail(value: unknown): value is string {
  return (
    typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  );
}

function parseEmailList(input: unknown): string[] | null {
  if (Array.isArray(input)) {
    const cleaned = input.map((v) => (typeof v === "string" ? v.trim() : ""));
    if (cleaned.some((v) => !isEmail(v))) return null;
    return cleaned;
  }
  if (typeof input === "string") {
    const parts = input
      .split(/[,;\n]/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return null;
    if (parts.some((p) => !isEmail(p))) return null;
    return parts;
  }
  return null;
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  if (!isServerSupabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  const { slug } = await ctx.params;
  const department = getDepartment(slug);
  if (!department) {
    return Response.json(
      { error: `Unknown department: ${slug}` },
      { status: 404 }
    );
  }

  const url = new URL(request.url);
  const directionParam = url.searchParams.get("direction");
  const direction =
    directionParam && ALLOWED_DIRECTIONS.includes(directionParam as MessageDirection)
      ? (directionParam as MessageDirection)
      : undefined;
  const limit = Math.min(
    200,
    Math.max(1, Number(url.searchParams.get("limit") ?? "100"))
  );

  const provider = getEmailProvider();
  const messages = await provider.listMessages({
    department: department.slug,
    direction,
    limit,
  });

  const user = getCurrentUser();
  await logAudit({
    userId: user.id,
    action: "DEPT_MAILBOX_FETCH",
    entityType: "department_message",
    entityId: "00000000-0000-0000-0000-000000000000",
    metadata: {
      department: department.slug,
      direction: direction ?? "all",
      provider: provider.name,
      resultCount: messages.length,
    },
  });

  return Response.json({ messages, provider: provider.name });
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  if (!isServerSupabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  const { slug } = await ctx.params;
  const department = getDepartment(slug);
  if (!department) {
    return Response.json(
      { error: `Unknown department: ${slug}` },
      { status: 404 }
    );
  }

  let body: {
    to?: unknown;
    cc?: unknown;
    subject?: unknown;
    body?: unknown;
    from?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const subject =
    typeof body.subject === "string" ? body.subject.trim() : "";
  const messageBody =
    typeof body.body === "string" ? body.body.trim() : "";

  if (!subject) {
    return Response.json({ error: "subject is required" }, { status: 400 });
  }
  if (!messageBody) {
    return Response.json({ error: "body is required" }, { status: 400 });
  }

  const to = parseEmailList(body.to);
  if (!to || to.length === 0) {
    return Response.json(
      { error: "to must contain at least one valid email address" },
      { status: 400 }
    );
  }

  const cc = body.cc === undefined || body.cc === null ? [] : parseEmailList(body.cc);
  if (cc === null) {
    return Response.json(
      { error: "cc contains an invalid email address" },
      { status: 400 }
    );
  }

  const user = getCurrentUser();
  const defaultFrom = `${department.slug}@keybase.com`;
  const fromAddress =
    isEmail(body.from) ? (body.from as string).trim() : defaultFrom;

  const provider = getEmailProvider();

  try {
    const message = await provider.sendMessage(
      {
        department: department.slug,
        from: fromAddress,
        to,
        cc,
        subject,
        body: messageBody,
      },
      { userId: user.id, userEmail: user.email }
    );
    return Response.json({ message, provider: provider.name }, { status: 201 });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await logAudit({
      userId: user.id,
      action: "DEPT_MAILBOX_SEND_FAILED",
      entityType: "department_message",
      entityId: "00000000-0000-0000-0000-000000000000",
      metadata: {
        department: department.slug,
        provider: provider.name,
        error: detail,
      },
    }).catch(() => {
      /* audit failure should not mask the send error */
    });
    return Response.json(
      { error: "Failed to send message.", detail },
      { status: 502 }
    );
  }
}
