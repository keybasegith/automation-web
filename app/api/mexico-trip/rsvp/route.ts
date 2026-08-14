import { NextResponse } from "next/server";
import {
  getServerSupabase,
  isServerSupabaseConfigured,
} from "@/lib/supabaseClient";
import { ATTENDING_VALUES, TRIP_SLUG, type AttendingValue } from "@/lib/mexico-trip/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RsvpPayload = {
  fullName: string;
  email: string;
  attending: AttendingValue;
  passportReady?: boolean;
  dietary?: string;
  message?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isFilled = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

/** Trims and caps free-text so a pasted essay can't bloat a row. */
const text = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const data = body as Partial<RsvpPayload>;

  if (!isFilled(data.fullName)) {
    return NextResponse.json(
      { error: "Please enter your full name." },
      { status: 400 },
    );
  }
  if (!isFilled(data.email) || !EMAIL_RE.test(data.email.trim())) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  if (
    !isFilled(data.attending) ||
    !ATTENDING_VALUES.includes(data.attending as AttendingValue)
  ) {
    return NextResponse.json(
      { error: "Please let us know whether you're joining." },
      { status: 400 },
    );
  }

  const row = {
    trip_slug: TRIP_SLUG,
    full_name: data.fullName.trim().slice(0, 120),
    email: data.email.trim().toLowerCase().slice(0, 200),
    attending: data.attending as AttendingValue,
    passport_ready: data.passportReady === true,
    dietary: text(data.dietary, 500),
    message: text(data.message, 1000),
    source: "mexico-trip-landing",
    updated_at: new Date().toISOString(),
  };

  // Always log server-side first. If the database is unreachable or not yet
  // configured, responses are still recoverable from the server logs rather
  // than lost — a save-the-date only goes out once.
  console.log("[mexico-trip-rsvp]", JSON.stringify(row));

  if (!isServerSupabaseConfigured()) {
    console.warn(
      "[mexico-trip-rsvp] Supabase is not configured — response logged above but not persisted. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
    return NextResponse.json({ ok: true, stored: false });
  }

  try {
    const supabase = getServerSupabase();
    const { error } = await supabase
      .from("trip_rsvps")
      // Same person, same trip: replace their previous answer so a "maybe"
      // can become a "yes" without leaving a duplicate behind.
      .upsert(row, { onConflict: "trip_slug,email" });

    if (error) throw new Error(error.message);
  } catch (err) {
    console.error("[mexico-trip-rsvp] Failed to persist response:", err);
    // The response is in the logs above, so don't make the colleague retry.
    return NextResponse.json({ ok: true, stored: false });
  }

  return NextResponse.json({ ok: true, stored: true });
}

/**
 * CSV export for the trip planners.
 *
 * Guarded by MEXICO_TRIP_ADMIN_TOKEN. When that variable is unset the export
 * is disabled outright — an unconfigured deployment must never hand out the
 * attendance list.
 */
export async function GET(req: Request) {
  const expected = process.env.MEXICO_TRIP_ADMIN_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "Export is not enabled." },
      { status: 404 },
    );
  }

  const url = new URL(req.url);
  const provided =
    url.searchParams.get("token") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  if (provided !== expected) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  if (!isServerSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("trip_rsvps")
    .select(
      "full_name,email,attending,passport_ready,dietary,message,created_at,updated_at",
    )
    .eq("trip_slug", TRIP_SLUG)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[mexico-trip-rsvp] Export failed:", error);
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }

  const columns = [
    "full_name",
    "email",
    "attending",
    "passport_ready",
    "dietary",
    "message",
    "created_at",
    "updated_at",
  ] as const;

  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const s = String(value);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const csv = [
    columns.join(","),
    ...rows.map((r) => columns.map((c) => escape(r[c])).join(",")),
  ].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${TRIP_SLUG}-rsvps.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
