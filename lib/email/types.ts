export const RISK_TOLERANCES = ["Low", "Medium", "High"] as const;
export type RiskTolerance = (typeof RISK_TOLERANCES)[number];

export const INVESTMENT_HORIZONS = ["Short", "Medium", "Long"] as const;
export type InvestmentHorizon = (typeof INVESTMENT_HORIZONS)[number];

export const CLIENT_TYPES = ["Retail", "HNW", "Retiree"] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];

export const EVENT_TYPES = [
  "Market Drop",
  "Market Rally",
  "Portfolio Change",
  "Retirement Approaching",
  "General Check-in",
  "Document Refresh",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const TONES = ["Professional", "Reassuring", "Friendly"] as const;
export type Tone = (typeof TONES)[number];

export const COMMUNICATION_STYLES = ["Short", "Detailed"] as const;
export type CommunicationStyle = (typeof COMMUNICATION_STYLES)[number];

export const SEVERITIES = ["Low", "Medium", "High"] as const;
export type Severity = (typeof SEVERITIES)[number];

export interface MarketContext {
  sp500Change: number;
  nasdaqChange: number;
  date: string;
  severity: Severity;
}

export type DocumentRefreshPriority = "HIGH" | "MEDIUM";

export interface DocumentRefreshItem {
  type: string;
  status: "expiring" | "expired";
  expiryDate: string;
}

export interface DocumentRefreshContext {
  priority: DocumentRefreshPriority;
  documents: DocumentRefreshItem[];
}

export interface ClientProfile {
  clientName: string;
  email: string;
  age: number;
  riskTolerance: RiskTolerance;
  investmentHorizon: InvestmentHorizon;
  portfolioValue: number;
  clientType: ClientType;
}

export interface EventTrigger {
  eventType: EventType;
  eventDetails: string;
}

export interface AdvisorPreferences {
  tone: Tone;
  communicationStyle: CommunicationStyle;
}

export interface GenerateEmailRequest {
  client: ClientProfile;
  event: EventTrigger;
  preferences: AdvisorPreferences;
  marketContext?: MarketContext;
  documentContext?: DocumentRefreshContext;
  /**
   * Optional. If provided, the API will link the saved email to this client
   * row directly. If omitted, the API upserts a client by `client.email`.
   */
  clientId?: string;
}

export interface GenerateEmailResponse {
  subject: string;
  body: string;
  emailId: string;
}

export interface GenerateEmailErrorResponse {
  error: string;
  detail?: string;
}
