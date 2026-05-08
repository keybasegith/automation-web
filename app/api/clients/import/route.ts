import { logAudit } from "@/lib/db/audit";
import { getServerSupabase, isServerSupabaseConfigured } from "@/lib/supabaseClient";
import { getCurrentUser } from "@/lib/currentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RISKS = ["Low", "Medium", "High"] as const;

interface ParsedClient {
  name: string;
  email: string;
  riskTolerance: "Low" | "Medium" | "High";
  portfolioValue: number;
}

interface ParseError {
  rowNumber: number;
  message: string;
}

const isEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  let body: { rows?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body.rows)) {
    return Response.json(
      { error: "Body must contain a `rows` array." },
      { status: 400 }
    );
  }

  if (body.rows.length === 0) {
    return Response.json(
      { error: "No rows provided." },
      { status: 400 }
    );
  }

  if (body.rows.length > 1000) {
    return Response.json(
      { error: "Maximum 1000 rows per import." },
      { status: 400 }
    );
  }

  const validated: ParsedClient[] = [];
  const errors: ParseError[] = [];

  body.rows.forEach((raw, index) => {
    const rowNumber = index + 1;
    if (!raw || typeof raw !== "object") {
      errors.push({ rowNumber, message: "Row is not an object" });
      return;
    }
    const r = raw as Record<string, unknown>;

    const name = typeof r.name === "string" ? r.name.trim() : "";
    const email = typeof r.email === "string" ? r.email.trim().toLowerCase() : "";
    const risk = typeof r.riskTolerance === "string" ? r.riskTolerance.trim() : "";
    const portfolio = Number(r.portfolioValue);

    if (!name) {
      errors.push({ rowNumber, message: "name is required" });
      return;
    }
    if (!email || !isEmail(email)) {
      errors.push({ rowNumber, message: "email is missing or invalid" });
      return;
    }
    if (!(RISKS as readonly string[]).includes(risk)) {
      errors.push({
        rowNumber,
        message: `riskTolerance must be one of ${RISKS.join(", ")}`,
      });
      return;
    }
    if (!Number.isFinite(portfolio) || portfolio < 0) {
      errors.push({
        rowNumber,
        message: "portfolioValue must be a non-negative number",
      });
      return;
    }

    validated.push({
      name,
      email,
      riskTolerance: risk as ParsedClient["riskTolerance"],
      portfolioValue: portfolio,
    });
  });

  if (errors.length > 0) {
    return Response.json({ error: "Validation failed", errors }, { status: 400 });
  }

  const supabase = getServerSupabase();
  // Upsert by email so re-importing the same CSV updates rather than duplicates.
  const { data, error } = await supabase
    .from("clients")
    .upsert(
      validated.map((c) => ({
        name: c.name,
        email: c.email,
        risk_tolerance: c.riskTolerance,
        portfolio_value: c.portfolioValue,
      })),
      { onConflict: "email" }
    )
    .select("id, email");

  if (error) {
    return Response.json(
      { error: `Insert failed: ${error.message}` },
      { status: 500 }
    );
  }

  const inserted = (data ?? []) as { id: string; email: string }[];
  const user = getCurrentUser();

  // One audit row for the bulk import (referencing the first inserted client).
  if (inserted.length > 0) {
    try {
      await logAudit({
        userId: user.id,
        action: "IMPORT_CLIENTS",
        entityType: "client",
        entityId: inserted[0].id,
        metadata: {
          source: "csv-import",
          count: inserted.length,
          emails: inserted.map((r) => r.email).slice(0, 50),
        },
      });
    } catch {
      // Audit failure should not roll back the import; surface in logs only.
    }
  }

  return Response.json({
    inserted: inserted.length,
  });
}
