import {
  getOnboardingById,
  getSignatures,
  updateOnboarding,
} from "@/lib/onboarding";
import { buildDocumentHtml, uploadDocument } from "@/lib/pdf";

/**
 * If both signatures exist, build the signed KYC + NAAF copies, upload them,
 * set the onboarding status to 'completed' and stamp the signed-at timestamps.
 * Returns true when the onboarding was finalised.
 */
export async function finalizeIfFullySigned(
  onboardingId: string
): Promise<boolean> {
  const result = await getOnboardingById(onboardingId);
  if (!result) return false;
  const { onboarding, client } = result;

  const signatures = await getSignatures(onboardingId);
  const advisorSig = signatures.find((s) => s.type === "advisor");
  const clientSig = signatures.find((s) => s.type === "client");
  if (!advisorSig || !clientSig) return false;

  const signedKycHtml = buildDocumentHtml("kyc", {
    client,
    onboarding,
    variant: "signed",
    clientSignatureDataUrl: clientSig.signatureUrl,
    advisorSignatureDataUrl: advisorSig.signatureUrl,
  });
  const signedNaafHtml = buildDocumentHtml("naaf", {
    client,
    onboarding,
    variant: "signed",
    clientSignatureDataUrl: clientSig.signatureUrl,
    advisorSignatureDataUrl: advisorSig.signatureUrl,
  });

  const [signedKycUrl, signedNaafUrl] = await Promise.all([
    uploadDocument({
      onboardingId,
      kind: "kyc",
      variant: "signed",
      html: signedKycHtml,
    }),
    uploadDocument({
      onboardingId,
      kind: "naaf",
      variant: "signed",
      html: signedNaafHtml,
    }),
  ]);

  await updateOnboarding(onboardingId, {
    signedKycUrl,
    signedNaafUrl,
    status: "completed",
  });

  return true;
}
