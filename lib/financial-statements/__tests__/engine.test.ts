/**
 * Engine behaviour on small, hand-built Trial Balances, where the right answer
 * is obvious by inspection.
 */

import { describe, expect, it } from "vitest";

import { generateStatements } from "../engine/generateStatements";
import { signedBalanceCents, presentCents } from "../engine/statementBuilder";
import type { MappingRule, StatementNode } from "../types";
import { row, rule, trialBalance } from "./helpers";

const RULES: MappingRule[] = [
  rule({ id: "cash", matchType: "BASE_GL_CODE", baseCode: "1000",
    statement: "balance_sheet", category: "Assets", section: "Current assets", statementLine: "Cash" }),
  rule({ id: "ap", matchType: "BASE_GL_CODE", baseCode: "3300",
    statement: "balance_sheet", category: "Liability and Shareholder Equity",
    section: "Current Liabilities", statementLine: "Accounts Payable & Accruals" }),
  rule({ id: "shares", matchType: "BASE_GL_CODE", baseCode: "4000",
    statement: "balance_sheet", category: "Liability and Shareholder Equity",
    section: "Shareholders Equity", statementLine: "Common Shares" }),
  rule({ id: "re", matchType: "BASE_GL_CODE", baseCode: "4400",
    statement: "balance_sheet", category: "Liability and Shareholder Equity",
    section: "Shareholders Equity", statementLine: "Retained Earnings, Beginning of Year" }),
  rule({ id: "rev", matchType: "BASE_GL_CODE", baseCode: "4500",
    statement: "income_statement", category: "Revenue", section: "Commission Income",
    statementLine: "Commission Revenue" }),
  rule({ id: "exp", matchType: "BASE_GL_CODE", baseCode: "5000",
    statement: "income_statement", category: "Revenue", section: "Commission Expense",
    statementLine: "Commission Expense" }),
];

const BALANCED = [
  row("1000-K", "Cash", 1000, 0, 1),
  row("3300-K", "Accounts Payable", 0, 300, 2),
  row("4000-K", "Common Shares", 0, 100, 3),
  row("4400-K", "Retained Earnings", 0, 400, 4),
  row("4500-K", "Revenue", 0, 500, 5),
  row("5000-K", "Expense", 300, 0, 6),
];

const build = (rows = BALANCED, rules = RULES) =>
  generateStatements({ parsed: trialBalance(rows), rules, periodLabel: "Test" });

const line = (nodes: readonly StatementNode[], label: string) =>
  nodes.find((n) => n.kind === "line" && n.label === label)?.amountCents ?? null;

describe("sign conventions", () => {
  it("stores one signed balance, debit positive", () => {
    expect(signedBalanceCents(100000n, 0n)).toBe(100000n);
    expect(signedBalanceCents(0n, 30000n)).toBe(-30000n);
    expect(signedBalanceCents(100n, 40n)).toBe(60n);
  });

  it("flips only at presentation, per the side the line sits on", () => {
    expect(presentCents(100000n, "debit")).toBe(100000n);
    expect(presentCents(-30000n, "credit")).toBe(30000n);
    expect(presentCents(100000n, "credit")).toBe(-100000n);
  });

  it("presents assets and expenses debit-positive, liabilities and revenue credit-positive", () => {
    const r = build();
    expect(line(r.balanceSheet.nodes, "Cash")).toBe(100000n);
    expect(line(r.balanceSheet.nodes, "Accounts Payable & Accruals")).toBe(30000n);
    expect(line(r.balanceSheet.nodes, "Common Shares")).toBe(10000n);
    expect(line(r.incomeStatement.nodes, "Commission Revenue")).toBe(50000n);
    expect(line(r.incomeStatement.nodes, "Commission Expense")).toBe(30000n);
  });

  it("does not decide debit or credit from the account's category", () => {
    // A liability carrying a debit balance stays a debit balance.
    const r = build([
      row("1000-K", "Cash", 700, 0, 1),
      row("3300-K", "Accounts Payable overpaid", 300, 0, 2),
      row("4000-K", "Common Shares", 0, 1000, 3),
    ]);
    expect(line(r.balanceSheet.nodes, "Accounts Payable & Accruals")).toBe(-30000n);
  });
});

describe("statement arithmetic", () => {
  it("computes net income as revenue less expenses", () => {
    expect(build().incomeStatement.totals.netIncomeCents).toBe(20000n);
  });

  it("feeds the Balance Sheet the Income Statement's net income verbatim", () => {
    const r = build();
    expect(r.balanceSheet.totals.currentPeriodEarningsCents).toBe(
      r.incomeStatement.totals.netIncomeCents
    );
    expect(line(r.balanceSheet.nodes, "Net Profit (Loss) for the period")).toBe(20000n);
  });

  it("carries retained earnings as opening balance plus the period's result", () => {
    const r = build();
    expect(r.balanceSheet.totals.retainedEarningsBeginningCents).toBe(40000n);
    expect(r.balanceSheet.totals.retainedEarningsTotalCents).toBe(60000n);
    expect(r.balanceSheet.totals.totalShareholdersEquityCents).toBe(70000n);
  });

  it("balances a balanced Trial Balance exactly", () => {
    const r = build();
    expect(r.balanceSheet.totals.totalAssetsCents).toBe(100000n);
    expect(r.balanceSheet.totals.totalLiabilitiesAndEquityCents).toBe(100000n);
    expect(r.balanceSheet.totals.differenceCents).toBe(0n);
    expect(r.readiness.canFinalize).toBe(true);
  });

  it("handles negative balances without special-casing them", () => {
    const r = build([
      row("1000-K", "Cash overdrawn", 0, 500, 1),
      row("4000-K", "Common Shares", 500, 0, 2),
    ]);
    expect(line(r.balanceSheet.nodes, "Cash")).toBe(-50000n);
    expect(r.balanceSheet.totals.totalAssetsCents).toBe(-50000n);
    expect(r.balanceSheet.totals.differenceCents).toBe(0n);
  });
});

describe("safety rules", () => {
  it("blocks on an unmapped account and keeps it off both statements", () => {
    const r = build([...BALANCED, row("7127-K", "Consulting", 32123.22, 0, 7),
      row("4400-K", "Retained Earnings", 0, 32123.22, 8)]);

    const unmapped = r.exceptions.filter((e) => e.code === "unmapped_account");
    expect(unmapped).toHaveLength(1);
    expect(unmapped[0].severity).toBe("blocking");
    expect(unmapped[0].accountCodes).toEqual(["7127-K"]);
    expect(unmapped[0].amountCents).toBe(3212322n);

    expect(r.readiness.allAccountsMapped).toBe(false);
    expect(r.readiness.canFinalize).toBe(false);
    expect(r.status).toBe("requires_review");

    // The money is not on a statement, and not silently dropped either.
    expect(r.reconciliation.unmappedCents).toBe(3212322n);
  });

  it("blocks on an ambiguous mapping instead of picking one", () => {
    const conflicting = rule({ id: "cash2", matchType: "BASE_GL_CODE", baseCode: "1000",
      statement: "balance_sheet", category: "Assets", section: "Current assets",
      statementLine: "Other Current Assets" });
    const r = build(BALANCED, [...RULES, conflicting]);

    const ambiguous = r.exceptions.filter((e) => e.code === "ambiguous_mapping");
    expect(ambiguous).toHaveLength(1);
    expect(ambiguous[0].severity).toBe("blocking");
    expect(r.readiness.noAmbiguousMappings).toBe(false);
    expect(line(r.balanceSheet.nodes, "Cash")).toBe(0n);
  });

  it("reports an out-of-balance sheet without plugging it", () => {
    // An excluded account holding money leaves the sheet short by that amount.
    const excluded = rule({ id: "ignore", matchType: "BASE_GL_CODE", baseCode: "1080",
      statement: "balance_sheet", category: "Assets", section: "Current assets",
      statementLine: "", excluded: true, exclusionReason: "Legacy master marked this ignored." });
    const r = build(
      [...BALANCED, row("1080-K", "Suspense", 250, 0, 7), row("4400-K", "RE", 0, 250, 8)],
      [...RULES, excluded]
    );

    // The excluded debit never reaches assets, while the matching credit does
    // reach equity, so the sheet is short by exactly that amount.
    expect(r.balanceSheet.totals.differenceCents).toBe(-25000n);
    expect(r.balanceSheetValidation.isBalanced).toBe(false);
    const oob = r.exceptions.find((e) => e.code === "balance_sheet_out_of_balance");
    expect(oob?.severity).toBe("blocking");
    expect(oob?.amountCents).toBe(-25000n);

    // Nothing absorbed the difference.
    expect(r.balanceSheet.totals.totalAssetsCents).toBe(100000n);
    expect(r.balanceSheet.totals.totalLiabilitiesAndEquityCents).toBe(125000n);
    expect(r.readiness.canFinalize).toBe(false);

    // And the excluded balance is surfaced, not hidden.
    expect(r.exceptions.some((e) => e.code === "excluded_account_has_balance")).toBe(true);
    expect(r.reconciliation.excludedCents).toBe(25000n);
  });

  it("blocks on an unbalanced Trial Balance", () => {
    const r = build([row("1000-K", "Cash", 1000, 0, 1), row("3300-K", "AP", 0, 900, 2)]);
    expect(r.trialBalanceValidation.isBalanced).toBe(false);
    expect(r.trialBalanceValidation.differenceCents).toBe(10000n);
    const ex = r.exceptions.find((e) => e.code === "trial_balance_out_of_balance");
    expect(ex?.severity).toBe("blocking");
    expect(ex?.detail).toContain("Difference");
    expect(r.readiness.canFinalize).toBe(false);
  });

  it("blocks on a duplicated account", () => {
    const r = build([
      row("1000-K", "Cash", 600, 0, 1), row("1000-K", "Cash again", 400, 0, 2),
      row("4000-K", "Common Shares", 0, 1000, 3),
    ]);
    const dup = r.exceptions.find((e) => e.code === "duplicate_account");
    expect(dup?.severity).toBe("blocking");
    expect(dup?.accountCodes).toEqual(["1000-K"]);
  });
});

describe("traceability and reconciliation", () => {
  it("makes every line equal the sum of its source rows", () => {
    const r = build();
    expect(r.traceabilityFailures).toEqual([]);
    for (const node of [...r.balanceSheet.nodes, ...r.incomeStatement.nodes]) {
      if (node.kind !== "line" || !node.sourceRows?.length) continue;
      const sum = node.sourceRows.reduce((a, s) => a + s.presentedCents, 0n);
      expect(sum).toBe(node.amountCents);
    }
  });

  it("shows the accounts behind a line", () => {
    const r = build();
    const cash = r.balanceSheet.nodes.find((n) => n.kind === "line" && n.label === "Cash");
    expect(cash?.sourceRows).toEqual([
      { accountCode: "1000-K", description: "Cash", netCents: 100000n, presentedCents: 100000n },
    ]);
  });

  it("accounts for every row in exactly one bucket", () => {
    const r = build();
    const c = r.reconciliation.counts;
    expect(c.mapped + c.excluded + c.unmapped + c.ambiguous).toBe(r.reconciliation.rowCount);
    expect(r.reconciliation.isComplete).toBe(true);
    expect(r.reconciliation.accountedCents).toBe(r.reconciliation.trialBalanceNetCents);
  });

  it("keeps a line that the layout never mentions rather than dropping it", () => {
    const odd = rule({ id: "odd", matchType: "BASE_GL_CODE", baseCode: "1005",
      statement: "balance_sheet", category: "Assets", section: "Current assets",
      statementLine: "Marketable Securities" });
    const r = build(
      [...BALANCED, row("1005-K", "Securities", 750, 0, 7), row("4400-K", "RE", 0, 750, 8)],
      [...RULES, odd]
    );
    expect(line(r.balanceSheet.nodes, "Marketable Securities")).toBe(75000n);
    expect(r.balanceSheet.totals.differenceCents).toBe(0n);
  });
});
