/**
 * Turning a finished onboarding into signed documents.
 *
 * Signatures are captured once per signer and applied to both the NAAF and
 * the CRQ — the signer is told on screen that one signature signs both. Dates
 * are stamped with the day of signing (Toronto time) rather than typed.
 *
 * Server only: reads the PDF templates and runs pdf-lib.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { fillCrqPdf, fillNaafPdf } from "@/lib/pdf-forms";
import { CRQ_FORMS } from "@/lib/risk-questionnaire/forms";
import { isValidSignatureDataUrl } from "@/lib/signature";
import type { CrqVariant } from "@/lib/risk-questionnaire/types";

import type { OnboardingDraft } from "./draft";
import { blockingBeforeSigning, findingsFor, type StepFinding } from "./steps";

export interface Signatures {
  /** Client A (or the corporation's Authorized Signing Officer). */
  client1?: string | null;
  /** The joint account holder. */
  client2?: string | null;
  advisor?: string | null;
}

/** Today in Keybase's time zone, as yyyy-mm-dd — the format the date boxes use. */
export const signingDate = (now: Date = new Date()): string =>
  now.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });

/** Writes each provided signature, and today's date, into both forms. */
export function applySignatures(draft: OnboardingDraft, signatures: Signatures, date: string): OnboardingDraft {
  const naaf = structuredClone(draft.naaf);
  const crq = { ...draft.crq };
  if (signatures.client1) {
    naaf.clientSignatures[0] = { signature: signatures.client1, date };
    crq.accountHolderSignature = signatures.client1;
    crq.accountHolderDate = date;
  }
  if (signatures.client2) {
    naaf.clientSignatures[1] = { signature: signatures.client2, date };
    crq.jointHolderSignature = signatures.client2;
    crq.jointHolderDate = date;
  }
  if (signatures.advisor) {
    naaf.advisor = { ...naaf.advisor, signature: signatures.advisor, date };
    crq.advisorSignature = signatures.advisor;
    crq.advisorDate = date;
    if (!crq.advisorName.trim()) crq.advisorName = naaf.advisor.name;
  }
  return { ...draft, naaf, crq };
}

/** Who has to sign this application. */
export function requiredSigners(draft: OnboardingDraft): (keyof Signatures)[] {
  return draft.naaf.hasJointHolder ? ["client1", "client2", "advisor"] : ["client1", "advisor"];
}

/** Rejects anything that is not a canvas PNG/JPEG data URL. */
export function cleanSignatures(input: unknown): Signatures {
  const v = (input ?? {}) as Record<string, unknown>;
  const pick = (key: string) => (isValidSignatureDataUrl(v[key]) ? (v[key] as string) : null);
  return { client1: pick("client1"), client2: pick("client2"), advisor: pick("advisor") };
}

/** What still stops this application being sent for signature. */
export function outstandingBeforeSigning(draft: OnboardingDraft): StepFinding[] {
  return blockingBeforeSigning(findingsFor(draft));
}

// ---------------------------------------------------------------- templates

/**
 * The blank forms. Reading files under process.cwd() makes the bundler trace
 * the whole project into the server function — ~480 MB of video and images
 * from public/ — which breaks Vercel's 250 MB function limit. So the reads
 * carry turbopackIgnore, and next.config.ts's outputFileTracingIncludes adds
 * back exactly these four PDFs for the onboarding routes.
 */
const TEMPLATES = {
  naaf: { file: "form-NAAF.pdf", path: () => path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "form-NAAF.pdf") },
  individual: {
    file: "crq-individualaccountholder.pdf",
    path: () => path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "crq-individualaccountholder.pdf"),
  },
  joint: { file: "crq-jointaccountholders.pdf", path: () => path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "crq-jointaccountholders.pdf") },
  corporate: { file: "crq-corporateaccounts.pdf", path: () => path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "crq-corporateaccounts.pdf") },
} as const;

const templateCache = new Map<string, Uint8Array>();

/**
 * Reads a blank form from public/. If the file is not beside the function
 * after all, it is fetched from the site itself — the same file the browser
 * would get.
 */
async function loadTemplate(name: keyof typeof TEMPLATES, origin: string): Promise<Uint8Array> {
  const { file, path: filePath } = TEMPLATES[name];
  const cached = templateCache.get(file);
  if (cached) return cached;
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await readFile(/*turbopackIgnore: true*/ filePath()));
  } catch {
    const response = await fetch(new URL(`/${file}`, origin));
    if (!response.ok) throw new Error(`Could not load the blank ${file} (${response.status}).`);
    bytes = new Uint8Array(await response.arrayBuffer());
  }
  templateCache.set(file, bytes);
  return bytes;
}

export interface GeneratedDocuments {
  naaf: Uint8Array;
  crq: Uint8Array;
  crqVariant: CrqVariant;
}

/**
 * Fills the official NAAF and the matching CRQ from the draft, signatures and
 * dates included. `flatten` makes the result read-only — used for executed
 * copies, so a signed document cannot be edited after the fact.
 */
export async function generateDocuments(
  draft: OnboardingDraft,
  { origin, flatten }: { origin: string; flatten: boolean },
): Promise<GeneratedDocuments> {
  const [naafTemplate, crqTemplate] = await Promise.all([
    loadTemplate("naaf", origin),
    loadTemplate(draft.variant, origin),
  ]);
  const [naaf, crq] = await Promise.all([
    fillNaafPdf(naafTemplate, draft.naaf, { flatten }),
    fillCrqPdf(crqTemplate, crqForPrint(draft), draft.variant, { flatten }),
  ]);
  return { naaf, crq, crqVariant: draft.variant };
}

/**
 * The joint CRQ prints "(Balanced/Growth/High Growth)" as text to be circled,
 * with no box for the choice. So the chosen goal would not reach the signed
 * paper, it is written into the account blank beside it: "Joint TFSA (Growth)".
 */
function crqForPrint(draft: OnboardingDraft) {
  const { crq } = draft;
  if (draft.variant !== "joint" || crq.acknowledgementType !== "single_account" || !crq.acknowledgementGoal) return crq;
  return { ...crq, acknowledgementAccountName: `${crq.acknowledgementAccountName.trim()} (${crq.acknowledgementGoal})` };
}

/** Human titles for the filed documents. */
export function documentTitles(draft: OnboardingDraft, signed: boolean) {
  const who =
    draft.variant === "corporate"
      ? draft.naaf.clientA.surname.trim()
      : [draft.naaf.clientA.firstName.trim(), draft.naaf.clientA.surname.trim()].filter(Boolean).join(" ");
  const suffix = signed ? "signed" : "for signature";
  return {
    naaf: `New Account Application Form — ${who || "client"} (${suffix})`,
    crq: `Client Risk Questionnaire, ${CRQ_FORMS[draft.variant].subtitle} — ${who || "client"} (${suffix})`,
  };
}
