import {
  RISK_PROFILES,
  type ClientProfileData,
  type RiskProfile,
} from "@/lib/onboarding";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cleanString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const isISODate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value);

export interface ParseResult {
  ok: true;
  value: ClientProfileData;
}

export interface ParseError {
  ok: false;
  error: string;
}

/**
 * Validates the JSON payload posted by the OnboardingForm. Returns a normalised
 * ClientProfileData on success or a structured error on failure.
 */
export function parseClientPayload(
  raw: unknown
): ParseResult | ParseError {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Body must be a JSON object." };
  }
  const r = raw as Record<string, unknown>;

  const firstName = cleanString(r.firstName);
  if (!firstName) return { ok: false, error: "First name is required." };

  const lastName = cleanString(r.lastName);
  if (!lastName) return { ok: false, error: "Last name is required." };

  const emailRaw = cleanString(r.email);
  if (!emailRaw || !EMAIL_PATTERN.test(emailRaw)) {
    return { ok: false, error: "A valid email is required." };
  }
  const email = emailRaw.toLowerCase();

  const dateOfBirth = cleanString(r.dateOfBirth);
  if (dateOfBirth && !isISODate(dateOfBirth)) {
    return { ok: false, error: "Date of birth must be in YYYY-MM-DD format." };
  }

  const riskRaw = cleanString(r.riskProfile);
  if (!riskRaw || !(RISK_PROFILES as readonly string[]).includes(riskRaw)) {
    return { ok: false, error: "Risk profile must be Low, Medium, or High." };
  }
  const riskProfile = riskRaw as RiskProfile;

  let annualIncome: number | null = null;
  if (r.annualIncome !== undefined && r.annualIncome !== null && r.annualIncome !== "") {
    const n = Number(r.annualIncome);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: "Annual income must be a non-negative number." };
    }
    annualIncome = n;
  }

  return {
    ok: true,
    value: {
      firstName,
      lastName,
      email,
      phone: cleanString(r.phone),
      dateOfBirth,
      address: cleanString(r.address),
      city: cleanString(r.city),
      country: cleanString(r.country),
      employmentStatus: cleanString(r.employmentStatus),
      annualIncome,
      riskProfile,
      advisorName: cleanString(r.advisorName),
    },
  };
}
