import { headers } from "next/headers";
import {
  getOnboardingByToken,
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
  ctx: { params: Promise<{ token: string }> }
) {
  if (!isServerSupabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  const { token } = await ctx.params;

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
    const result = await getOnboardingByToken(token);
    if (!result) {
      return Response.json(
        { error: "Signing link is invalid or has expired." },
        { status: 404 }
      );
    }
    const { onboarding } = result;

    if (
      !onboarding.kycDocumentUrl ||
      !onboarding.naafDocumentUrl
    ) {
      return Response.json(
        { error: "Documents are not ready for signature yet." },
        { status: 400 }
      );
    }

    const url = await uploadSignatureImage({
      onboardingId: onboarding.id,
      type: "client",
      dataUrl: body.signatureDataUrl,
    });

    await upsertSignature({
      onboardingId: onboarding.id,
      type: "client",
      signatureUrl: url,
    });

    const now = new Date().toISOString();
    await updateOnboarding(onboarding.id, {
      clientSignedAt: now,
      // 'signed' = client signed but full finalisation hasn't happened yet
      // (advisor may not have signed). finalizeIfFullySigned will bump to
      // 'completed' if both signatures are present.
      status:
        onboarding.status === "completed" ? "completed" : "signed",
    });

    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const ua = h.get("user-agent") ?? null;

    await logOnboardingEvent({
      onboardingId: onboarding.id,
      eventType: "signed",
      ipAddress: ip,
      userAgent: ua,
      metadata: { type: "client" },
    });

    const finalised = await finalizeIfFullySigned(onboarding.id);
    if (finalised) {
      await logOnboardingEvent({
        onboardingId: onboarding.id,
        eventType: "completed",
        ipAddress: ip,
        userAgent: ua,
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
