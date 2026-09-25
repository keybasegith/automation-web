/**
 * Fill Keybase's official fillable PDFs (AcroForms) from the app's digital
 * form state.
 *
 * Every function takes the blank template's BYTES; loading them is the
 * caller's job (a server route reads public/*.pdf with fs, the browser
 * fetches it). Nothing here touches the DOM or the filesystem, so the same
 * code runs in a Node route and in the browser.
 *
 *   NAAF  public/form-NAAF.pdf
 *   CRQ   public/crq-individualaccountholder.pdf
 *         public/crq-jointaccountholders.pdf
 *         public/crq-corporateaccounts.pdf
 */

import type { CrqVariant } from "../risk-questionnaire/types";

export { fillNaafPdf, NAAF_BINDINGS, NAAF_SIGNATURES } from "./naaf";
export { fillCrqPdf, crqBindings, CRQ_SIGNATURES } from "./crq";
export type { FillOptions } from "./types";

/** Template file under public/ for each form. */
export const NAAF_TEMPLATE = "form-NAAF.pdf";
export const CRQ_TEMPLATES: Readonly<Record<CrqVariant, string>> = {
  individual: "crq-individualaccountholder.pdf",
  joint: "crq-jointaccountholders.pdf",
  corporate: "crq-corporateaccounts.pdf",
};
