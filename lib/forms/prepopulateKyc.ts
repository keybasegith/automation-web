"use client";

import {
  PDFCheckBox,
  PDFDocument,
  PDFField,
  PDFTextField,
} from "pdf-lib";

/**
 * Pre-populate a blank KYC form from a filled NAAF form.
 *
 * COMPLIANCE INVARIANT — read before editing:
 *   This module runs ENTIRELY in the browser. No client data is sent to any
 *   external service (OpenAI, Anthropic, etc.). The transformation is a
 *   straight read-write of AcroForm field values:
 *
 *     NAAF (filled, has form fields)    → read field values via pdf-lib
 *     KYC (blank template, has fields)  → write matching field values
 *
 *   Both forms publish 255 identical field names (txtLastName, txtSIN,
 *   txtDOB, txtAddress, txtEmail, txtEmployerName, all checkboxes, etc.),
 *   so the mapping is by-name and deterministic.
 *
 *   Signature fields are intentionally skipped — a pre-populated KYC must
 *   be re-signed by the client; carrying signatures across forms would be
 *   a forgery risk.
 */

/** Path under public/ where the blank KYC template lives. */
export const KYC_TEMPLATE_URL = "/form-KYC.pdf";

/**
 * Field name prefixes we never copy from NAAF to KYC. Signatures and
 * date-of-signing fields must be filled in fresh on the new KYC.
 */
const SKIP_FIELD_PREFIXES = ["sig"];

/**
 * Field names we never copy. Internal page-tracking flags etc.
 */
const SKIP_FIELD_NAMES = new Set<string>([
  "sigSenderInitials",
]);

export interface PrepopulationResult {
  filledPdfBytes: Uint8Array;
  /** Total fields present in the blank KYC template. */
  totalKycFields: number;
  /** How many of those fields received a value from the NAAF. */
  fieldsCopied: number;
  /** KYC fields that have no equivalent in the NAAF (advisor must fill manually). */
  unmappedFields: string[];
  /** NAAF fields that had a value but no matching KYC field — informational only. */
  ignoredFields: string[];
}

/**
 * Read all AcroForm field values from the source NAAF and write the same
 * values into the blank KYC template, matching by field name.
 *
 * @param naafBytes - The filled NAAF PDF as bytes (from a File upload).
 * @param blankKycBytes - The blank KYC template as bytes (fetched from /public).
 */
export async function prepopulateKycFromNaaf(
  naafBytes: ArrayBuffer | Uint8Array,
  blankKycBytes: ArrayBuffer | Uint8Array
): Promise<PrepopulationResult> {
  const naaf = await PDFDocument.load(naafBytes, { ignoreEncryption: true });
  const kyc = await PDFDocument.load(blankKycBytes, { ignoreEncryption: true });

  const naafForm = naaf.getForm();
  const kycForm = kyc.getForm();

  const naafFields = naafForm.getFields();
  const kycFields = kycForm.getFields();

  // Build a map of KYC field-name → field for fast lookup, plus a set of
  // names so we can detect unmapped NAAF fields.
  const kycFieldByName = new Map(kycFields.map((f) => [f.getName(), f]));
  const kycFieldNames = new Set(kycFieldByName.keys());

  let fieldsCopied = 0;
  const ignoredFields: string[] = [];
  const filledKycNames = new Set<string>();

  for (const naafField of naafFields) {
    const name = naafField.getName();

    if (shouldSkip(name)) continue;

    const kycField = kycFieldByName.get(name);
    if (!kycField) {
      // NAAF has this field but KYC doesn't — informational only.
      const value = readFieldValue(naafField);
      if (value !== null && value !== "" && value !== false) {
        ignoredFields.push(name);
      }
      continue;
    }

    const wrote = copyFieldValue(naafField, kycField);
    if (wrote) {
      fieldsCopied += 1;
      filledKycNames.add(name);
    }
  }

  // KYC fields that the advisor will need to fill manually because the NAAF
  // had no equivalent. We only flag the "important" fields here — purely
  // structural ones like internal page flags are noise.
  const unmappedFields = [...kycFieldNames]
    .filter((n) => !filledKycNames.has(n))
    .filter((n) => !shouldSkip(n));

  // Re-flatten the appearance streams so the values render in any PDF
  // viewer (Preview, Acrobat, browsers). Without this, some viewers show
  // the placeholder rather than the value.
  kycForm.updateFieldAppearances();

  const filledPdfBytes = await kyc.save();
  return {
    filledPdfBytes,
    totalKycFields: kycFields.length,
    fieldsCopied,
    unmappedFields,
    ignoredFields,
  };
}

function shouldSkip(name: string): boolean {
  if (SKIP_FIELD_NAMES.has(name)) return true;
  for (const prefix of SKIP_FIELD_PREFIXES) {
    if (name.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * Best-effort read of a field's value. Returns null if the field type isn't
 * one we know how to read (radio groups, dropdowns, etc.) — those fall
 * through to the default in the KYC.
 */
function readFieldValue(field: PDFField): string | boolean | null {
  if (field instanceof PDFTextField) {
    return field.getText() ?? "";
  }
  if (field instanceof PDFCheckBox) {
    return field.isChecked();
  }
  return null;
}

/**
 * Copy the value from a NAAF field to a same-named KYC field. Returns true
 * if a value was written (false for empty NAAF fields, type mismatches,
 * unsupported field types).
 */
function copyFieldValue(source: PDFField, target: PDFField): boolean {
  if (source instanceof PDFTextField && target instanceof PDFTextField) {
    const text = source.getText();
    if (text === undefined || text === null || text === "") return false;
    try {
      target.setText(text);
      return true;
    } catch {
      return false;
    }
  }
  if (source instanceof PDFCheckBox && target instanceof PDFCheckBox) {
    if (!source.isChecked()) return false;
    try {
      target.check();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
