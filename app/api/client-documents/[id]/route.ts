/**
 * GET — open a filed client document. Internal; redirects to a 5-minute signed
 * URL on the private bucket, so a document link never outlives the visit.
 * `?download=1` saves it instead of opening it.
 */

import { errorResponse, guardInternal, json, requireStorage } from "@/lib/client-onboarding/http";
import { getClientDocument, isUuid, signedDocumentUrl } from "@/lib/client-onboarding/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = (await guardInternal(request)) ?? requireStorage();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!isUuid(id)) return json({ error: "Document not found." }, 404);
  try {
    const doc = await getClientDocument(id);
    if (!doc) return json({ error: "Document not found." }, 404);
    const download = new URL(request.url).searchParams.get("download") === "1";
    const extension = doc.storagePath.split(".").pop() ?? "pdf";
    const name = `${doc.title.replace(/[^\w .()-]+/g, "").trim() || "document"}.${extension}`;
    return Response.redirect(await signedDocumentUrl(doc.storagePath, 300, download ? name : undefined), 302);
  } catch (err) {
    return errorResponse(err, "document");
  }
}
