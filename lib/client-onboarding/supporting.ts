/**
 * Documents the NAAF and CRQ require alongside the boxes on the form.
 *
 * Each one is written on the forms themselves — "All clients must complete the
 * Declaration of Tax Residence (RC518) or for Entities (RC519)", "If Yes,
 * complete the PEP/HIO Declaration", "Attach void cheque, if not on file",
 * "attach P.O.A. documents", "ID verified and on file", and on the corporate
 * CRQ "signed by the Authorized Signing Officer, as designated in the
 * corporate resolution or articles of incorporation". Which apply depends on
 * the answers, so the list is derived, never stored.
 *
 * For each, the advisor either uploads a copy (filed on the client's record)
 * or confirms the original is already on file.
 */

import { isEntity } from "@/lib/naaf/completeness";
import type { HolderInfo, NaafState } from "@/lib/naaf/types";

export type RequirementId =
  | "id-A"
  | "id-B"
  | "tax-residence-A"
  | "tax-residence-B"
  | "pep-A"
  | "pep-B"
  | "void-cheque"
  | "poa"
  | "corporate-authority";

export interface Requirement {
  id: RequirementId;
  title: string;
  /** Why it is needed, quoting the form. */
  why: string;
}

export type SupportingStatus =
  | { status: "uploaded"; documentId: string; fileName: string }
  | { status: "on_file" };

export type SupportingState = Partial<Record<RequirementId, SupportingStatus>>;

const personName = (h: HolderInfo, fallback: string) =>
  [h.firstName.trim(), h.surname.trim()].filter(Boolean).join(" ") || fallback;

const ID_EVIDENCE: Record<NonNullable<HolderInfo["idMethod"]>, string> = {
  photo: "a copy of the photo ID",
  dual: "the two documents verifying name, address and date of birth",
  credit: "the credit check report",
};

/** The documents this application needs, in the order to collect them. */
export function requirementsFor(naaf: NaafState): Requirement[] {
  const out: Requirement[] = [];
  const holders: { key: "A" | "B"; info: HolderInfo; label: string }[] = [
    { key: "A", info: naaf.clientA, label: isEntity(naaf.clientA.holderType) ? naaf.clientA.surname.trim() || "the entity" : personName(naaf.clientA, "Client A") },
    ...(naaf.hasJointHolder ? [{ key: "B" as const, info: naaf.clientB, label: personName(naaf.clientB, "Client B") }] : []),
  ];

  for (const { key, info, label } of holders) {
    const evidence = info.idMethod ? ID_EVIDENCE[info.idMethod] : "the identification documents";
    out.push({
      id: `id-${key}`,
      title: `Identification — ${label}`,
      why: `“ID verified and on file must be authentic, valid and current.” Keep ${evidence} on file.`,
    });
  }

  for (const { key, info, label } of holders) {
    const entity = key === "A" && isEntity(info.holderType);
    out.push({
      id: `tax-residence-${key}`,
      title: `Declaration of Tax Residence (${entity ? "RC519" : "RC518"}) — ${label}`,
      why: "“All clients must complete the Declaration of Tax Residence for Individuals (RC518) or for Entities (RC519).”",
    });
  }

  for (const { key, info, label } of holders) {
    if (info.pep === "Yes" || info.pepAssociate === "Yes") {
      out.push({
        id: `pep-${key}`,
        title: `PEP/HIO Declaration — ${label}`,
        why: "A politically exposed person / HIO question was answered Yes: “If Yes, complete the PEP/HIO Declaration.”",
      });
    }
  }

  const bank = naaf.banking;
  const bankGiven =
    bank.owner !== null || bank.accountType !== null || [bank.bankName, bank.transit, bank.bankNumber, bank.accountNumber].some((v) => v.trim());
  if (bankGiven && !bank.voidChequeOnFile) {
    out.push({
      id: "void-cheque",
      title: "Void cheque",
      why: "Banking details were given and no void cheque is on file: “Attach void cheque, if not on file.”",
    });
  }

  if (naaf.plans.some((p) => p.thirdParty.tradingAuthorization === "Yes")) {
    out.push({
      id: "poa",
      title: "Power of attorney documents",
      why: "Someone other than the applicant will have trading authorization: “attach P.O.A. documents.”",
    });
  }

  if (isEntity(naaf.clientA.holderType)) {
    out.push({
      id: "corporate-authority",
      title: "Corporate resolution or articles of incorporation",
      why: "“The CRQ must be signed by the Authorized Signing Officer, as designated in the corporate resolution or articles of incorporation.”",
    });
  }

  return out;
}

export const supportingFieldId = (id: RequirementId) => `supporting-${id}`;

/** Requirements not yet uploaded or confirmed on file. */
export function missingRequirements(naaf: NaafState, supporting: SupportingState): Requirement[] {
  return requirementsFor(naaf).filter((r) => !supporting[r.id]);
}
