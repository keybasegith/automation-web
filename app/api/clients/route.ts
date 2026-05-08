import {
  isServerSupabaseConfigured,
  SupabaseConfigError,
} from "@/lib/supabaseClient";
import {
  listClientsWithStats,
  upsertClientByEmail,
} from "@/lib/db/clientsRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Slim list used by the secure-email client selector. We deliberately do NOT
 * include risk tolerance, portfolio value, or any other financial detail —
 * the dropdown just needs a label and an id.
 */
export async function GET() {
  if (!isServerSupabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  try {
    const clients = await listClientsWithStats();
    return Response.json({
      clients: clients.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
      })),
    });
  } catch (err) {
    if (err instanceof SupabaseConfigError) {
      return Response.json({ error: err.message }, { status: 500 });
    }
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

interface CreateClientBody {
  name?: unknown;
  email?: unknown;
}

/**
 * Manual client entry used by the secure-email "Add new client" flow during
 * onboarding. Upserts by email so a re-submission of the same address simply
 * returns the existing row instead of duplicating.
 *
 * Defaults `risk_tolerance` to "Low" (most conservative) and `portfolio_value`
 * to 0 — these are required by the schema but unknown for a brand-new
 * onboarding contact. The advisor can edit them later from the clients page.
 */
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
  const body = raw as CreateClientBody;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!name) {
    return Response.json({ error: "Client name is required." }, { status: 400 });
  }
  if (name.length > 200) {
    return Response.json(
      { error: "Client name must be 200 characters or fewer." },
      { status: 400 }
    );
  }
  if (!EMAIL_PATTERN.test(email)) {
    return Response.json(
      { error: "A valid client email is required." },
      { status: 400 }
    );
  }

  try {
    const row = await upsertClientByEmail({
      name,
      email,
      riskTolerance: "Low",
      portfolioValue: 0,
    });
    return Response.json({
      id: row.id,
      name: row.name,
      email: row.email,
    });
  } catch (err) {
    if (err instanceof SupabaseConfigError) {
      return Response.json({ error: err.message }, { status: 500 });
    }
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
