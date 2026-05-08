import {
  getOnboardingById,
  logOnboardingEvent,
  upsertClientForOnboarding,
  updateOnboarding,
} from "@/lib/onboarding";
import { parseClientPayload } from "@/lib/onboardingValidation";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import { headers } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!isServerSupabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  const { id } = await ctx.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseClientPayload(raw);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const existing = await getOnboardingById(id);
    if (!existing) {
      return Response.json({ error: "Onboarding not found." }, { status: 404 });
    }

    // Update client profile (re-upsert by email so the onboarding stays linked).
    await upsertClientForOnboarding(parsed.value);

    // Editing data after generation should bump status back to in_progress
    // and clear stale signed URLs (signatures themselves are kept; the
    // operator can choose to regenerate the signed copy).
    const wasGenerated =
      existing.onboarding.kycDocumentUrl || existing.onboarding.naafDocumentUrl;
    if (
      existing.onboarding.status === "draft" ||
      existing.onboarding.status === "in_progress"
    ) {
      await updateOnboarding(id, {
        status: wasGenerated ? "in_progress" : "draft",
      });
    }

    const h = await headers();
    await logOnboardingEvent({
      onboardingId: id,
      eventType: "updated",
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent") ?? null,
    });

    return Response.json({ onboardingId: id });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function GET(
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
  const result = await getOnboardingById(id);
  if (!result) {
    return Response.json({ error: "Onboarding not found." }, { status: 404 });
  }
  return Response.json(result);
}
