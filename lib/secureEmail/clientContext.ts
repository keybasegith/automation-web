import type { ClientRow } from "@/lib/db/types";
import {
  CLIENT_SEGMENTS,
  CLIENT_STAGES,
  type ClientSegment,
  type ClientStage,
} from "@/lib/secureEmail/types";

/**
 * Browser-facing context for a single client. The advisor's UI may render the
 * name and email for convenience, but the secure-email pipeline strips these
 * fields before contacting OpenAI.
 */
export interface ClientContext {
  clientId: string;
  firstName: string;
  fullName: string;
  email: string;
  segment: ClientSegment;
  stage: ClientStage;
  advisorId: string;
}

const TIER_BREAKPOINTS: ReadonlyArray<{
  ceiling: number;
  segment: ClientSegment;
}> = [
  { ceiling: 1_000_000, segment: "Mass affluent" },
  { ceiling: 5_000_000, segment: "High net worth" },
  { ceiling: Number.POSITIVE_INFINITY, segment: "Ultra high net worth" },
];

/**
 * The DB doesn't store a discrete `segment` column today. We derive it from
 * portfolio_value so the form can pre-populate sensibly. The advisor can still
 * override via the dropdown before generating.
 */
export function deriveSegment(portfolioValue: number): ClientSegment {
  if (!Number.isFinite(portfolioValue) || portfolioValue <= 0) {
    return "Retail";
  }
  for (const tier of TIER_BREAKPOINTS) {
    if (portfolioValue < tier.ceiling) return tier.segment;
  }
  return "Mass affluent";
}

/**
 * Stage isn't stored either; default to "Long-term client" and let the advisor
 * pick the right value if it doesn't fit. Importantly, this default lives on
 * the server only — it never affects what is sent to OpenAI unless the form
 * also forwards it.
 */
export const DEFAULT_STAGE: ClientStage = "Long-term client";

const splitFirstName = (fullName: string): string => {
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  const [first] = trimmed.split(/\s+/, 1);
  return first ?? "";
};

export function buildClientContext(
  client: ClientRow,
  advisorId: string
): ClientContext {
  const segment = deriveSegment(client.portfolio_value);
  // Validate against the canonical set so a future segment string from the DB
  // can't crash the form.
  const safeSegment: ClientSegment = (CLIENT_SEGMENTS as readonly string[]).includes(
    segment
  )
    ? segment
    : "Retail";
  const stage: ClientStage = (CLIENT_STAGES as readonly string[]).includes(DEFAULT_STAGE)
    ? DEFAULT_STAGE
    : "Long-term client";
  return {
    clientId: client.id,
    firstName: splitFirstName(client.name),
    fullName: client.name,
    email: client.email,
    segment: safeSegment,
    stage,
    advisorId,
  };
}
