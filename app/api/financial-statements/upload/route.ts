/**
 * POST /api/financial-statements/upload
 *
 * Accepts a Trial Balance, parses it, and generates version 1 of a statement
 * package. The uploaded bytes are never written to disk.
 */

import { errorResponse, toPackageDto } from "@/lib/financial-statements/api";
import { uploadTrialBalance } from "@/lib/financial-statements/service";
import { authorize } from "@/lib/financial-statements/roles";
import { TrialBalanceParseError } from "@/lib/financial-statements/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const actor = authorize("upload");

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Attach a Trial Balance file." }, { status: 400 });
    }
    if (file.size === 0) {
      return Response.json({ error: "That file is empty." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json(
        { error: "That file is larger than 15 MB. Trial Balance exports are normally well under that." },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const upload = await uploadTrialBalance(buffer, file.name, actor);

    return Response.json({
      package: toPackageDto(
        upload.statementPackage,
        upload.version,
        upload.createdAt,
        upload.result,
        upload.persisted
      ),
    });
  } catch (error) {
    if (error instanceof TrialBalanceParseError) return errorResponse(error, 422);
    return errorResponse(error, 500);
  }
}
