import {
  getOnboardingById,
  getSignatures,
  logOnboardingEvent,
  updateOnboarding,
} from "@/lib/onboarding";
import { buildDocumentHtml, uploadDocument } from "@/lib/pdf";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import { headers } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Builds the blank KYC + NAAF templates for the onboarding and uploads them
 * to storage. If both signatures already exist, also produces signed copies.
 */
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
    const result = await getOnboardingById(id);
    if (!result) {
      return Response.json({ error: "Onboarding not found." }, { status: 404 });
    }
    const { onboarding, client } = result;

    const signatures = await getSignatures(id);
    const advisorSig = signatures.find((s) => s.type === "advisor");
    const clientSig = signatures.find((s) => s.type === "client");

    // Always (re)build the blank versions so any data edits flow through.
    const kycHtml = buildDocumentHtml("kyc", {
      client,
      onboarding,
      variant: "blank",
    });
    const naafHtml = buildDocumentHtml("naaf", {
      client,
      onboarding,
      variant: "blank",
    });

    const [kycUrl, naafUrl] = await Promise.all([
      uploadDocument({
        onboardingId: id,
        kind: "kyc",
        variant: "blank",
        html: kycHtml,
      }),
      uploadDocument({
        onboardingId: id,
        kind: "naaf",
        variant: "blank",
        html: naafHtml,
      }),
    ]);

    const patch: Parameters<typeof updateOnboarding>[1] = {
      kycDocumentUrl: kycUrl,
      naafDocumentUrl: naafUrl,
      status:
        onboarding.status === "draft" ? "in_progress" : onboarding.status,
    };

    if (advisorSig && clientSig) {
      const signedKyc = buildDocumentHtml("kyc", {
        client,
        onboarding,
        variant: "signed",
        clientSignatureDataUrl: clientSig.signatureUrl,
        advisorSignatureDataUrl: advisorSig.signatureUrl,
      });
      const signedNaaf = buildDocumentHtml("naaf", {
        client,
        onboarding,
        variant: "signed",
        clientSignatureDataUrl: clientSig.signatureUrl,
        advisorSignatureDataUrl: advisorSig.signatureUrl,
      });
      const [signedKycUrl, signedNaafUrl] = await Promise.all([
        uploadDocument({
          onboardingId: id,
          kind: "kyc",
          variant: "signed",
          html: signedKyc,
        }),
        uploadDocument({
          onboardingId: id,
          kind: "naaf",
          variant: "signed",
          html: signedNaaf,
        }),
      ]);
      patch.signedKycUrl = signedKycUrl;
      patch.signedNaafUrl = signedNaafUrl;
      patch.status = "completed";
    }

    await updateOnboarding(id, patch);

    const h = await headers();
    await logOnboardingEvent({
      onboardingId: id,
      eventType: "generated",
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent") ?? null,
      metadata: {
        signed: Boolean(advisorSig && clientSig),
      },
    });

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
