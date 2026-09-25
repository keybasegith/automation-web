/**
 * POST (multipart: `file`, `requirement`) — upload a supporting document the
 * NAAF or CRQ requires: ID, RC518/RC519, PEP/HIO declaration, void cheque,
 * POA, corporate resolution. Filed on the client's record in the private
 * bucket, and marked as provided on the onboarding in the same step.
 */

import { errorResponse, guardInternal, json, requireStorage } from "@/lib/client-onboarding/http";
import {
  EDITABLE_STATUSES,
  getWizardOnboarding,
  isUuid,
  setSupportingStatus,
  storeClientDocument,
} from "@/lib/client-onboarding/repo";
import { requirementsFor, type RequirementId } from "@/lib/client-onboarding/supporting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;
const TYPES: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };

/** Checks the file really is what it claims, from its first bytes. */
function sniff(bytes: Uint8Array): string | null {
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  return null;
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = (await guardInternal(request)) ?? requireStorage();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!isUuid(id)) return json({ error: "Onboarding not found." }, 404);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Expected a file upload." }, 400);
  }
  const file = form.get("file");
  const requirement = form.get("requirement");
  if (!(file instanceof File)) return json({ error: "Choose a file to upload." }, 400);
  if (file.size > MAX_BYTES) return json({ error: "Files can be up to 15 MB." }, 413);

  try {
    const onboarding = await getWizardOnboarding(id);
    if (!onboarding) return json({ error: "Onboarding not found." }, 404);
    if (!EDITABLE_STATUSES.includes(onboarding.status)) return json({ error: "This onboarding is locked." }, 409);
    const req = requirementsFor(onboarding.draft.naaf).find((r) => r.id === requirement);
    if (!req) return json({ error: "That document is not required for this application." }, 400);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniff(bytes);
    if (!type || !TYPES[type]) return json({ error: "Upload a PDF, JPEG or PNG." }, 415);

    const document = await storeClientDocument({
      clientId: onboarding.clientId,
      onboardingId: id,
      kind: "supporting",
      documentType: req.id,
      title: req.title,
      bytes,
      signed: false,
      contentType: type,
      extension: TYPES[type],
    });
    const status = { status: "uploaded" as const, documentId: document.id, fileName: file.name.slice(0, 200) };
    await setSupportingStatus(onboarding, req.id as RequirementId, status);
    return json({ document, status }, 201);
  } catch (err) {
    return errorResponse(err, "attachment");
  }
}
