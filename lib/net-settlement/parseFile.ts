/**
 * Single entry point for file intake. Any file may be submitted: PDFs go
 * through the pdf.js text-layer extractor, everything else through the
 * synchronous sniffing parser. All of it runs in the browser.
 */

import { parseSettlementBytes, type ParsedFile } from "./parse";
import { parsePdfBytes } from "./parsePdf";

const isPdfBytes = (b: Uint8Array) =>
  b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46; // "%PDF"

export async function parseAnyFile(data: ArrayBuffer, filename: string): Promise<ParsedFile> {
  const bytes = new Uint8Array(data);
  if (isPdfBytes(bytes) || /\.pdf$/i.test(filename)) {
    return parsePdfBytes(data);
  }
  return parseSettlementBytes(data, filename);
}
