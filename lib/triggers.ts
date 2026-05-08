import { getMarketEvent, type MarketData } from "@/lib/marketData";
import type { Severity } from "@/lib/email/types";

export type TriggerType = "Market Drop" | "Market Rally" | null;

export interface TriggerEvaluation {
  triggerType: TriggerType;
  severity: Severity;
}

export function evaluateTriggers(data: MarketData): TriggerEvaluation {
  const event = getMarketEvent(data);
  if (event === "Stable") {
    return { triggerType: null, severity: "Low" };
  }

  const magnitude = Math.abs(data.sp500Change);
  const severity: Severity =
    magnitude > 5 ? "High" : magnitude >= 3 ? "Medium" : "Low";

  return {
    triggerType: event === "Market Drop" ? "Market Drop" : "Market Rally",
    severity,
  };
}
