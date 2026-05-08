import { getCurrentUser } from "@/lib/currentUser";
import { getClientById } from "@/lib/db/clientsRepo";
import { buildClientContext } from "@/lib/secureEmail/clientContext";
import {
  isServerSupabaseConfigured,
  SupabaseConfigError,
} from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns the abstracted client context plus the display-only fields (name,
 * email) needed for the advisor UI. The secure-email pipeline never forwards
 * the display-only fields to OpenAI; they exist for advisor convenience and
 * for server-side substitution after the AI returns.
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!isServerSupabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  const { id } = await ctx.params;
  if (!id || typeof id !== "string") {
    return Response.json({ error: "Client id is required." }, { status: 400 });
  }

  try {
    const client = await getClientById(id);
    if (!client) {
      return Response.json({ error: "Client not found." }, { status: 404 });
    }
    const advisor = getCurrentUser();
    return Response.json(buildClientContext(client, advisor.id));
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
