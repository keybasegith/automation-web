/**
 * Shared machinery for turning mapped Trial Balance rows into statement nodes.
 *
 * Sign handling lives here and nowhere else. The Trial Balance is stored in one
 * convention — `netCents = debitCents - creditCents`, debit positive — taken
 * verbatim from the source columns and never inferred from an account's type.
 * A statement then presents a line according to the side that line naturally
 * sits on, which is the only place a sign is ever flipped.
 */

import type {
  MappedEntry,
  NaturalBalance,
  StatementEmphasis,
  StatementKind,
  StatementNode,
  StatementSourceRow,
  TrialBalanceRow,
} from "../types";
import type { PresentedLine } from "../config/statementPresentation";
import { sumCents } from "../money";

/** The one signed convention in the application. */
export const signedBalanceCents = (debitCents: bigint, creditCents: bigint): bigint =>
  debitCents - creditCents;

/**
 * Convert a stored (debit-positive) balance to the sign a statement line shows.
 * An asset and an expense read positive when debit; a liability, equity account
 * and revenue read positive when credit.
 */
export const presentCents = (netCents: bigint, natural: NaturalBalance): bigint =>
  natural === "debit" ? netCents : -netCents;

export interface LineAggregate {
  statement: StatementKind;
  statementLine: string;
  section: string;
  category: string;
  netCents: bigint;
  rows: TrialBalanceRow[];
}

/** Group every mapped row by the statement line its rule assigns it to. */
export function aggregateByLine(entries: readonly MappedEntry[]): Map<string, LineAggregate> {
  const map = new Map<string, LineAggregate>();

  for (const entry of entries) {
    if (entry.outcome !== "mapped" || !entry.rule) continue;
    const rule = entry.rule;
    const key = `${rule.statement}|${rule.statementLine}`;

    let aggregate = map.get(key);
    if (!aggregate) {
      aggregate = {
        statement: rule.statement,
        statementLine: rule.statementLine,
        section: rule.section,
        category: rule.category,
        netCents: 0n,
        rows: [],
      };
      map.set(key, aggregate);
    }

    aggregate.netCents += entry.row.netCents;
    aggregate.rows.push(entry.row);
  }

  return map;
}

export interface BuildContext {
  aggregates: Map<string, LineAggregate>;
  statement: StatementKind;
  natural: NaturalBalance;
  /** Mapping lines already presented, so auto-placement never duplicates one. */
  used: Set<string>;
}

export const createContext = (
  aggregates: Map<string, LineAggregate>,
  statement: StatementKind,
  natural: NaturalBalance
): BuildContext => ({ aggregates, statement, natural, used: new Set() });

function toSourceRows(rows: readonly TrialBalanceRow[], natural: NaturalBalance): StatementSourceRow[] {
  return rows
    .map((row) => ({
      accountCode: row.account.normalizedFullCode,
      description: row.description,
      netCents: row.netCents,
      presentedCents: presentCents(row.netCents, natural),
    }))
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));
}

/**
 * Build one presented line. Returns null when the line has no mapped rows and
 * the layout does not ask for it to be shown at nil.
 */
export function buildLine(
  ctx: BuildContext,
  spec: PresentedLine,
  idPrefix: string,
  indent: number
): StatementNode | null {
  const parts = spec.sources
    .map((source) => ctx.aggregates.get(`${ctx.statement}|${source}`))
    .filter((a): a is LineAggregate => a !== undefined);

  for (const source of spec.sources) ctx.used.add(source);

  const rows = parts.flatMap((p) => p.rows);
  const netCents = sumCents(parts.map((p) => p.netCents));

  if (rows.length === 0 && !spec.alwaysShow) return null;

  return {
    id: `${idPrefix}-${spec.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    kind: "line",
    label: spec.label,
    indent,
    amountCents: presentCents(netCents, ctx.natural),
    emphasis: "none",
    sourceRows: toSourceRows(rows, ctx.natural),
  };
}

/**
 * Emit any mapped line belonging to `section` that the layout did not place.
 *
 * This is the guard against silent data loss through the presentation layer: a
 * new account mapped to a line nobody added to the layout still reaches the
 * statement rather than disappearing between the mapping table and the page.
 */
export function buildAutoLines(
  ctx: BuildContext,
  section: string,
  idPrefix: string,
  indent: number,
  excludeLines: readonly string[] = []
): StatementNode[] {
  const nodes: StatementNode[] = [];

  for (const aggregate of ctx.aggregates.values()) {
    if (aggregate.statement !== ctx.statement) continue;
    if (aggregate.section !== section) continue;
    if (ctx.used.has(aggregate.statementLine)) continue;
    if (excludeLines.includes(aggregate.statementLine)) continue;
    if (aggregate.netCents === 0n && aggregate.rows.length === 0) continue;

    ctx.used.add(aggregate.statementLine);
    nodes.push({
      id: `${idPrefix}-auto-${aggregate.statementLine.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
      kind: "line",
      label: aggregate.statementLine,
      indent,
      amountCents: presentCents(aggregate.netCents, ctx.natural),
      emphasis: "none",
      sourceRows: toSourceRows(aggregate.rows, ctx.natural),
    });
  }

  return nodes.sort((a, b) => a.label.localeCompare(b.label));
}

export const heading = (id: string, label: string, indent = 0): StatementNode => ({
  id, kind: "heading", label, indent, amountCents: null, emphasis: "bold",
});

export const spacer = (id: string): StatementNode => ({
  id, kind: "spacer", label: "", indent: 0, amountCents: null, emphasis: "none",
});

/** Sum the amounts of the given nodes into a subtotal or total node. */
export function total(
  id: string,
  label: string,
  components: readonly StatementNode[],
  options: { indent?: number; kind?: "subtotal" | "total"; emphasis?: StatementEmphasis } = {}
): StatementNode {
  return {
    id,
    kind: options.kind ?? "subtotal",
    label,
    indent: options.indent ?? 0,
    amountCents: sumCents(components.map((n) => n.amountCents ?? 0n)),
    emphasis: options.emphasis ?? "underline",
    componentIds: components.map((n) => n.id),
  };
}

/** A node whose value is stated outright rather than summed from children. */
export const computed = (
  id: string,
  label: string,
  amountCents: bigint,
  options: { indent?: number; kind?: "subtotal" | "total"; emphasis?: StatementEmphasis } = {}
): StatementNode => ({
  id,
  kind: options.kind ?? "subtotal",
  label,
  indent: options.indent ?? 0,
  amountCents,
  emphasis: options.emphasis ?? "underline",
});
