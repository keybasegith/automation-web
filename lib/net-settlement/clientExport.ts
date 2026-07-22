/**
 * Local (browser) export generation. Nothing is uploaded.
 *   - Reconciliation Excel workbook (SheetJS/xlsx)
 *   - Required Adjustments CSV
 *   - PDF summary (pdf-lib)
 */

import * as XLSX from "xlsx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { FundservRecord, WinfundRecord, MatchResult, DetectedDetails } from "./types";
import { categoryOf, type ReconciliationSummary } from "./summary";
import { recommendForMatch } from "./recommendation";
import { formatMoney } from "./money";

export interface ExportMeta {
  fundservFileName: string;
  winfundFileName: string;
  details: DetectedDetails;
  generatedAt: string; // ISO
}

export interface ExportData {
  fundserv: FundservRecord[];
  winfund: WinfundRecord[];
  matches: MatchResult[];
  summary: ReconciliationSummary;
}

const dollars = (cents: number | null) => (cents === null ? null : cents / 100);

function fMap(data: ExportData) {
  return new Map(data.fundserv.map((r) => [r.id, r]));
}
function wMap(data: ExportData) {
  return new Map(data.winfund.map((r) => [r.id, r]));
}

function adjustmentRows(data: ExportData) {
  return data.matches
    .filter((m) => categoryOf(m.status) !== "exact")
    .map((m) => {
      const r = recommendForMatch(m, data.fundserv, data.winfund);
      return {
        Type: m.status.replace(/_/g, " "),
        Plan: r.plan ?? "",
        Fund: r.fund ?? "",
        Client: r.client ?? "",
        "Fundserv Amount": dollars(r.fundservAmountCents),
        "Winfund Amount": dollars(r.winfundAmountCents),
        Difference: dollars(m.amountDifferenceCents),
        "Required Action": r.action,
        "Required Adjustment": r.adjustment ?? "",
      };
    });
}

function matchRows(data: ExportData, cat: string) {
  const fm = fMap(data);
  const wm = wMap(data);
  return data.matches
    .filter((m) => categoryOf(m.status) === cat)
    .map((m) => {
      const f = m.fundservIds.map((id) => fm.get(id)).filter(Boolean) as FundservRecord[];
      const w = m.winfundIds.map((id) => wm.get(id)).filter(Boolean) as WinfundRecord[];
      return {
        Status: m.status.replace(/_/g, " "),
        Confidence: m.confidence,
        Plan: f[0]?.dealerAccountId ?? w[0]?.planId ?? "",
        Fund: f[0]?.fundId ?? w[0]?.fundNumber ?? "",
        "Fundserv Amount": dollars(f.reduce((a, r) => a + (r.settlementAmountCents ?? 0), 0)),
        "Winfund Amount": dollars(w.reduce((a, r) => a + (r.amountCents ?? 0), 0)),
        Difference: dollars(m.amountDifferenceCents),
        Reference: f[0]?.rawReference ?? w[0]?.wireOrderNumber ?? "",
      };
    });
}

export function buildWorkbook(meta: ExportMeta, data: ExportData): Uint8Array {
  const wb = XLSX.utils.book_new();
  const d = meta.details;

  const summaryRows = [
    ["Fundserv file", meta.fundservFileName],
    ["Winfund file", meta.winfundFileName],
    ["Settlement date", d.settlementDate ?? ""],
    ["Dealer", d.dealer ?? ""],
    ["Currency", d.currency ?? ""],
    ["Cycle", d.cycle ?? ""],
    ["Generated", meta.generatedAt],
    [],
    ["Fundserv records", data.summary.fundservCount],
    ["Winfund records", data.summary.winfundCount],
    ["Fundserv total", dollars(data.summary.fundservTotalCents)],
    ["Winfund total", dollars(data.summary.winfundTotalCents)],
    ["Total difference", dollars(data.summary.differenceCents)],
    ["Exact matches", data.summary.exactMatches + data.summary.aggregateMatches],
    ["Possible matches", data.summary.probableMatches],
    ["Discrepancies", data.summary.exceptions - data.summary.probableMatches],
  ];
  const add = (name: string, rows: Record<string, unknown>[] | unknown[][]) => {
    const ws = Array.isArray(rows[0])
      ? XLSX.utils.aoa_to_sheet(rows as unknown[][])
      : XLSX.utils.json_to_sheet(rows as Record<string, unknown>[]);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  };

  add("Summary", summaryRows);
  add("Required Adjustments", adjustmentRows(data));
  add("Exact Matches", matchRows(data, "exact"));
  add("Possible Matches", matchRows(data, "possible"));
  add("Discrepancies", matchRows(data, "discrepancy"));
  add("Fundserv Only", matchRows(data, "fundserv_only"));
  add("Winfund Only", matchRows(data, "winfund_only"));
  add("Raw Fundserv Data", data.fundserv.map((r) => r.raw));
  add("Raw Winfund Data", data.winfund.map((r) => r.raw));

  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
}

export function buildAdjustmentsCsv(data: ExportData): string {
  const ws = XLSX.utils.json_to_sheet(adjustmentRows(data));
  return XLSX.utils.sheet_to_csv(ws);
}

export async function buildPdfSummary(meta: ExportMeta, data: ExportData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]); // A4
  const left = 48;
  let y = 800;
  const line = (text: string, size = 11, f = font, color = rgb(0.1, 0.12, 0.15)) => {
    if (y < 60) {
      page = pdf.addPage([595, 842]);
      y = 800;
    }
    page.drawText(text, { x: left, y, size, font: f, color });
    y -= size + 6;
  };

  line("Net Settlement Reconciliation Summary", 18, bold);
  y -= 4;
  const d = meta.details;
  line(`Fundserv file: ${meta.fundservFileName}`);
  line(`Winfund file:  ${meta.winfundFileName}`);
  line(
    `Settlement date: ${d.settlementDate ?? "—"}    Dealer: ${d.dealer ?? "—"}    Currency: ${d.currency ?? "—"}    Cycle: ${d.cycle ?? "—"}`
  );
  line(`Generated: ${meta.generatedAt}`);
  y -= 8;

  line("Totals", 13, bold);
  line(`Fundserv total: ${formatMoney(data.summary.fundservTotalCents)}`);
  line(`Winfund total:  ${formatMoney(data.summary.winfundTotalCents)}`);
  const diff = data.summary.differenceCents;
  line(
    `Total difference: ${formatMoney(diff)}`,
    11,
    bold,
    diff === 0 ? rgb(0.05, 0.5, 0.3) : rgb(0.8, 0.1, 0.15)
  );
  line(
    `Fundserv records: ${data.summary.fundservCount}    Winfund records: ${data.summary.winfundCount}    Discrepancies: ${data.summary.exceptions - data.summary.probableMatches}`
  );
  y -= 8;

  line("Required Adjustments", 13, bold);
  const adj = adjustmentRows(data);
  if (adj.length === 0) line("None — all transactions reconciled.");
  for (const a of adj) {
    const ctx = [a.Plan && `Plan ${a.Plan}`, a.Fund && `Fund ${a.Fund}`, a.Client]
      .filter(Boolean)
      .join(" · ");
    line(`• ${a.Type}${ctx ? " — " + ctx : ""}`, 11, bold);
    line(`   Required action: ${a["Required Action"]}`, 10);
    if (a["Required Adjustment"]) line(`   Required adjustment: ${a["Required Adjustment"]}`, 10);
  }
  y -= 10;
  line(
    "Confirmation: figures are derived from the provided files and require operator review before settlement.",
    9,
    font,
    rgb(0.4, 0.42, 0.45)
  );

  return pdf.save();
}
