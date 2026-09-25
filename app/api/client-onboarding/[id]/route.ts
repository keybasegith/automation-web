/** GET — load a wizard onboarding. PUT — save its answers and wizard position. */

import { errorResponse, draftFrom, guardInternal, json, readJson, requireStorage } from "@/lib/client-onboarding/http";
import {
  getWizardOnboarding,
  isUuid,
  listOnboardingDocuments,
  saveWizardOnboarding,
  verifySupporting,
} from "@/lib/client-onboarding/repo";
import type { StepId } from "@/lib/client-onboarding/steps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STEP_IDS: readonly StepId[] = [
  "start", "holder", "identity", "employment", "joint", "financial", "plans", "risk", "contacts", "advisor", "documents", "review",
];
const isStep = (v: unknown): v is StepId => typeof v === "string" && (STEP_IDS as readonly string[]).includes(v);

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const denied = (await guardInternal(request)) ?? requireStorage();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!isUuid(id)) return json({ error: "Onboarding not found." }, 404);
  try {
    const onboarding = await getWizardOnboarding(id);
    if (!onboarding) return json({ error: "Onboarding not found." }, 404);
    const documents = await listOnboardingDocuments(id);
    return json({ onboarding, documents });
  } catch (err) {
    return errorResponse(err, "load");
  }
}

export async function PUT(request: Request, ctx: Ctx) {
  const denied = (await guardInternal(request)) ?? requireStorage();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!isUuid(id)) return json({ error: "Onboarding not found." }, 404);
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const draft = draftFrom(body);
  if (draft instanceof Response) return draft;

  try {
    const existing = await getWizardOnboarding(id);
    if (!existing) return json({ error: "Onboarding not found." }, 404);
    // The side-by-side forms edit the NAAF and CRQ only; they don't carry the
    // supporting-document status, which must survive their saves.
    const sentSupporting = typeof body.draft === "object" && body.draft !== null && "supporting" in body.draft;
    draft.supporting = sentSupporting ? await verifySupporting(id, draft.supporting) : existing.draft.supporting;
    const onboarding = await saveWizardOnboarding(existing, draft, {
      currentStep: isStep(body.currentStep) ? body.currentStep : undefined,
      visitedSteps: Array.isArray(body.visitedSteps) ? body.visitedSteps.filter(isStep) : undefined,
    });
    return json({ onboarding });
  } catch (err) {
    return errorResponse(err, "save");
  }
}
