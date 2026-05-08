import { parseNaafText } from "@/lib/forms/parseNaafText";
import type { ExtractedNAAFData, NaafFields } from "@/lib/forms/types";
import { emptyNaafFields } from "@/lib/forms/sampleNaafData";

/**
 * OCR / text-extraction abstraction.
 *
 * IMPORTANT — CYBERSECURITY APPROVAL REQUIRED:
 * Before connecting any external OCR provider (Google Cloud Vision,
 * AWS Textract, Azure Document Intelligence, internal OCR), an information
 * security review must approve:
 *   • where the document bytes travel,
 *   • where any extracted text is stored or logged,
 *   • the data-residency posture (Canadian wealth-management data must remain
 *     in approved jurisdictions),
 *   • PII redaction rules in the response.
 *
 * Until that approval is granted this file deliberately does NOT call any
 * external API. It supports two paths:
 *   1. text/* uploads — parsed directly with parseNaafText.
 *   2. application/pdf or image/* uploads — returned with empty fields and a
 *      clear warning so the advisor knows to switch to demo/sample mode or
 *      input fields manually.
 */

export type OcrProvider = "none" | "demo_inline_text" | "todo_external";

export interface ExtractTextResult {
  rawText: string;
  confidence: number;
  warnings: string[];
  extractedFields: NaafFields;
  extractionConfidence: number;
  fieldConfidenceMap: ExtractedNAAFData["fieldConfidenceMap"];
  fieldSourceMap: ExtractedNAAFData["fieldSourceMap"];
  provider: OcrProvider;
}

export interface ExtractTextInput {
  fileBuffer: ArrayBuffer | Buffer;
  fileName: string;
  fileType: string;
}

const TEXT_TYPES = ["text/plain", "text/markdown", "text/csv"];

export async function extractTextFromDocument(
  input: ExtractTextInput
): Promise<ExtractTextResult> {
  const fileType = (input.fileType ?? "").toLowerCase();
  const buffer = Buffer.isBuffer(input.fileBuffer)
    ? input.fileBuffer
    : Buffer.from(new Uint8Array(input.fileBuffer as ArrayBuffer));

  // Path 1: plain text uploads — these are useful for testing the full
  // pipeline without any external OCR dependency.
  if (TEXT_TYPES.some((t) => fileType.startsWith(t))) {
    const rawText = buffer.toString("utf-8");
    const parsed = parseNaafText(rawText);
    return {
      rawText,
      confidence: parsed.data.extractionConfidence,
      warnings: parsed.data.extractionWarnings,
      extractedFields: parsed.data.fields,
      extractionConfidence: parsed.data.extractionConfidence,
      fieldConfidenceMap: parsed.data.fieldConfidenceMap,
      fieldSourceMap: parsed.data.fieldSourceMap,
      provider: "demo_inline_text",
    };
  }

  // Path 2: PDFs and images — no OCR provider wired yet.
  // TODO: Replace with an approved provider such as:
  //   - Google Cloud Vision (DOCUMENT_TEXT_DETECTION)
  //   - AWS Textract (AnalyzeDocument with FORMS feature)
  //   - Azure Document Intelligence (Layout / Custom models)
  //   - An approved internal OCR microservice
  // The provider call should NOT pass the document bytes to a generic chat-LLM
  // — only to a dedicated OCR endpoint approved for client data residency.
  const warnings = [
    `Automatic text extraction for ${fileType || "this file type"} is not yet enabled. ` +
      "Use the 'Load sample NAAF' option, upload a plain-text NAAF, or fill the fields manually.",
  ];
  const fields = emptyNaafFields();
  const fieldSourceMap = Object.fromEntries(
    Object.keys(fields).map((k) => [k, "missing"])
  ) as ExtractedNAAFData["fieldSourceMap"];

  return {
    rawText: "",
    confidence: 0,
    warnings,
    extractedFields: fields,
    extractionConfidence: 0,
    fieldConfidenceMap: {},
    fieldSourceMap,
    provider: "todo_external",
  };
}
