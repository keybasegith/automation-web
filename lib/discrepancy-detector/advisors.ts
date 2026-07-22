/**
 * Advisor lookup — spec 10. Rep-code first.
 *
 * The contact list lives at /public/discrepancy-detector/advisors.json so a
 * non-developer can edit it without touching code. It is fetched same-origin
 * from the app's own static assets: no third-party request, nothing leaves the
 * machine.
 *
 * Sending a client's KYC details to the wrong advisor is a privacy incident, so
 * this module never silently picks a winner — anything short of a single
 * confident hit is reported as unconfident and the reviewer chooses from the
 * full list.
 */

import { normalizeIdentifier } from "./normalize";
import type { Advisor, AdvisorMatch } from "./types";

export const ADVISORS_URL = "/discrepancy-detector/advisors.json";

/** Accepts the documented JSON shape and discards malformed entries. */
export function parseAdvisors(raw: unknown): Advisor[] {
  if (!Array.isArray(raw)) return [];
  const out: Advisor[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const rep_code = typeof rec.rep_code === "string" ? rec.rep_code.trim() : "";
    const advisor_name =
      typeof rec.advisor_name === "string" ? rec.advisor_name.trim() : "";
    const email = typeof rec.email === "string" ? rec.email.trim() : "";
    if (!advisor_name || !email) continue;
    out.push({ rep_code, advisor_name, email });
  }
  return out;
}

export async function loadAdvisors(signal?: AbortSignal): Promise<Advisor[]> {
  const res = await fetch(ADVISORS_URL, { cache: "no-store", signal });
  if (!res.ok) throw new Error(`Could not load the advisor contact file (${res.status}).`);
  return parseAdvisors(await res.json());
}

/**
 * Resolve the advisor for a NAAF.
 *
 * A rep code is far more reliable than a typed or handwritten advisor name, so
 * it is tried first; the name is only a fallback when the code is absent or
 * unknown. A name that matches more than one advisor is never auto-selected.
 */
export function resolveAdvisor(
  advisors: readonly Advisor[],
  repCode: string,
  advisorName: string
): AdvisorMatch {
  const code = normalizeIdentifier(repCode);

  if (code) {
    const hits = advisors.filter((a) => normalizeIdentifier(a.rep_code) === code);
    if (hits.length === 1) {
      return {
        advisor: hits[0],
        basis: "rep_code",
        confident: true,
        reason: `Matched on rep code ${repCode.trim()} from Section R.`,
      };
    }
    if (hits.length > 1) {
      return {
        advisor: null,
        basis: "rep_code",
        confident: false,
        reason: `Rep code ${repCode.trim()} appears more than once in the contact file. Select the correct advisor.`,
      };
    }
  }

  const name = normalizeIdentifier(advisorName);
  if (name) {
    const hits = advisors.filter((a) => normalizeIdentifier(a.advisor_name) === name);
    if (hits.length === 1) {
      return {
        advisor: hits[0],
        basis: "name",
        confident: true,
        reason: code
          ? `Rep code ${repCode.trim()} is not in the contact file; matched on the advisor name instead. Confirm this is correct.`
          : `No rep code on the NAAF; matched on the advisor name instead. Confirm this is correct.`,
      };
    }
    if (hits.length > 1) {
      return {
        advisor: null,
        basis: "name",
        confident: false,
        reason: `More than one advisor is named "${advisorName.trim()}". Select the correct advisor.`,
      };
    }
  }

  return {
    advisor: null,
    basis: "none",
    confident: false,
    reason:
      code || name
        ? "No advisor in the contact file matches the rep code or advisor name on this NAAF. Select the advisor manually."
        : "The NAAF has no rep code or advisor name to match on. Select the advisor manually.",
  };
}
