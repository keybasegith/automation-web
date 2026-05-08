import type {
  AdvisorPreferences,
  ClientProfile,
  CommunicationStyle,
  Severity,
  Tone,
} from "@/lib/email/types";
import type { TriggerType } from "@/lib/triggers";

export interface Client extends ClientProfile {
  id: string;
  email: string;
}

// IDs are deterministic UUIDs that match the seed in supabase/schema.sql.
export const MOCK_CLIENTS: readonly Client[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    clientName: "Sarah Chen",
    email: "sarah.chen@example.com",
    age: 58,
    riskTolerance: "Medium",
    investmentHorizon: "Medium",
    portfolioValue: 850_000,
    clientType: "HNW",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    clientName: "James Patel",
    email: "james.patel@example.com",
    age: 42,
    riskTolerance: "High",
    investmentHorizon: "Long",
    portfolioValue: 320_000,
    clientType: "Retail",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    clientName: "Maria Rodriguez",
    email: "maria.rodriguez@example.com",
    age: 67,
    riskTolerance: "Low",
    investmentHorizon: "Short",
    portfolioValue: 1_240_000,
    clientType: "Retiree",
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    clientName: "David Kim",
    email: "david.kim@example.com",
    age: 49,
    riskTolerance: "Medium",
    investmentHorizon: "Long",
    portfolioValue: 2_100_000,
    clientType: "HNW",
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    clientName: "Emma Thompson",
    email: "emma.thompson@example.com",
    age: 71,
    riskTolerance: "Low",
    investmentHorizon: "Short",
    portfolioValue: 540_000,
    clientType: "Retiree",
  },
];

export function selectClients(triggerType: TriggerType): Client[] {
  if (triggerType === null) return [];
  return [...MOCK_CLIENTS];
}

export function getAdvisorPreferences(
  client: Client,
  severity: Severity,
  triggerType: TriggerType
): AdvisorPreferences {
  let tone: Tone = "Professional";

  if (triggerType === "Market Drop" && severity === "High") {
    tone = "Reassuring";
  } else if (client.clientType === "Retiree") {
    tone = "Reassuring";
  } else if (client.riskTolerance === "Low") {
    tone = "Reassuring";
  } else if (client.riskTolerance === "High") {
    tone = "Professional";
  } else if (triggerType === "Market Rally") {
    tone = "Friendly";
  }

  const communicationStyle: CommunicationStyle =
    client.clientType === "HNW" || client.clientType === "Retiree"
      ? "Detailed"
      : "Short";

  return { tone, communicationStyle };
}
