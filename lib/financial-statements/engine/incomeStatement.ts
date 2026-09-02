/**
 * Income Statement generation.
 *
 * Generated before the Balance Sheet, because the Balance Sheet presents this
 * statement's net income as current-period earnings and takes that number
 * verbatim rather than working it out a second time.
 *
 * Every figure is an aggregation of mapped Trial Balance rows plus the explicit
 * arithmetic below. Nothing is estimated and nothing is plugged.
 */

import type { GeneratedIncomeStatement, MappedEntry, StatementNode } from "../types";
import { INCOME_STATEMENT_PRESENTATION as P } from "../config/statementPresentation";
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
import { sumCents } from "../money";

export interface IncomeStatementInput {
  entityName: string;
  periodLabel: string;
  entries: readonly MappedEntry[];
}

export function generateIncomeStatement(input: IncomeStatementInput): GeneratedIncomeStatement {
  const aggregates = aggregateByLine(input.entries);

  // Sections differ in which side they naturally sit on, but they share one
  // "already presented" set so auto-placement can never emit a line twice.
  const used = new Set<string>();
  const context = (natural: "debit" | "credit"): BuildContext => {
    const ctx = createContext(aggregates, "income_statement", natural);
    ctx.used = used;
    return ctx;
  };
  const revenueCtx = context("credit");
  const expenseCtx = context("debit");

  const nodes: StatementNode[] = [];
  const push = (...items: (StatementNode | null)[]) => {
    for (const item of items) if (item) nodes.push(item);
    return items.filter((i): i is StatementNode => i !== null);
  };

  // --- Commission Income ---------------------------------------------------
  nodes.push(heading("is-commission-income-heading", "Commission Income"));
  const commissionIncomeLines = [
    ...P.commissionIncome.lines.map((l) => buildLine(revenueCtx, l, "is", 1)),
    ...buildAutoLines(revenueCtx, P.commissionIncome.section, "is", 1),
  ].filter((n): n is StatementNode => n !== null);
  nodes.push(...commissionIncomeLines);
  const totalCommissionIncome = total(
    "is-total-commission-income", "Total Commission Income", commissionIncomeLines, { indent: 1 }
  );
  nodes.push(totalCommissionIncome, spacer("is-sp1"));

  // --- Commission Expense --------------------------------------------------
  nodes.push(heading("is-commission-expense-heading", "Commission Expense"));
  const commissionExpenseLines = [
    ...P.commissionExpense.lines.map((l) => buildLine(expenseCtx, l, "is", 1)),
    ...buildAutoLines(expenseCtx, P.commissionExpense.section, "is", 1),
  ].filter((n): n is StatementNode => n !== null);
  nodes.push(...commissionExpenseLines);
  const totalCommissionExpense = total(
    "is-total-commission-expense", "Total Commission Expense", commissionExpenseLines, { indent: 1 }
  );
  nodes.push(totalCommissionExpense, spacer("is-sp2"));

  const commissionIncomeCents = totalCommissionIncome.amountCents ?? 0n;
  const commissionExpenseCents = totalCommissionExpense.amountCents ?? 0n;
  const netCommissionIncomeCents = commissionIncomeCents - commissionExpenseCents;
  nodes.push(
    computed("is-net-commission-income", "Net Commission Income", netCommissionIncomeCents, { emphasis: "bold" }),
    spacer("is-sp3")
  );

  // --- Fees & Other Income -------------------------------------------------
  nodes.push(heading("is-fees-heading", "Fees & Other Income"));
  const feeLines = [
    ...P.feesAndOtherIncome.lines.map((l) => buildLine(revenueCtx, l, "is", 1)),
    ...buildAutoLines(revenueCtx, P.feesAndOtherIncome.section, "is", 1),
  ].filter((n): n is StatementNode => n !== null);
  nodes.push(...feeLines);
  const totalFees = total("is-total-fees", "Total Fees & Other Income", feeLines, { indent: 1 });
  nodes.push(totalFees, spacer("is-sp4"));

  const feesAndOtherIncomeCents = totalFees.amountCents ?? 0n;
  const grossOperatingProfitCents = netCommissionIncomeCents + feesAndOtherIncomeCents;
  nodes.push(
    computed("is-gross-operating-profit", "Gross Operating Profit", grossOperatingProfitCents, { emphasis: "bold" }),
    spacer("is-sp5")
  );

  // --- Operating Expense ---------------------------------------------------
  // Income tax shares the Operating Expense section in the mapping table but is
  // presented after the subtotal, so it is held back here.
  nodes.push(heading("is-operating-expense-heading", "Operating Expense"));
  const operatingLines = [
    ...P.operatingExpense.lines.map((l) => buildLine(expenseCtx, l, "is", 1)),
    ...buildAutoLines(
      expenseCtx, P.operatingExpense.section, "is", 1, P.operatingExpense.excludeFromSubtotal
    ),
  ].filter((n): n is StatementNode => n !== null);
  nodes.push(...operatingLines);
  const totalOperating = total(
    "is-total-operating-expense", "Total Operating Expense", operatingLines, { indent: 1 }
  );
  nodes.push(totalOperating, spacer("is-sp6"));

  const operatingExpenseCents = totalOperating.amountCents ?? 0n;
  const netProfitBeforeTaxCents = grossOperatingProfitCents - operatingExpenseCents;
  nodes.push(
    computed("is-net-profit-before-tax", "Net Profit/(Loss) before Tax", netProfitBeforeTaxCents, {
      emphasis: "bold",
    }),
    spacer("is-sp7")
  );

  // --- Income tax and net income ------------------------------------------
  const taxLine = buildLine(expenseCtx, P.incomeTax, "is", 0);
  push(taxLine);
  const incomeTaxProvisionCents = taxLine?.amountCents ?? 0n;
  const netIncomeCents = netProfitBeforeTaxCents - incomeTaxProvisionCents;

  nodes.push(
    spacer("is-sp8"),
    computed("is-net-income", "Net Income", netIncomeCents, {
      kind: "total",
      emphasis: "double-underline",
    })
  );

  return {
    kind: "income_statement",
    entityName: input.entityName,
    title: "Profit & Loss Accounts",
    periodLabel: input.periodLabel,
    nodes,
    totals: {
      commissionIncomeCents,
      commissionExpenseCents,
      netCommissionIncomeCents,
      feesAndOtherIncomeCents,
      grossOperatingProfitCents,
      operatingExpenseCents,
      netProfitBeforeTaxCents,
      incomeTaxProvisionCents,
      netIncomeCents,
    },
  };
}

/**
 * Net income re-derived straight from the mapped rows, independent of the
 * presentation tree. Used only to prove the statement adds up; it is never the
 * number shown anywhere.
 */
export function crossCheckNetIncome(entries: readonly MappedEntry[]): bigint {
  const contributing = entries.filter(
    (e) => e.outcome === "mapped" && e.rule?.statement === "income_statement"
  );
  // Revenue and expense both live debit-positive in netCents; net income is the
  // credit-positive result, hence the negation.
  return -sumCents(contributing.map((e) => e.row.netCents));
}
