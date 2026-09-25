/**
 * POST — remote signing. The advisor has signed on screen; generate the NAAF
 * and CRQ for the client to sign, file them as "for signature", lock the
 * answers, and return a signing link valid for SIGNING_LINK_DAYS.
 *
 * No email is sent from here — the advisor sends the link through their own
 * channel (the existing onboarding flow works the same way).
 */

import {
  applySignatures,
  cleanSignatures,
  documentTitles,
  generateDocuments,
  outstandingBeforeSigning,
  signingDate,
} from "@/lib/client-onboarding/finalize";
import { clientMeta, draftFrom, errorResponse, guardInternal, json, readJson, requireStorage } from "@/lib/client-onboarding/http";
import {
  SIGNING_LINK_DAYS,
  getWizardOnboarding,
  isUuid,
  verifySupporting,
  recordSignature,
  saveWizardOnboarding,
  storeClientDocument,
  updateWizardStatus,
} from "@/lib/client-onboarding/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = (await guardInternal(request)) ?? requireStorage();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!isUuid(id)) return json({ error: "Onboarding not found." }, 404);
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const draft = draftFrom(body);
  if (draft instanceof Response) return draft;

  const { advisor } = cleanSignatures(body.signatures);
  if (!advisor) return json({ error: "The advisor signs before the documents go to the client." }, 400);

  // Only uploads actually filed against this onboarding count as provided.
  try {
    if (isUuid(id)) draft.supporting = await verifySupporting(id, draft.supporting);
  } catch (err) {
    return errorResponse(err, "verify documents");
  }
  const outstanding = outstandingBeforeSigning(draft);
  if (outstanding.length > 0) {
    return json({ error: `${outstanding.length} required item(s) are still blank or incorrect.`, outstanding }, 422);
  }

  try {
    const existing = await getWizardOnboarding(id);
    if (!existing) return json({ error: "Onboarding not found." }, 404);
    const saved = await saveWizardOnboarding(existing, draft, { currentStep: "review" });

    const withAdvisor = applySignatures(draft, { advisor }, signingDate());
    const docs = await generateDocuments(withAdvisor, { origin: new URL(request.url).origin, flatten: true });
    const titles = documentTitles(withAdvisor, false);
    const documents = [
      await storeClientDocument({ clientId: saved.clientId, onboardingId: id, kind: "naaf", title: titles.naaf, bytes: docs.naaf, signed: false }),
      await storeClientDocument({
        clientId: saved.clientId, onboardingId: id, kind: "crq", crqVariant: docs.crqVariant, title: titles.crq, bytes: docs.crq, signed: false,
      }),
    ];
    await recordSignature(id, "advisor", advisor);

    const now = new Date();
    const expires = new Date(now.getTime() + SIGNING_LINK_DAYS * 86_400_000).toISOString();
    await updateWizardStatus(
      id,
      {
        status: "sent",
        signingMethod: "remote",
        draft: withAdvisor,
        advisorSignedAt: now.toISOString(),
        sentAt: now.toISOString(),
        signingTokenExpiresAt: expires,
      },
      { type: "sent", metadata: { method: "remote", documents: documents.map((d) => d.id), expires }, ...clientMeta(request) },
    );

    const signingUrl = new URL(`/sign/onboarding/${saved.signingToken}`, new URL(request.url).origin).toString();
    return json({ ok: true, signingUrl, expiresAt: expires, documents });
  } catch (err) {
    return errorResponse(err, "send");
  }
}
