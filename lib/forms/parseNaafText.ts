import {
  emptyNaafFields,
} from "@/lib/forms/sampleNaafData";
import type {
  ExtractedNAAFData,
  FieldSource,
  NaafField,
  NaafFields,
} from "@/lib/forms/types";

/**
 * Conservative regex parser. Looks for common label patterns that the existing
 * NAAF templates use ("Field Name: value" / "Field Name - value"). When a line
 * cannot be confidently mapped, the field is left blank and a warning is added
 * — the advisor confirms or corrects every value in the next step.
 */

interface FieldRule {
  field: NaafField;
  /** Each pattern must capture the value in group 1. */
  patterns: readonly RegExp[];
}

const FIELD_RULES: readonly FieldRule[] = [
  rule("fullName", [
    /^\s*Full Name\s*[:\-]\s*(.+)$/im,
    /^\s*Client Name\s*[:\-]\s*(.+)$/im,
    /^\s*Name\s*[:\-]\s*(.+)$/im,
  ]),
  rule("dateOfBirth", [
    /^\s*Date of Birth\s*[:\-]\s*([0-9A-Za-z\-/, ]+)$/im,
    /^\s*DOB\s*[:\-]\s*([0-9A-Za-z\-/, ]+)$/im,
  ]),
  rule("email", [/^\s*Email\s*[:\-]\s*(\S+@\S+)$/im]),
  rule("phone", [/^\s*Phone\s*[:\-]\s*(.+)$/im, /^\s*Telephone\s*[:\-]\s*(.+)$/im]),
  rule("address", [
    /^\s*Address\s*[:\-]\s*(.+)$/im,
    /^\s*Street(?:\s+Address)?\s*[:\-]\s*(.+)$/im,
  ]),
  rule("city", [/^\s*City\s*[:\-]\s*(.+)$/im]),
  rule("province", [/^\s*Province\s*[:\-]\s*(.+)$/im, /^\s*State\s*[:\-]\s*(.+)$/im]),
  rule("postalCode", [
    /^\s*Postal Code\s*[:\-]\s*(.+)$/im,
    /^\s*Zip(?:\s*Code)?\s*[:\-]\s*(.+)$/im,
  ]),
  rule("country", [/^\s*Country\s*[:\-]\s*(.+)$/im]),
  rule("sin", [/^\s*SIN\s*[:\-]\s*(.+)$/im]),

  rule("employmentStatus", [/^\s*Employment Status\s*[:\-]\s*(.+)$/im]),
  rule("employerName", [
    /^\s*Employer(?:\s+Name)?\s*[:\-]\s*(.+)$/im,
  ]),
  rule("occupation", [/^\s*Occupation\s*[:\-]\s*(.+)$/im]),
  rule("annualIncome", [/^\s*Annual Income\s*[:\-]\s*(.+)$/im]),
  rule("liquidNetWorth", [/^\s*Liquid Net Worth\s*[:\-]\s*(.+)$/im]),
  rule("fixedAssets", [/^\s*Fixed Assets\s*[:\-]\s*(.+)$/im]),
  rule("totalNetWorth", [/^\s*Total Net Worth\s*[:\-]\s*(.+)$/im]),
  rule("investmentKnowledge", [/^\s*Investment Knowledge\s*[:\-]\s*(.+)$/im]),
  rule("sourceOfFunds", [/^\s*Source of Funds\s*[:\-]\s*(.+)$/im]),

  rule("accountType", [/^\s*Account Type\s*[:\-]\s*(.+)$/im]),
  rule("accountNumber", [/^\s*Account Number\s*[:\-]\s*(.+)$/im]),
  rule("accountPurpose", [
    /^\s*Account Purpose\s*[:\-]\s*(.+)$/im,
    /^\s*Purpose\s*[:\-]\s*(.+)$/im,
  ]),
  rule("jurisdiction", [/^\s*Jurisdiction\s*[:\-]\s*(.+)$/im]),
  rule("currency", [/^\s*Currency\s*[:\-]\s*(.+)$/im]),
  rule("advisorName", [
    /^\s*Advisor(?:\s+Name)?\s*[:\-]\s*([^()]+?)\s*(?:\([^)]+\))?\s*$/im,
  ]),
  rule("advisorCode", [
    /^\s*Advisor Code\s*[:\-]\s*(.+)$/im,
    /Advisor:\s*[^()]+\(([^)]+)\)/i,
  ]),
  rule("branch", [/^\s*Branch\s*[:\-]\s*(.+)$/im]),
  rule("dateCompleted", [
    /^\s*Date Completed\s*[:\-]\s*(.+)$/im,
    /^\s*Date\s*[:\-]\s*([0-9A-Za-z\-/, ]+)$/im,
  ]),

  rule("investmentObjective", [/^\s*Investment Objective\s*[:\-]\s*(.+)$/im]),
  rule("riskTolerance", [/^\s*Risk Tolerance\s*[:\-]\s*(.+)$/im]),
  rule("timeHorizon", [/^\s*Time Horizon\s*[:\-]\s*(.+)$/im]),
  rule("liquidityNeeds", [/^\s*Liquidity Needs\s*[:\-]\s*(.+)$/im]),
  rule("intendedUse", [/^\s*Intended Use\s*[:\-]\s*(.+)$/im]),
  rule("investmentExperience", [
    /^\s*(?:Investment\s+)?Experience\s*[:\-]\s*(.+)$/im,
  ]),
];

function rule(field: NaafField, patterns: readonly RegExp[]): FieldRule {
  return { field, patterns };
}

const REQUIRED_NAAF_FIELDS: readonly NaafField[] = [
  "fullName",
  "dateOfBirth",
  "accountType",
];

export interface ParseNaafTextResult {
  data: ExtractedNAAFData;
}

/**
 * Parse raw OCR text into a partial NAAF record. Empty input returns a fully
 * blank record with a warning so the workflow can still continue (the advisor
 * fills in by hand or loads a sample).
 */
export function parseNaafText(rawText: string): ParseNaafTextResult {
  const fields = emptyNaafFields();
  const fieldSourceMap: Partial<Record<NaafField, FieldSource>> = {};
  const fieldConfidenceMap: Partial<Record<NaafField, number>> = {};
  const warnings: string[] = [];

  if (!rawText || !rawText.trim()) {
    for (const k of Object.keys(fields) as NaafField[]) {
      fieldSourceMap[k] = "missing";
    }
    warnings.push("No text could be extracted. Please complete fields manually.");
    return {
      data: {
        fields,
        rawText: rawText ?? "",
        extractionConfidence: 0.0,
        extractionWarnings: warnings,
        fieldConfidenceMap,
        fieldSourceMap,
      },
    };
  }

  for (const r of FIELD_RULES) {
    let matched = false;
    for (const pattern of r.patterns) {
      const m = pattern.exec(rawText);
      if (m && m[1]) {
        const cleaned = m[1].trim();
        if (cleaned) {
          fields[r.field] = cleaned;
          fieldSourceMap[r.field] = "extracted";
          fieldConfidenceMap[r.field] = 0.9;
          matched = true;
          break;
        }
      }
    }
    if (!matched && !fields[r.field]) {
      fieldSourceMap[r.field] = "missing";
    }
  }

  // Derive firstName/lastName from fullName when only fullName was found.
  if (!fields.firstName && !fields.lastName && fields.fullName) {
    const parts = fields.fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      fields.firstName = parts[0];
      fields.lastName = parts.slice(1).join(" ");
      fieldSourceMap.firstName = "extracted";
      fieldSourceMap.lastName = "extracted";
    }
  }

  for (const required of REQUIRED_NAAF_FIELDS) {
    if (!fields[required]) {
      warnings.push(
        `Required field "${required}" was not found. Please complete manually.`
      );
    }
  }

  const totalCount = Object.keys(fields).length;
  const filled = Object.values(fields).filter((v) => v && v.length > 0).length;
  const extractionConfidence =
    totalCount === 0 ? 0 : Math.round((filled / totalCount) * 1000) / 1000;

  return {
    data: {
      fields,
      rawText,
      extractionConfidence,
      extractionWarnings: warnings,
      fieldConfidenceMap,
      fieldSourceMap,
    },
  };
}

/**
 * Convenience: produce a `NaafFields` object where every value is a string.
 * Used by editors that bind directly to inputs.
 */
export function asEditableFields(data: ExtractedNAAFData): NaafFields {
  return { ...emptyNaafFields(), ...data.fields };
}
