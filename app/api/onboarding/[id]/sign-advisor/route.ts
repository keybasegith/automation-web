import { headers } from "next/headers";
import {
  getOnboardingById,
  logOnboardingEvent,
  updateOnboarding,
  upsertSignature,
} from "@/lib/onboarding";
import { finalizeIfFullySigned } from "@/lib/onboardingFinalize";
import { uploadSignatureImage } from "@/lib/pdf";
import { isValidSignatureDataUrl } from "@/lib/signature";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
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
  const body = raw as { signatureDataUrl?: unknown };
  if (!isValidSignatureDataUrl(body.signatureDataUrl)) {
    return Response.json(
      { error: "signatureDataUrl must be a base64-encoded PNG/JPEG data URL." },
      { status: 400 }
    );
  }

  try {
    const existing = await getOnboardingById(id);
    if (!existing) {
      return Response.json({ error: "Onboarding not found." }, { status: 404 });
    }

    const url = await uploadSignatureImage({
      onboardingId: id,
      type: "advisor",
      dataUrl: body.signatureDataUrl,
    });

    await upsertSignature({
      onboardingId: id,
      type: "advisor",
      signatureUrl: url,
    });

    const now = new Date().toISOString();
    await updateOnboarding(id, {
      advisorSignedAt: now,
      status:
        existing.onboarding.status === "draft" ? "in_progress" : existing.onboarding.status,
    });

    const h = await headers();
    await logOnboardingEvent({
      onboardingId: id,
      eventType: "signed",
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent") ?? null,
      metadata: { type: "advisor" },
    });

    const finalised = await finalizeIfFullySigned(id);
    if (finalised) {
      await logOnboardingEvent({
        onboardingId: id,
        eventType: "completed",
        ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: h.get("user-agent") ?? null,
      });
    }

    return Response.json({ ok: true, completed: finalised });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
