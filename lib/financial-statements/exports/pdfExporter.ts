/**
 * PDF export.
 *
 * Like the Excel exporter, this renders an already-generated statement result —
 * it never aggregates or re-totals. The two exporters read the same object, so
 * the PDF, the workbook and the screen cannot disagree.
 *
 * Built with pdf-lib and the standard Helvetica faces, so there is no headless
 * browser, no HTML-to-PDF service and nothing leaves the machine.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { FinancialException, GeneratedStatement, MappedEntry, StatementNode } from "../types";
import { centsToNumber, formatCents } from "../money";
import { SCOPE_LABELS, type ExportInput, type ExportScope } from "./types";

const LETTER_PORTRAIT: [number, number] = [612, 792];
const LETTER_LANDSCAPE: [number, number] = [792, 612];

const MARGIN = 54;
const BODY_SIZE = 9;
// Tight enough that a statement of this size lands on one page — orphaning
// "Net Income" onto a second page makes a statement harder to read, not easier.
const LINE_HEIGHT = 11.6;

const INK = rgb(0.1, 0.12, 0.15);
const MUTED = rgb(0.42, 0.45, 0.5);
const RULE = rgb(0.25, 0.28, 0.33);

/**
 * The standard PDF fonts are WinAnsi-encoded and throw on anything outside it.
 * Exception text can carry an arrow or a dash from elsewhere in the app, so
 * everything is folded to characters the font can actually draw.
 */
function toWinAnsi(text: string): string {
  return text
    .replace(/[→⇒]/g, "->")
    .replace(/[–—]/g, "-")
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/›/g, ">")
    .replace(/•/g, "-")
    .replace(/ /g, " ")
    // Anything still outside Latin-1 becomes a question mark rather than an error.
    .replace(/[^\x00-\xFF]/g, "?");
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

/** A cursor that lays rows down a page and starts a new one when it runs out. */
class Sheet {
  private page: PDFPage;
  private y: number;
  readonly pages: PDFPage[] = [];

  // Fields are assigned explicitly rather than declared as constructor
  // parameter properties: this repo runs TypeScript through Node's strip-only
  // loader in scripts/register-ts.mjs, which cannot compile that syntax.
  private readonly doc: PDFDocument;
  private readonly fonts: Fonts;
  private readonly size: [number, number];
  private readonly header: (page: PDFPage, continued: boolean) => number;

  constructor(
    doc: PDFDocument,
    fonts: Fonts,
    size: [number, number],
    header: (page: PDFPage, continued: boolean) => number
  ) {
    this.doc = doc;
    this.fonts = fonts;
    this.size = size;
    this.header = header;

    this.page = doc.addPage(size);
    this.pages.push(this.page);
    this.y = this.header(this.page, false);
  }

  get width() {
    return this.size[0];
  }

  get current() {
    return this.page;
  }

  /** Reserve vertical space, breaking to a new page when needed. */
  reserve(height: number): PDFPage {
    if (this.y - height < MARGIN + 16) {
      this.page = this.doc.addPage(this.size);
      this.pages.push(this.page);
      this.y = this.header(this.page, true);
    }
    this.y -= height;
    return this.page;
  }

  get cursor() {
    return this.y;
  }

  gap(height: number) {
    this.y -= height;
  }

  text(value: string, x: number, options: { bold?: boolean; size?: number; color?: typeof INK } = {}) {
    this.page.drawText(toWinAnsi(value), {
      x,
      y: this.y,
      size: options.size ?? BODY_SIZE,
      font: options.bold ? this.fonts.bold : this.fonts.regular,
      color: options.color ?? INK,
    });
  }

  right(value: string, rightEdge: number, options: { bold?: boolean; size?: number } = {}) {
    const size = options.size ?? BODY_SIZE;
    const font = options.bold ? this.fonts.bold : this.fonts.regular;
    const safe = toWinAnsi(value);
    const width = font.widthOfTextAtSize(safe, size);
    this.page.drawText(safe, { x: rightEdge - width, y: this.y, size, font, color: INK });
  }

  line(x1: number, x2: number, offset: number, thickness = 0.75) {
    this.page.drawLine({
      start: { x: x1, y: this.y + offset },
      end: { x: x2, y: this.y + offset },
      thickness,
      color: RULE,
    });
  }

  finish(footer: (page: PDFPage, index: number, total: number) => void) {
    this.pages.forEach((page, index) => footer(page, index + 1, this.pages.length));
  }
}

function statementHeader(
  statement: GeneratedStatement,
  fonts: Fonts
): (page: PDFPage, continued: boolean) => number {
  return (page, continued) => {
    let y = LETTER_PORTRAIT[1] - MARGIN;

    page.drawText(toWinAnsi(statement.entityName), {
      x: MARGIN, y, size: 13, font: fonts.bold, color: INK,
    });
    y -= 17;
    page.drawText(toWinAnsi(`${statement.title}${continued ? " (continued)" : ""}`), {
      x: MARGIN, y, size: 11, font: fonts.bold, color: INK,
    });
    y -= 14;
    page.drawText(toWinAnsi(statement.periodLabel), {
      x: MARGIN, y, size: 10, font: fonts.regular, color: MUTED,
    });
    y -= 10;
    page.drawLine({
      start: { x: MARGIN, y }, end: { x: LETTER_PORTRAIT[0] - MARGIN, y },
      thickness: 1, color: RULE,
    });
    return y - 18;
  };
}

/** Amounts read as accounting figures: negatives in parentheses. */
const amountText = (node: StatementNode): string => {
  if (node.amountCents === null) return "";
  return formatCents(node.amountCents, {
    parentheses: true,
    currency: node.kind === "total",
  });
};

function drawStatement(doc: PDFDocument, fonts: Fonts, statement: GeneratedStatement) {
  const rightEdge = LETTER_PORTRAIT[0] - MARGIN;
  const sheet = new Sheet(doc, fonts, LETTER_PORTRAIT, statementHeader(statement, fonts));

  for (const node of statement.nodes) {
    if (node.kind === "spacer") {
      sheet.gap(4.5);
      continue;
    }

    sheet.reserve(LINE_HEIGHT);

    const bold = node.kind === "heading" || node.kind === "total" || node.emphasis === "bold";
    const x = MARGIN + node.indent * 14;
    sheet.text(node.label, x, { bold });

    if (node.amountCents !== null) {
      // Rules sit above the figure they close, as on a prepared statement.
      if (node.emphasis === "underline" || node.emphasis === "double-underline") {
        sheet.line(rightEdge - 92, rightEdge, LINE_HEIGHT - 3.5);
      }
      sheet.right(amountText(node), rightEdge, { bold });
      if (node.emphasis === "double-underline") {
        sheet.line(rightEdge - 92, rightEdge, -3.5);
        sheet.line(rightEdge - 92, rightEdge, -5.5);
      }
    }
  }

  return sheet;
}

function drawTrialBalance(doc: PDFDocument, fonts: Fonts, input: ExportInput) {
  const width = LETTER_LANDSCAPE[0];
  const rightEdge = width - MARGIN;

  const columns = { account: MARGIN, description: MARGIN + 92, debit: MARGIN + 380, credit: MARGIN + 462, status: MARGIN + 500, line: MARGIN + 570 };

  const header = (page: PDFPage, continued: boolean) => {
    let y = LETTER_LANDSCAPE[1] - MARGIN;
    page.drawText(toWinAnsi(`${input.entityName} - Normalized Trial Balance${continued ? " (continued)" : ""}`), {
      x: MARGIN, y, size: 12, font: fonts.bold, color: INK,
    });
    y -= 14;
    page.drawText(toWinAnsi(`${input.periodLabel} - ${input.entries.length} accounts`), {
      x: MARGIN, y, size: 9, font: fonts.regular, color: MUTED,
    });
    y -= 16;
    for (const [label, x] of [
      ["Account", columns.account], ["Description", columns.description],
      ["Status", columns.status], ["Statement line", columns.line],
    ] as const) {
      page.drawText(label, { x, y, size: 8, font: fonts.bold, color: MUTED });
    }
    for (const [label, x] of [["Debit", columns.debit + 62], ["Credit", columns.credit + 62]] as const) {
      const w = fonts.bold.widthOfTextAtSize(label, 8);
      page.drawText(label, { x: x - w, y, size: 8, font: fonts.bold, color: MUTED });
    }
    y -= 5;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: rightEdge, y }, thickness: 0.75, color: RULE });
    return y - 12;
  };

  const sheet = new Sheet(doc, fonts, LETTER_LANDSCAPE, header);
  const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}...` : text);

  let debits = 0n;
  let credits = 0n;

  for (const entry of input.entries) {
    debits += entry.row.debitCents;
    credits += entry.row.creditCents;

    sheet.reserve(11);
    sheet.text(entry.row.account.normalizedFullCode, columns.account, { size: 7.5 });
    sheet.text(clip(entry.row.description, 46), columns.description, { size: 7.5 });
    sheet.right(formatCents(entry.row.debitCents, { parentheses: true }), columns.debit + 62, { size: 7.5 });
    sheet.right(formatCents(entry.row.creditCents, { parentheses: true }), columns.credit + 62, { size: 7.5 });
    sheet.text(entry.outcome, columns.status, { size: 7.5 });
    sheet.text(
      clip(entry.rule?.excluded ? "Excluded" : (entry.rule?.statementLine ?? "-"), 30),
      columns.line,
      { size: 7.5 }
    );
  }

  sheet.reserve(16);
  sheet.line(MARGIN, rightEdge, 11);
  sheet.text("Total", columns.account, { bold: true, size: 8 });
  sheet.right(formatCents(debits, { parentheses: true }), columns.debit + 62, { bold: true, size: 8 });
  sheet.right(formatCents(credits, { parentheses: true }), columns.credit + 62, { bold: true, size: 8 });
  sheet.text(
    debits === credits ? "in balance" : `out by ${formatCents(debits - credits, { parentheses: true })}`,
    columns.status,
    { bold: true, size: 8 }
  );

  return sheet;
}

function drawExceptions(doc: PDFDocument, fonts: Fonts, input: ExportInput) {
  const rightEdge = LETTER_PORTRAIT[0] - MARGIN;

  const header = (page: PDFPage, continued: boolean) => {
    let y = LETTER_PORTRAIT[1] - MARGIN;
    page.drawText(toWinAnsi(`${input.entityName} - Exceptions & Reconciliation${continued ? " (continued)" : ""}`), {
      x: MARGIN, y, size: 12, font: fonts.bold, color: INK,
    });
    y -= 14;
    page.drawText(toWinAnsi(input.periodLabel), { x: MARGIN, y, size: 9, font: fonts.regular, color: MUTED });
    y -= 8;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: rightEdge, y }, thickness: 1, color: RULE });
    return y - 18;
  };

  const sheet = new Sheet(doc, fonts, LETTER_PORTRAIT, header);
  const order = { blocking: 0, warning: 1, info: 2 } as const;
  const sorted: FinancialException[] = [...input.exceptions].sort(
    (a, b) => order[a.severity] - order[b.severity]
  );

  if (sorted.length === 0) {
    sheet.reserve(LINE_HEIGHT);
    sheet.text("No exceptions were raised.", MARGIN);
  }

  for (const exception of sorted) {
    sheet.reserve(LINE_HEIGHT);
    sheet.text(`[${exception.severity}] ${exception.title}`, MARGIN, { bold: true });
    if (exception.amountCents !== null) {
      sheet.right(formatCents(exception.amountCents, { parentheses: true }), rightEdge);
    }

    for (const chunk of wrap(exception.detail, 108)) {
      sheet.reserve(11);
      sheet.text(chunk, MARGIN + 10, { size: 8, color: MUTED });
    }
    sheet.gap(5);
  }

  // Reconciliation summary — where every dollar of the Trial Balance ended up.
  sheet.gap(10);
  sheet.reserve(LINE_HEIGHT);
  sheet.text("Reconciliation", MARGIN, { bold: true, size: 11 });

  const r = input.reconciliation;
  const rows: [string, string][] = [
    ["Trial Balance rows", String(r.rowCount)],
    ["Mapped to Balance Sheet", formatCents(r.balanceSheetCents, { parentheses: true })],
    ["Mapped to Income Statement", formatCents(r.incomeStatementCents, { parentheses: true })],
    ["Approved exclusions", formatCents(r.excludedCents, { parentheses: true })],
    ["Unmapped", formatCents(r.unmappedCents, { parentheses: true })],
    ["Ambiguous", formatCents(r.ambiguousCents, { parentheses: true })],
    ["Accounted for (net)", formatCents(r.accountedCents, { parentheses: true })],
    ["Trial Balance net", formatCents(r.trialBalanceNetCents, { parentheses: true })],
  ];
  for (const [label, value] of rows) {
    sheet.reserve(LINE_HEIGHT);
    sheet.text(label, MARGIN + 10);
    sheet.right(value, rightEdge);
  }

  return sheet;
}

function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > max) {
      if (line) lines.push(line.trim());
      line = word;
    } else {
      line = `${line} ${word}`;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

export async function buildStatementPdf(
  input: ExportInput,
  scope: ExportScope = "package"
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${input.entityName} - ${SCOPE_LABELS[scope]} - ${input.periodLabel}`);
  doc.setCreator("Keybase Financial Statement Generator");
  doc.setProducer("Keybase Financial Statement Generator");

  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const include = (which: ExportScope) => scope === "package" || scope === which;
  const sheets: Sheet[] = [];

  if (include("balance_sheet")) sheets.push(drawStatement(doc, fonts, input.balanceSheet));
  if (include("income_statement")) sheets.push(drawStatement(doc, fonts, input.incomeStatement));
  if (include("trial_balance")) sheets.push(drawTrialBalance(doc, fonts, input));
  if (include("exceptions")) sheets.push(drawExceptions(doc, fonts, input));

  if (sheets.length === 0) throw new Error(`Nothing to export for scope "${scope}".`);

  // Footer on every page: what produced it, from what, and when.
  const generated = new Date(input.generatedAt);
  const stamp = Number.isNaN(generated.getTime()) ? input.generatedAt : generated.toISOString().slice(0, 10);
  const pages = doc.getPages();
  pages.forEach((page, index) => {
    const { width } = page.getSize();
    const left = toWinAnsi(`Generated ${stamp} from ${input.sourceFileName}`);
    page.drawText(left, { x: MARGIN, y: MARGIN - 18, size: 7, font: fonts.regular, color: MUTED });
    const right = `Page ${index + 1} of ${pages.length}`;
    const w = fonts.regular.widthOfTextAtSize(right, 7);
    page.drawText(right, { x: width - MARGIN - w, y: MARGIN - 18, size: 7, font: fonts.regular, color: MUTED });
  });

  return Buffer.from(await doc.save());
}

/** Exposed so a test can assert the PDF carries the same figures as the model. */
export const pdfAmountText = amountText;
export const pdfNumeric = (node: StatementNode): number | null =>
  node.amountCents === null ? null : centsToNumber(node.amountCents);

export type { MappedEntry };
