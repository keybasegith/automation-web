/**
 * POST — fill the official NAAF or CRQ from unsaved answers and return the PDF.
 *
 * Nothing is stored, so this works with or without client storage: the advisor
 * can look over the documents before anything is signed or filed.
 */

import { draftFrom, errorResponse, guardInternal, json, readJson } from "@/lib/client-onboarding/http";
import { applySignatures, cleanSignatures, generateDocuments, signingDate } from "@/lib/client-onboarding/finalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await guardInternal(request);
  if (denied) return denied;
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const draft = draftFrom(body);
  if (draft instanceof Response) return draft;
  const which = body.document === "crq" ? "crq" : body.document === "naaf" ? "naaf" : null;
  if (!which) return json({ error: "Choose the NAAF or the CRQ." }, 400);

  try {
    // Any signatures drawn on the review screen, dated today — nothing is stored.
    const signed = applySignatures(draft, cleanSignatures(body.signatures), signingDate());
    const docs = await generateDocuments(signed, { origin: new URL(request.url).origin, flatten: false });
    const bytes = which === "naaf" ? docs.naaf : docs.crq;
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${which === "naaf" ? "NAAF" : "CRQ"}-preview.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return errorResponse(err, "preview");
  }
}
