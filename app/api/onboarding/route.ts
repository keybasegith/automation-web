import { getCurrentUser } from "@/lib/currentUser";
import {
  createOnboarding,
  logOnboardingEvent,
  upsertClientForOnboarding,
} from "@/lib/onboarding";
import { parseClientPayload } from "@/lib/onboardingValidation";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import { headers } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseClientPayload(raw);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const user = getCurrentUser();
  try {
    const client = await upsertClientForOnboarding(parsed.value);
    const onboarding = await createOnboarding({
      clientId: client.id,
      createdBy: user.id,
    });

    const h = await headers();
    await logOnboardingEvent({
      onboardingId: onboarding.id,
      eventType: "created",
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent") ?? null,
      metadata: { clientId: client.id, email: client.email },
    });

    return Response.json({
      onboardingId: onboarding.id,
      clientId: client.id,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
