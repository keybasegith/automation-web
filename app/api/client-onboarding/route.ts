/** POST — start a wizard onboarding: creates the client row(s) and the onboarding. */

import { getSessionUser } from "@/lib/auth/guard";
import { draftFrom, errorResponse, guardInternal, json, readJson, requireStorage } from "@/lib/client-onboarding/http";
import { createWizardOnboarding } from "@/lib/client-onboarding/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = (await guardInternal(request)) ?? requireStorage();
  if (denied) return denied;
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const draft = draftFrom(body);
  if (draft instanceof Response) return draft;

  try {
    const user = await getSessionUser();
    const onboarding = await createWizardOnboarding(draft, user?.id ?? null);
    return json({ onboarding }, 201);
  } catch (err) {
    return errorResponse(err, "create");
  }
}
