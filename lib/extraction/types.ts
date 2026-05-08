export const EXTRACTION_FIELDS = [
  "full_name",
  "date_of_birth",
  "address",
  "email",
  "phone",
  "employment_status",
  "annual_income",
  "risk_tolerance",
  "investment_horizon",
] as const;
export type ExtractionField = (typeof EXTRACTION_FIELDS)[number];

export interface ExtractedClientData {
  full_name: string | null;
  date_of_birth: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  employment_status: string | null;
  annual_income: string | null;
  risk_tolerance: string | null;
  investment_horizon: string | null;
}

export const SOURCE_TYPES = ["KYC", "NAAF"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const FIELD_LABELS: Record<ExtractionField, string> = {
  full_name: "Full name",
  date_of_birth: "Date of birth",
  address: "Address",
  email: "Email",
  phone: "Phone",
  employment_status: "Employment status",
  annual_income: "Annual income",
  risk_tolerance: "Risk tolerance",
  investment_horizon: "Investment horizon",
};

export const EMPTY_EXTRACTION: ExtractedClientData = {
  full_name: null,
  date_of_birth: null,
  address: null,
  email: null,
  phone: null,
  employment_status: null,
  annual_income: null,
  risk_tolerance: null,
  investment_horizon: null,
};
