/**
 * POST — in-person signing. The client(s) and the advisor have signed on the
 * advisor's screen: stamp the date, fill and flatten the official NAAF and
 * CRQ, file both against the client, and close the onboarding.
 */

import {
  applySignatures,
  cleanSignatures,
  documentTitles,
  generateDocuments,
  outstandingBeforeSigning,
  requiredSigners,
  signingDate,
} from "@/lib/client-onboarding/finalize";
import { clientMeta, draftFrom, errorResponse, guardInternal, json, readJson, requireStorage } from "@/lib/client-onboarding/http";
import {
  getWizardOnboarding,
  isUuid,
  verifySupporting,
  recordSignature,
  saveWizardOnboarding,
  setClientRiskTolerance,
  storeClientDocument,
  updateWizardStatus,
} from "@/lib/client-onboarding/repo";
import { deriveRiskProfile } from "@/lib/risk-questionnaire/scoring";
import { CRQ_FORMS } from "@/lib/risk-questionnaire/forms";

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
  if (body.consent !== true) return json({ error: "Confirm the signers reviewed both documents." }, 400);

  const signatures = cleanSignatures(body.signatures);
  const missing = requiredSigners(draft).filter((k) => !signatures[k]);
  if (missing.length > 0) return json({ error: "Every signer must sign before completing.", missing }, 400);

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

    const signed = applySignatures(draft, signatures, signingDate());
    const docs = await generateDocuments(signed, { origin: new URL(request.url).origin, flatten: true });
    const titles = documentTitles(signed, true);
    const documents = [
      await storeClientDocument({ clientId: saved.clientId, onboardingId: id, kind: "naaf", title: titles.naaf, bytes: docs.naaf, signed: true }),
      await storeClientDocument({
        clientId: saved.clientId, onboardingId: id, kind: "crq", crqVariant: docs.crqVariant, title: titles.crq, bytes: docs.crq, signed: true,
      }),
    ];

    const now = new Date().toISOString();
    const meta = clientMeta(request);
    for (const [key, type] of [["client1", "client"], ["client2", "joint"], ["advisor", "advisor"]] as const) {
      const image = signatures[key];
      if (image) await recordSignature(id, type, image);
    }
    await updateWizardStatus(
      id,
      { status: "completed", signingMethod: "in_person", draft: signed, clientSignedAt: now, advisorSignedAt: now, completedAt: now },
      { type: "completed", metadata: { method: "in_person", documents: documents.map((d) => d.id) }, ...meta },
    );

    const ranking = deriveRiskProfile(signed.crq.answers, CRQ_FORMS[signed.variant]).finalRiskRanking;
    await setClientRiskTolerance([saved.clientId, ...(saved.jointClientId ? [saved.jointClientId] : [])], ranking);

    return json({ ok: true, documents });
  } catch (err) {
    return errorResponse(err, "complete");
  }
}
