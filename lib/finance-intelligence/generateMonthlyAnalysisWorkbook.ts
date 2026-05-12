import ExcelJS from "exceljs";
import type { MonthlyAnalysisResult } from "./types";

const ACCOUNTING_FORMAT =
  '_-* #,##0.00_-;[Red]_-* (#,##0.00)_-;_-* "-"??_-;_-@_-';

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFF2A8" },
};

const COLUMN_HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF1F5F9" },
};

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF94A3B8" } },
  left: { style: "thin", color: { argb: "FF94A3B8" } },
  bottom: { style: "thin", color: { argb: "FF94A3B8" } },
  right: { style: "thin", color: { argb: "FF94A3B8" } },
};

export async function generateMonthlyAnalysisWorkbook(
  result: MonthlyAnalysisResult
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Keybase Finance Intelligence";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Monthly Analysis", {
    properties: { defaultRowHeight: 18 },
  });

  sheet.columns = [
    { key: "date", width: 18 },
    { key: "description", width: 70 },
    { key: "amount", width: 22, style: { numFmt: ACCOUNTING_FORMAT } },
  ];

  // Row 1 — top header: A=Account#, B=Account Name (centered), C=As at date.
  // Mirrors the standard monthly analysis layout from the sample.
  const header = sheet.addRow([
    result.accountNumberRaw,
    result.accountName,
    `As at ${result.asAtDate}`,
  ]);
  header.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = { bold: true, size: 12 };
    cell.alignment = { vertical: "middle" };
    cell.border = BORDER_THIN;
  });
  sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };
  sheet.getCell("B1").alignment = { vertical: "middle", horizontal: "center" };
  sheet.getCell("C1").alignment = { vertical: "middle", horizontal: "center" };
  header.height = 22;

  sheet.addRow([]);

  // Column header row
  const colHeader = sheet.addRow(["Date", "Description", "Amount"]);
  colHeader.eachCell((cell) => {
    cell.fill = COLUMN_HEADER_FILL;
    cell.font = { bold: true };
    cell.border = BORDER_THIN;
    cell.alignment = { vertical: "middle" };
  });
  sheet.getCell(`C${colHeader.number}`).alignment = {
    vertical: "middle",
    horizontal: "right",
  };

  // Opening balance row — label in description column to match sample layout
  const openingRow = sheet.addRow(["", "Opening Balance:", result.openingBalance]);
  openingRow.font = { bold: true };
  openingRow.getCell(3).numFmt = ACCOUNTING_FORMAT;
  openingRow.getCell(3).alignment = { horizontal: "right" };

  sheet.addRow([]);

  // Movement lines, grouped by month: show the date label only on the first
  // row of each month, leave it blank for subsequent rows, and insert a blank
  // row between month groups.
  let previousLabel: string | null = null;
  for (let idx = 0; idx < result.lines.length; idx += 1) {
    const line = result.lines[idx];
    const showLabel = line.dateLabel !== previousLabel;
    if (showLabel && previousLabel !== null) {
      sheet.addRow([]);
    }
    const row = sheet.addRow([
      showLabel ? line.dateLabel : "",
      line.description,
      line.amount,
    ]);
    row.getCell(3).numFmt = ACCOUNTING_FORMAT;
    row.getCell(3).alignment = { horizontal: "right" };
    row.getCell(2).alignment = { wrapText: true };
    previousLabel = line.dateLabel;
  }

  sheet.addRow([]);

  // Ending balance row
  const endingRow = sheet.addRow([
    `Ending Balance as at ${result.asAtDate}`,
    "",
    result.generatedEndingBalance,
  ]);
  endingRow.font = { bold: true };
  const endingAmountCell = endingRow.getCell(3);
  endingAmountCell.numFmt = ACCOUNTING_FORMAT;
  endingAmountCell.alignment = { horizontal: "right" };
  endingAmountCell.border = {
    top: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "double", color: { argb: "FF000000" } },
  };

  // Validation footer (only as a soft annotation)
  sheet.addRow([]);
  const statusLabel =
    result.validationStatus === "matched"
      ? "Validation: Matched"
      : result.validationStatus === "review_required"
        ? "Validation: Review Required"
        : "Validation: Missing Sage Ending Balance";
  const statusRow = sheet.addRow([statusLabel, "", ""]);
  statusRow.font = {
    italic: true,
    color: {
      argb:
        result.validationStatus === "matched"
          ? "FF047857"
          : result.validationStatus === "review_required"
            ? "FFB45309"
            : "FF64748B",
    },
  };
  if (result.sageEndingBalance !== undefined) {
    const sageRow = sheet.addRow([
      "Sage 300 Ending Balance",
      "",
      result.sageEndingBalance,
    ]);
    sageRow.getCell(3).numFmt = ACCOUNTING_FORMAT;
    sageRow.getCell(3).alignment = { horizontal: "right" };
    sageRow.font = { italic: true, color: { argb: "FF475569" } };

    if (result.difference !== undefined) {
      const diffRow = sheet.addRow([
        "Difference (Generated − Sage)",
        "",
        result.difference,
      ]);
      diffRow.getCell(3).numFmt = ACCOUNTING_FORMAT;
      diffRow.getCell(3).alignment = { horizontal: "right" };
      diffRow.font = { italic: true, color: { argb: "FF475569" } };
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer as ArrayBuffer);
}

export function buildDownloadFilename(result: MonthlyAnalysisResult): string {
  const period = result.fiscalPeriod.padStart(2, "0");
  return `monthly-analysis-${result.accountNumber}-${result.fiscalYear}-${period}.xlsx`;
}
