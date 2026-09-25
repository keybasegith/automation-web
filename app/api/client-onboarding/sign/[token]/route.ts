/**
 * POST — the client signs from the emailed link. Public: the token in the URL
 * is the credential (see PUBLIC_EXCEPTIONS in lib/auth/routes.ts). It is
 * checked for expiry and status, and spent on success — a link signs once.
 */

import { applySignatures, cleanSignatures, documentTitles, generateDocuments, signingDate } from "@/lib/client-onboarding/finalize";
import { clientMeta, errorResponse, json, readJson, requireStorage } from "@/lib/client-onboarding/http";
import {
  getWizardOnboardingByToken,
  recordSignature,
  setClientRiskTolerance,
  storeClientDocument,
  updateWizardStatus,
} from "@/lib/client-onboarding/repo";
import { deriveRiskProfile } from "@/lib/risk-questionnaire/scoring";
import { CRQ_FORMS } from "@/lib/risk-questionnaire/forms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  const denied = requireStorage();
  if (denied) return denied;
  const { token } = await ctx.params;
  if (!/^[0-9a-f]{32}$/i.test(token)) return json({ error: "This signing link is not valid." }, 404);
  const body = await readJson(request);
  if (body instanceof Response) return body;
  if (body.consent !== true) return json({ error: "Please confirm you have reviewed both documents." }, 400);

  try {
    const onboarding = await getWizardOnboardingByToken(token);
    if (!onboarding || onboarding.status !== "sent") return json({ error: "This signing link has already been used or is not valid." }, 410);
    if (!onboarding.signingTokenExpiresAt || new Date(onboarding.signingTokenExpiresAt) < new Date()) {
      return json({ error: "This signing link has expired. Ask your advisor for a new one." }, 410);
    }

    const { client1, client2 } = cleanSignatures(body.signatures);
    const joint = onboarding.draft.naaf.hasJointHolder;
    if (!client1 || (joint && !client2)) {
      return json({ error: joint ? "Both account holders must sign." : "Please sign before submitting." }, 400);
    }

    // The advisor's signature and date were applied when the link was sent.
    const signed = applySignatures(onboarding.draft, { client1, client2: joint ? client2 : null }, signingDate());
    const docs = await generateDocuments(signed, { origin: new URL(request.url).origin, flatten: true });
    const titles = documentTitles(signed, true);
    const documents = [
      await storeClientDocument({ clientId: onboarding.clientId, onboardingId: onboarding.id, kind: "naaf", title: titles.naaf, bytes: docs.naaf, signed: true }),
      await storeClientDocument({
        clientId: onboarding.clientId, onboardingId: onboarding.id, kind: "crq", crqVariant: docs.crqVariant, title: titles.crq, bytes: docs.crq, signed: true,
      }),
    ];
    await recordSignature(onboarding.id, "client", client1);
    if (joint && client2) await recordSignature(onboarding.id, "joint", client2);

    const now = new Date().toISOString();
    await updateWizardStatus(
      onboarding.id,
      // Expiring the token now makes the link single-use.
      { status: "completed", draft: signed, clientSignedAt: now, completedAt: now, signingTokenExpiresAt: now },
      { type: "signed", metadata: { method: "remote", documents: documents.map((d) => d.id) }, ...clientMeta(request) },
    );

    const ranking = deriveRiskProfile(signed.crq.answers, CRQ_FORMS[signed.variant]).finalRiskRanking;
    await setClientRiskTolerance([onboarding.clientId, ...(onboarding.jointClientId ? [onboarding.jointClientId] : [])], ranking);

    return json({ ok: true });
  } catch (err) {
    return errorResponse(err, "client sign");
  }
}
