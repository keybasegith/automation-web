import { NextResponse } from "next/server";
import { requestHasAdminSession } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return NextResponse.json({ authenticated: requestHasAdminSession(req) });
}
