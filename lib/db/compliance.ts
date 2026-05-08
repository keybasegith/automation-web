import { getServerSupabase } from "@/lib/supabaseClient";

export interface ComplianceSettings {
  signature: string;
  mandatoryFooter: string;
  requiredPhrases: string[];
  prohibitedPhrases: string[];
  updatedAt: string | null;
}

/**
 * Keybase confidentiality footer applied as the default mandatory footer on
 * every generated client email. The compliance team can override this in
 * the Compliance Settings page; if they leave it set, this is what every
 * outgoing email's final paragraph will be.
 */
export const KEYBASE_CONFIDENTIALITY_FOOTER =
  "The information in this Keybase e-mail is confidential and may be privileged. Any use or disclosure of this e-mail by anyone other than the intended recipient is unauthorized. If you are not the intended recipient, please delete this e-mail and notify us by reply e-mail.";

export const DEFAULT_COMPLIANCE_SETTINGS: ComplianceSettings = {
  signature: "Your Keybase Advisor",
  mandatoryFooter: KEYBASE_CONFIDENTIALITY_FOOTER,
  requiredPhrases: [],
  prohibitedPhrases: [],
  updatedAt: null,
};

interface ComplianceRow {
  signature: string;
  mandatory_footer: string;
  required_phrases: unknown;
  prohibited_phrases: unknown;
  updated_at: string;
}

const toStringArray = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
};

export async function getComplianceSettings(): Promise<ComplianceSettings> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("compliance_settings")
    .select("signature, mandatory_footer, required_phrases, prohibited_phrases, updated_at")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Compliance settings read failed: ${error.message}`);
  }
  if (!data) {
    return DEFAULT_COMPLIANCE_SETTINGS;
  }

  const row = data as unknown as ComplianceRow;
  return {
    signature: row.signature || DEFAULT_COMPLIANCE_SETTINGS.signature,
    mandatoryFooter: row.mandatory_footer ?? "",
    requiredPhrases: toStringArray(row.required_phrases),
    prohibitedPhrases: toStringArray(row.prohibited_phrases),
    updatedAt: row.updated_at,
  };
}

export interface UpdateComplianceInput {
  signature: string;
  mandatoryFooter: string;
  requiredPhrases: string[];
  prohibitedPhrases: string[];
  updatedBy: string;
}

export async function updateComplianceSettings(
  input: UpdateComplianceInput
): Promise<ComplianceSettings> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("compliance_settings")
    .update({
      signature: input.signature,
      mandatory_footer: input.mandatoryFooter,
      required_phrases: input.requiredPhrases,
      prohibited_phrases: input.prohibitedPhrases,
      updated_at: new Date().toISOString(),
      updated_by: input.updatedBy,
    })
    .eq("is_singleton", true)
    .select("signature, mandatory_footer, required_phrases, prohibited_phrases, updated_at")
    .single();

  if (error || !data) {
    throw new Error(
      `Compliance settings update failed: ${error?.message ?? "no row"}`
    );
  }

  const row = data as unknown as ComplianceRow;
  return {
    signature: row.signature,
    mandatoryFooter: row.mandatory_footer,
    requiredPhrases: toStringArray(row.required_phrases),
    prohibitedPhrases: toStringArray(row.prohibited_phrases),
    updatedAt: row.updated_at,
  };
}
