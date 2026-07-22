import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-side proxy for the Keyweb employee directory API.
// The X-API-KEY never reaches the browser — the client calls THIS route,
// and this route calls Keyweb with the secret held in an env var.
//
// Keyweb contract (from IT):
//   POST https://www.keyweb.ca/API/API_Test2.aspx
//   Headers: X-API-KEY, P = employee id (parameter 1), L = location id (parameter 2)
//   Body: empty (Content-Length: 0)

const API_URL =
  process.env.KEYWEB_API_URL ?? "https://www.keyweb.ca/API/API_Test2.aspx";
const API_KEY = process.env.KEYWEB_API_KEY ?? "";

type KeywebRow = {
  employee_id: number;
  first: string;
  last: string;
  title: string;
  location_id: number;
  ho_rep: string | null;
};

// Keyweb returns fixed-width columns padded with trailing spaces — trim them
// so the UI gets clean values.
function clean(row: KeywebRow) {
  return {
    employee_id: row.employee_id,
    first: (row.first ?? "").trim(),
    last: (row.last ?? "").trim(),
    title: (row.title ?? "").trim(),
    location_id: row.location_id,
    ho_rep: (row.ho_rep ?? "").trim() || null,
  };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { employeeId, locationId } = (body ?? {}) as {
    employeeId?: unknown;
    locationId?: unknown;
  };

  const p = String(employeeId ?? "").trim();
  const l = String(locationId ?? "").trim();

  if (!p) {
    return NextResponse.json(
      { error: "Employee ID (parameter 1) is required." },
      { status: 400 },
    );
  }
  if (!l) {
    return NextResponse.json(
      { error: "Location ID (parameter 2) is required." },
      { status: 400 },
    );
  }
  if (!API_KEY) {
    return NextResponse.json(
      { error: "KEYWEB_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(API_URL, {
      method: "POST",
      headers: {
        "X-API-KEY": API_KEY,
        P: p,
        L: l,
      },
      // Empty POST body — mirrors ContentLength = 0 in the reference code.
      body: "",
      cache: "no-store",
    });
  } catch (err) {
    console.error("[testapi] Upstream fetch failed:", err);
    return NextResponse.json(
      { error: "Could not reach the Keyweb API." },
      { status: 502 },
    );
  }

  const text = await upstream.text();

  if (!upstream.ok) {
    // Surface Keyweb's own error (e.g. 401 invalid key) to the client.
    let message = `Keyweb returned ${upstream.status}.`;
    try {
      const parsed = JSON.parse(text);
      if (parsed?.message) message = String(parsed.message);
    } catch {
      /* keep default message */
    }
    return NextResponse.json(
      { error: message, status: upstream.status },
      { status: upstream.status },
    );
  }

  let parsed: { status?: string; data?: KeywebRow[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "Keyweb returned a non-JSON response." },
      { status: 502 },
    );
  }

  const rows = Array.isArray(parsed.data) ? parsed.data.map(clean) : [];

  return NextResponse.json({
    ok: true,
    count: rows.length,
    query: { employeeId: p, locationId: l },
    rows,
  });
}
