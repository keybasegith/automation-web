/**
 * Client-side event reporting.
 *
 * Separate from lib/keybase-answer/analytics.ts on purpose: that module reads
 * the database and node:crypto and must never be pulled into a browser bundle.
 * The only thing shared is the event name type, and a type-only import is
 * erased at compile time.
 *
 * Events are sent with `sendBeacon` where it exists, so a click that navigates
 * away is still counted, and dropped silently otherwise — analytics must never
 * be the reason an interaction fails.
 */

import type { KeybaseAnswerEvent } from "@/lib/keybase-answer/analytics";

const ENDPOINT = "/api/keybase-answer/events";

export type ClientEventProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

export function trackClientEvent(
  name: KeybaseAnswerEvent,
  properties: ClientEventProperties = {},
): void {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    name,
    properties: Object.fromEntries(
      Object.entries(properties).filter(([, value]) => value !== undefined),
    ),
  });

  try {
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(
        ENDPOINT,
        new Blob([payload], { type: "application/json" }),
      );
      return;
    }
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Nothing here is worth surfacing to a reader.
  }
}

export type { KeybaseAnswerEvent };
