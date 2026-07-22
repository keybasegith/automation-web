import { describe, it, expect } from "vitest";
import { validateFile } from "../validation";

describe("file acceptance", () => {
  it("accepts PDF, Excel, CSV and image screenshots", () => {
    for (const name of ["a.pdf", "a.xlsx", "a.xls", "a.csv", "a.png", "a.jpg", "a.jpeg"]) {
      expect(validateFile({ name, size: 1000 }).ok).toBe(true);
    }
  });
  it("rejects Word, archives and plain text with a helpful message", () => {
    for (const name of ["a.docx", "a.doc", "a.zip", "a.txt", "a.heic"]) {
      const r = validateFile({ name, size: 1000 });
      expect(r.ok).toBe(false);
      expect(r.error).toBeTruthy();
    }
  });
  it("does not reject an accepted extension based on MIME type", () => {
    // Browsers often send text/plain for .csv or octet-stream for .xls.
    expect(validateFile({ name: "report.csv", size: 10, mimeType: "text/plain" }).ok).toBe(true);
    expect(validateFile({ name: "shot.png", size: 10, mimeType: "image/png" }).ok).toBe(true);
  });
  it("rejects empty and oversized files", () => {
    expect(validateFile({ name: "a.pdf", size: 0 }).ok).toBe(false);
    expect(validateFile({ name: "a.pdf", size: 999_000_000 }).ok).toBe(false);
  });
});
