import { describe, it, expect } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { parsePdfBytes, textItemsToMatrix } from "../parsePdf";
import { detectSource } from "../detectSource";

/** Build a text-based PDF containing a simple Winfund-style table. */
async function makeTablePdf(rows: string[][]): Promise<ArrayBuffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([612, 792]);
  const cols = [50, 170, 290, 400, 500];
  let y = 700;
  for (const row of rows) {
    row.forEach((cell, i) => page.drawText(cell, { x: cols[i], y, size: 10, font }));
    y -= 20;
  }
  const bytes = await pdf.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

describe("textItemsToMatrix", () => {
  it("clusters positioned text into rows and columns", () => {
    const m = textItemsToMatrix([
      { str: "Amount", x: 300, y: 700 },
      { str: "Plan ID", x: 150, y: 700 },
      { str: "5000.00", x: 300, y: 680 },
      { str: "P500", x: 150, y: 680 },
    ]);
    expect(m).toEqual([
      ["Plan ID", "Amount"],
      ["P500", "5000.00"],
    ]);
  });

  it("returns nothing for an empty text layer", () => {
    expect(textItemsToMatrix([])).toEqual([]);
  });
});

describe("parsePdfBytes", () => {
  it("reconstructs a table from a real text-based PDF", async () => {
    const ab = await makeTablePdf([
      ["Wire Order #", "Fund #", "Plan ID", "Amount", "Bank Code"],
      ["O1001", "123", "P500", "5000.00", "001"],
      ["O1003", "123", "P510", "4950.00", "001"],
    ]);
    const res = await parsePdfBytes(ab);

    expect(res.kind).toBe("pdf");
    expect(res.warnings).toEqual([]);
    const sheet = res.sheets[0];
    expect(sheet.headers).toEqual(["Wire Order #", "Fund #", "Plan ID", "Amount", "Bank Code"]);
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.rows[0].cells["Plan ID"]).toBe("P500");
    expect(sheet.rows[0].cells["Amount"]).toBe("5000.00");
    expect(sheet.rows[1].cells["Amount"]).toBe("4950.00");
  });

  it("the extracted PDF table is recognised as Winfund data", async () => {
    const ab = await makeTablePdf([
      ["Wire Order #", "Fund #", "Plan ID", "Amount", "Bank Code"],
      ["O1001", "123", "P500", "5000.00", "001"],
    ]);
    const res = await parsePdfBytes(ab);
    expect(detectSource(res.sheets[0].headers).source).toBe("winfund");
  });

  it("reports a clear message for a PDF with no text layer", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([612, 792]); // blank page, no text
    const bytes = await pdf.save();
    const res = await parsePdfBytes(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    );
    expect(res.sheets).toHaveLength(0);
    expect(res.warnings[0]).toMatch(/no selectable text|scan/i);
  });
});
