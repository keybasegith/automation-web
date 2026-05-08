import type { KycFields } from "@/lib/forms/types";

const HEADERS = [
  "Client Full Name",
  "Date of Birth",
  "Account Type",
  "Account Number",
  "Address",
  "Phone",
  "Email",
  "Advisor Name",
  "Advisor Code",
  "Investment Objective",
  "Risk Tolerance",
  "Time Horizon",
  "Investment Knowledge",
  "Source of Funds",
  "Compliance Approved At",
] as const;

export interface WindFundCoreRow {
  kyc: KycFields;
  accountNumber: string;
  complianceApprovedAt: string;
}

const escape = (value: string | null | undefined): string => {
  if (value === null || value === undefined) return "";
  const v = String(value);
  if (v.includes("\"") || v.includes(",") || v.includes("\n") || v.includes("\r")) {
    return `"${v.replaceAll('"', '""')}"`;
  }
  return v;
};

export function exportWindFundCoreCsv(rows: readonly WindFundCoreRow[]): string {
  const lines: string[] = [];
  lines.push(HEADERS.map(escape).join(","));
  for (const row of rows) {
    const k = row.kyc;
    lines.push(
      [
        k.clientFullName,
        k.dateOfBirth,
        k.accountType,
        row.accountNumber,
        k.address,
        k.phone,
        k.email,
        k.advisorName,
        k.advisorCode,
        k.investmentObjective,
        k.riskTolerance,
        k.timeHorizon,
        k.investmentKnowledge,
        k.sourceOfFunds,
        row.complianceApprovedAt,
      ]
        .map(escape)
        .join(",")
    );
  }
  return lines.join("\n");
}
