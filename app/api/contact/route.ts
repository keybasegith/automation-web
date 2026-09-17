import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { rateLimited, readSmallJson, validOrigin } from "@/lib/public-forms/request";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (data: object, status = 200) => NextResponse.json(data, {status, headers: {"Cache-Control":"no-store"}});
export async function POST(request: Request) {
  if (!validOrigin(request)) return reply({error:"Invalid request origin."},403);
  if (rateLimited(request)) return reply({error:"Too many attempts. Please try again later or call 905-709-7911."},429);
  let value: unknown;
  try { value = await readSmallJson(request); } catch { return reply({error:"Invalid or oversized request."},400); }
  if (!value || typeof value !== "object" || Array.isArray(value)) return reply({error:"Invalid request."},400);
  const data = value as Record<string,unknown>;
  if (typeof data.website === "string" && data.website.trim()) return new Response(null,{status:204});
  const limits: Record<string,number> = {firstName:100,lastName:100,email:254,phone:50,topic:120,message:5000};
  for (const [key, max] of Object.entries(limits)) {
    if (data[key] !== undefined && (typeof data[key] !== "string" || (data[key] as string).length > max)) return reply({error:`Invalid ${key}.`},400);
  }
  for (const key of ["firstName","lastName","email","message"]) {
    if (typeof data[key] !== "string" || !(data[key] as string).trim()) return reply({error:`Please provide ${key}.`},400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((data.email as string).trim()) || data.consent !== true) return reply({error:"A valid email and consent are required."},400);
  const webhook = process.env.CONTACT_INQUIRY_WEBHOOK_URL;
  if (!webhook) return reply({error:"Online inquiries are temporarily unavailable. Please call 905-709-7911."},503);
  const id = randomUUID();
  const payload = { id, submittedAt: new Date().toISOString(), source:"contact-form", consent:true,
    ...Object.fromEntries(Object.keys(limits).map((key)=>[key,typeof data[key] === "string" ? data[key].trim() : ""])) };
  try {
    const response = await fetch(webhook,{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":id},body:JSON.stringify(payload),signal:AbortSignal.timeout(8000),redirect:"error"});
    if (!response.ok) throw new Error("delivery_failed");
    return reply({ok:true,forwarded:true});
  } catch {
    // No inquiry text, email, phone, webhook URL or upstream response is logged.
    console.error("[contact] delivery not confirmed",{id});
    return reply({error:"We could not confirm delivery. Please call 905-709-7911 for assistance."},502);
  }
}
