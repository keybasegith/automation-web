/**
 * Fills the real fillable forms in /public so extraction can be tested against
 * the actual documents rather than against a mock of them.
 *
 * Setting a button field takes two writes, not one: `/V` on the field AND `/AS`
 * on the widget carrying that on-state. Writing only `/V` leaves pdf.js
 * reporting an empty value, which would make these fixtures silently useless.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { PDFDict, PDFDocument, PDFName, PDFTextField } from "pdf-lib";
import { readPdf, type PdfReadResult } from "../pdf";

export interface FillSpec {
  /** Text fields, by exact AcroForm name. */
  text?: Record<string, string>;
  /** Button fields, by name, to the export value of the option to select. */
  buttons?: Record<string, string>;
}

export async function fillForm(path: string, spec: FillSpec): Promise<PdfReadResult> {
  const doc = await PDFDocument.load(await readFile(path), { ignoreEncryption: true });
  const form = doc.getForm();

  for (const [name, value] of Object.entries(spec.text ?? {})) {
    const f = form.getField(name);
    if (!(f instanceof PDFTextField)) {
      throw new Error(`${name} is not a text field on ${path}`);
    }
    f.setText(value);
  }

  for (const [name, on] of Object.entries(spec.buttons ?? {})) {
    const acro = form.getField(name).acroField;
    acro.dict.set(PDFName.of("V"), PDFName.of(on));
    for (const widget of acro.getWidgets()) {
      const normal = widget.dict
        .lookup(PDFName.of("AP"), PDFDict)
        ?.lookup(PDFName.of("N"), PDFDict);
      const carriesState = normal?.keys().some((k) => String(k) === `/${on}`) ?? false;
      widget.dict.set(PDFName.of("AS"), PDFName.of(carriesState ? on : "Off"));
    }
  }

  const bytes = await doc.save({ updateFieldAppearances: false });
  return readPdf(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  );
}

/**
 * The blank firm forms these tests read live in /public and are NOT in git:
 * .gitignore excludes `*.pdf` wholesale as a guard against client documents
 * being committed by accident. They carry no client data and the running app
 * needs them — /form-NAAF.pdf and /form-KYC.pdf are fetched at runtime as OCR
 * templates — but whether to carve out an exception is the firm's call, not
 * this test file's.
 *
 * So the suites that depend on them skip, loudly, rather than fail, when a
 * checkout does not have them.
 */
export const NAAF_PATH = "public/form-NAAF.pdf";
export const KYC_PATH = "public/form-KYC.pdf";
export const CRQ_INDIVIDUAL_PATH = "public/crq-individualaccountholder.pdf";
export const CRQ_JOINT_PATH = "public/crq-jointaccountholders.pdf";
export const CRQ_CORPORATE_PATH = "public/crq-corporateaccounts.pdf";


/** True when every blank form these tests need is present in this checkout. */
export const blankFormsPresent = (): boolean =>
  [NAAF_PATH, KYC_PATH, CRQ_INDIVIDUAL_PATH, CRQ_JOINT_PATH, CRQ_CORPORATE_PATH].every(
    (p) => existsSync(p)
  );

export const MISSING_FORMS_NOTE =
  "Blank firm forms are absent from /public (they are gitignored) — the real-form suites are skipped. See formFixtures.ts.";
