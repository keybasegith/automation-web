import { headers } from "next/headers";
import {
  getOnboardingById,
  logOnboardingEvent,
  updateOnboarding,
} from "@/lib/onboarding";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!isServerSupabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  const { id } = await ctx.params;

  try {
    const existing = await getOnboardingById(id);
    if (!existing) {
      return Response.json({ error: "Onboarding not found." }, { status: 404 });
    }
    if (
      !existing.onboarding.kycDocumentUrl ||
      !existing.onboarding.naafDocumentUrl
    ) {
      return Response.json(
        { error: "Generate KYC and NAAF documents before sending." },
        { status: 400 }
      );
    }
    if (existing.onboarding.status === "completed") {
      return Response.json(
        { error: "This onboarding is already completed." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    await updateOnboarding(id, {
      status: "sent",
      sentAt: now,
    });

    const h = await headers();
    await logOnboardingEvent({
      onboardingId: id,
      eventType: "sent",
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent") ?? null,
    });

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
