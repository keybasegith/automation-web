/**
 * Balance Sheet generation.
 *
 * Current-period earnings are NOT recomputed here. The Income Statement's net
 * income is passed in and presented verbatim, so the two statements cannot
 * drift apart: there is exactly one net income in the system. A separate
 * cross-check re-derives it from the legacy "all P&L accounts" span and raises
 * an exception on any disagreement, but that check never supplies the number.
 *
 * If assets and equities do not agree, the difference is reported. It is never
 * plugged — no balancing entry, no rounding line, no adjustment to equity.
 */

import type { GeneratedBalanceSheet, MappedEntry, StatementNode } from "../types";
import { BALANCE_SHEET_PRESENTATION as P } from "../config/statementPresentation";
import {
  aggregateByLine,
  buildAutoLines,
  buildLine,
  computed,
  createContext,
  heading,
  spacer,
  total,
  type BuildContext,
} from "./statementBuilder";

export interface BalanceSheetInput {
  entityName: string;
  periodLabel: string;
  entries: readonly MappedEntry[];
  /** The Income Statement's net income. The single source for this figure. */
  netIncomeCents: bigint;
}

export function generateBalanceSheet(input: BalanceSheetInput): GeneratedBalanceSheet {
  const aggregates = aggregateByLine(input.entries);

  const used = new Set<string>();
  const context = (natural: "debit" | "credit"): BuildContext => {
    const ctx = createContext(aggregates, "balance_sheet", natural);
    ctx.used = used;
    return ctx;
  };
  const assetCtx = context("debit");
  const equityCtx = context("credit");

  const nodes: StatementNode[] = [];
  const keep = (items: (StatementNode | null)[]) => items.filter((n): n is StatementNode => n !== null);

  // ===================== ASSETS =====================
  nodes.push(heading("bs-assets-heading", "ASSETS"));
  nodes.push(heading("bs-current-assets-heading", "Current assets:", 0));

  const currentAssetLines = keep([
    ...P.currentAssets.lines.map((l) => buildLine(assetCtx, l, "bs", 1)),
    ...buildAutoLines(assetCtx, P.currentAssets.section, "bs", 1),
  ]);
  nodes.push(...currentAssetLines);
  const currentAssetsSubtotal = total(
    "bs-total-current-assets", "Total Current Assets", currentAssetLines, { indent: 1 }
  );
  nodes.push(currentAssetsSubtotal, spacer("bs-sp1"));

  const capitalAssetLines = keep([
    ...P.capitalAssets.lines.map((l) => buildLine(assetCtx, l, "bs", 0)),
    ...buildAutoLines(assetCtx, P.capitalAssets.section, "bs", 0),
  ]);
  nodes.push(...capitalAssetLines, spacer("bs-sp2"));

  const goodwillLines = keep([
    ...P.goodwill.lines.map((l) => buildLine(assetCtx, l, "bs", 0)),
    ...buildAutoLines(assetCtx, P.goodwill.section, "bs", 0),
  ]);
  nodes.push(...goodwillLines);

  const totalAssets = total(
    "bs-total-assets", "Total Assets",
    [currentAssetsSubtotal, ...capitalAssetLines, ...goodwillLines],
    { kind: "total", emphasis: "double-underline" }
  );
  nodes.push(totalAssets, spacer("bs-sp3"));

  // ============ LIABILITIES AND SHAREHOLDERS' EQUITY ============
  nodes.push(
    heading("bs-liabilities-heading", "LIABILITIES AND SHAREHOLDERS' EQUITY"),
    heading("bs-liabilities-sub", "Liabilities:", 0),
    heading("bs-current-liabilities-heading", "Current liabilities", 0),
    heading("bs-payables-heading", "Accounts Payable & Accrued Liabilities:", 1)
  );

  const payableLines = keep(P.payablesAndAccruals.lines.map((l) => buildLine(equityCtx, l, "bs", 2)));
  nodes.push(...payableLines);
  const payablesSubtotal = total("bs-total-payables", "", payableLines, { indent: 2 });
  nodes.push(payablesSubtotal, spacer("bs-sp4"));

  const otherCurrentLines = keep([
    ...P.otherCurrentLiabilities.lines.map((l) => buildLine(equityCtx, l, "bs", 1)),
    ...buildAutoLines(equityCtx, P.otherCurrentLiabilities.section, "bs", 1),
  ]);
  nodes.push(...otherCurrentLines);
  const otherCurrentSubtotal = total("bs-total-other-current", "", otherCurrentLines, { indent: 1 });
  nodes.push(otherCurrentSubtotal, spacer("bs-sp5"));

  const totalCurrentLiabilities = total(
    "bs-total-current-liabilities", "Total Current Liabilities",
    [payablesSubtotal, otherCurrentSubtotal], { indent: 1 }
  );
  nodes.push(totalCurrentLiabilities, spacer("bs-sp6"));

  nodes.push(heading("bs-long-term-heading", "Long Term Liabilities"));
  const longTermLines = keep([
    ...P.longTermLiabilities.lines.map((l) => buildLine(equityCtx, l, "bs", 1)),
    ...buildAutoLines(equityCtx, P.longTermLiabilities.section, "bs", 1),
  ]);
  nodes.push(...longTermLines);
  const longTermSubtotal = total("bs-total-long-term", "", longTermLines, { indent: 1 });

  const totalLiabilities = total(
    "bs-total-liabilities", "Total Liabilities",
    [totalCurrentLiabilities, longTermSubtotal], { emphasis: "underline" }
  );
  nodes.push(totalLiabilities, spacer("bs-sp7"));

  // --- Shareholders' equity ---
  nodes.push(heading("bs-equity-heading", "Shareholders' equity:"));
  const commonShares = buildLine(equityCtx, P.equity.commonShares, "bs", 1);
  if (commonShares) nodes.push(commonShares, spacer("bs-sp8"));

  const retainedBeginning = buildLine(equityCtx, P.equity.retainedEarningsBeginning, "bs", 1);
  if (retainedBeginning) nodes.push(retainedBeginning);

  // The one derived line on either statement.
  used.add(P.equity.currentPeriodEarningsLabel);
  const currentPeriodEarnings: StatementNode = {
    id: "bs-current-period-earnings",
    kind: "line",
    label: P.equity.currentPeriodEarningsLabel,
    indent: 1,
    amountCents: input.netIncomeCents,
    emphasis: "none",
    derived: true,
    sourceRows: input.entries
      .filter((e) => e.outcome === "mapped" && e.rule?.statement === "income_statement")
      .map((e) => ({
        accountCode: e.row.account.normalizedFullCode,
        description: e.row.description,
        netCents: e.row.netCents,
        presentedCents: -e.row.netCents,
      }))
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
  };
  nodes.push(currentPeriodEarnings);

  const retainedEarningsTotal = total(
    "bs-retained-earnings-total", "",
    [retainedBeginning, currentPeriodEarnings].filter((n): n is StatementNode => n !== null),
    { indent: 1 }
  );
  nodes.push(retainedEarningsTotal);

  const otherEquityLines = buildAutoLines(equityCtx, P.equity.section, "bs", 1);
  nodes.push(...otherEquityLines, spacer("bs-sp9"));

  const equityComponents = keep([commonShares, retainedEarningsTotal, ...otherEquityLines]);
  const totalEquityCents = equityComponents.reduce((sum, n) => sum + (n.amountCents ?? 0n), 0n);

  const totalLiabilitiesAndEquity = total(
    "bs-total-liabilities-and-equity", "Total Liabilities & Shareholders' Equities",
    [totalLiabilities, ...equityComponents],
    { kind: "total", emphasis: "double-underline" }
  );
  nodes.push(totalLiabilitiesAndEquity);

  const totalAssetsCents = totalAssets.amountCents ?? 0n;
  const totalLiabilitiesAndEquityCents = totalLiabilitiesAndEquity.amountCents ?? 0n;
  const differenceCents = totalAssetsCents - totalLiabilitiesAndEquityCents;

  // Shown even at zero: the reviewed statement prints it, and a reader should
  // be able to see the check rather than take it on trust.
  nodes.push(
    computed("bs-difference", "Difference", differenceCents, { kind: "subtotal", emphasis: "none" })
  );

  return {
    kind: "balance_sheet",
    entityName: input.entityName,
    title: "Balance Sheet",
    periodLabel: input.periodLabel,
    nodes,
    totals: {
      currentAssetsCents: currentAssetsSubtotal.amountCents ?? 0n,
      totalAssetsCents,
      currentLiabilitiesCents: totalCurrentLiabilities.amountCents ?? 0n,
      longTermLiabilitiesCents: longTermSubtotal.amountCents ?? 0n,
      totalLiabilitiesCents: totalLiabilities.amountCents ?? 0n,
      commonSharesCents: commonShares?.amountCents ?? 0n,
      retainedEarningsBeginningCents: retainedBeginning?.amountCents ?? 0n,
      currentPeriodEarningsCents: input.netIncomeCents,
      retainedEarningsTotalCents: retainedEarningsTotal.amountCents ?? 0n,
      totalShareholdersEquityCents: totalEquityCents,
      totalLiabilitiesAndEquityCents,
      differenceCents,
    },
  };
}
