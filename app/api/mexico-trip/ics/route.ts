import { NextResponse } from "next/server";
import { TRIP, TRIP_SLUG } from "@/lib/mexico-trip/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "2026-11-21" -> "20261121" */
const toIcsDate = (iso: string) => iso.replace(/-/g, "");

/** All-day DTEND is exclusive, so the calendar block ends the day after. */
function dayAfter(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return toIcsDate(d.toISOString().slice(0, 10));
}

const escapeText = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** RFC 5545 caps content lines at 75 octets; continuations start with a space. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest) parts.push(` ${rest}`);
  return parts.join("\r\n");
}

export async function GET() {
  const stamp = `${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;

  const description = [
    TRIP.tagline,
    "",
    `${TRIP.resort} — ${TRIP.region}.`,
    TRIP.promise,
    "",
    TRIP.note,
  ].join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Keybase Financial Group//Playa del Carmen 2026//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${TRIP_SLUG}@keybasefinancial.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${toIcsDate(TRIP.startDate)}`,
    `DTEND;VALUE=DATE:${dayAfter(TRIP.endDate)}`,
    `SUMMARY:${escapeText(`Keybase Qualifiers Trip — ${TRIP.title}`)}`,
    `LOCATION:${escapeText(`${TRIP.resort}, ${TRIP.region}, Mexico`)}`,
    `DESCRIPTION:${escapeText(description)}`,
    "STATUS:CONFIRMED",
    "TRANSP:TRANSPARENT",
    "BEGIN:VALARM",
    "TRIGGER:-P30D",
    "ACTION:DISPLAY",
    "DESCRIPTION:One month until Playa del Carmen",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const body = `${lines.map(fold).join("\r\n")}\r\n`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${TRIP_SLUG}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
