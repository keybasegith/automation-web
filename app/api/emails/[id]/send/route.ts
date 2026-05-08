import { logAudit } from "@/lib/db/audit";
import { getEmailById, updateEmailStatus } from "@/lib/db/emailsRepo";
import {
  isServerSupabaseConfigured,
  SupabaseConfigError,
} from "@/lib/supabaseClient";
import { getCurrentUser } from "@/lib/currentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!isServerSupabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return Response.json({ error: "Invalid email id." }, { status: 400 });
  }

  try {
    const existing = await getEmailById(id);
    if (!existing) {
      return Response.json({ error: "Email not found." }, { status: 404 });
    }
    if (existing.status === "sent") {
      return Response.json(
        { error: "Email has already been sent." },
        { status: 409 }
      );
    }
    if (existing.status !== "approved") {
      return Response.json(
        {
          error:
            "Email must be approved before sending. Approve the draft first.",
        },
        { status: 409 }
      );
    }

    const updated = await updateEmailStatus(id, "sent");
    const user = getCurrentUser();

    await logAudit({
      userId: user.id,
      action: "SEND_EMAIL",
      entityType: "email",
      entityId: id,
      metadata: {
        previousStatus: existing.status,
        newStatus: "sent",
        transport: "simulated",
      },
    });

    return Response.json({
      id: updated.id,
      status: updated.status,
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof SupabaseConfigError) {
      return Response.json({ error: err.message }, { status: 500 });
    }
    return Response.json(
      {
        error: "Failed to send email.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
