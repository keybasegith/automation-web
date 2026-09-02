"use client";

import { useState } from "react";

import type { StatementDto, StatementNodeDto } from "@/lib/financial-statements/api";

/**
 * Renders a generated statement.
 *
 * Amounts are the strings the server formatted from the stored cents, so what
 * is on screen is exactly what the Excel export writes. Every ordinary line can
 * be expanded to the GL rows behind it, and the expansion sums to the line.
 */
export default function StatementTable({ statement }: { statement: StatementDto }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[36rem]">
        <header className="mb-4">
          <h3 className="text-base font-semibold text-slate-900">{statement.entityName}</h3>
          <p className="text-sm font-medium text-slate-700">{statement.title}</p>
          <p className="text-sm text-slate-500">{statement.periodLabel}</p>
        </header>

        <table className="w-full text-sm">
          <tbody>
            {statement.nodes.map((node) => (
              <StatementRow
                key={node.id}
                node={node}
                isOpen={openId === node.id}
                onToggle={() => setOpenId(openId === node.id ? null : node.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatementRow({
  node, isOpen, onToggle,
}: {
  node: StatementNodeDto;
  isOpen: boolean;
  onToggle: () => void;
}) {
  if (node.kind === "spacer") {
    return (
      <tr>
        <td colSpan={2} className="h-3" />
      </tr>
    );
  }

  const canExpand = node.kind === "line" && node.sourceRows.length > 0;
  const bold = node.kind === "heading" || node.kind === "total" || node.emphasis === "bold";

  const amountBorder =
    node.emphasis === "double-underline"
      ? "border-t border-slate-400 border-b-4 border-double border-b-slate-400"
      : node.emphasis === "underline"
        ? "border-t border-slate-300"
        : "";

  return (
    <>
      <tr className={canExpand ? "group hover:bg-slate-50" : undefined}>
        <td
          className={`py-1 pr-4 ${bold ? "font-semibold text-slate-900" : "text-slate-700"}`}
          style={{ paddingLeft: `${node.indent * 1.25}rem` }}
        >
          {canExpand ? (
            <button
              type="button"
              onClick={onToggle}
              className="text-left underline decoration-dotted underline-offset-4 hover:text-brand"
              aria-expanded={isOpen}
            >
              {node.label}
              <span className="ml-2 text-xs font-normal text-slate-400 group-hover:text-brand">
                {isOpen ? "hide source" : "view source accounts"}
              </span>
            </button>
          ) : (
            node.label
          )}
          {node.derived ? (
            <span className="ml-2 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-700">
              from Income Statement
            </span>
          ) : null}
        </td>
        <td
          className={`w-44 py-1 text-right tabular-nums ${amountBorder} ${
            bold ? "font-semibold text-slate-900" : "text-slate-800"
          }`}
        >
          {node.display}
        </td>
      </tr>

      {isOpen && canExpand ? (
        <tr>
          <td colSpan={2} className="bg-slate-50 px-4 py-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-1 font-medium">Account</th>
                  <th className="pb-1 font-medium">Description</th>
                  <th className="pb-1 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {node.sourceRows.map((row) => (
                  <tr key={row.accountCode} className="text-slate-700">
                    <td className="py-0.5 pr-3 font-mono">{row.accountCode}</td>
                    <td className="py-0.5 pr-3">{row.description}</td>
                    <td className="py-0.5 text-right tabular-nums">{row.display}</td>
                  </tr>
                ))}
                <tr className="border-t border-slate-300 font-semibold text-slate-900">
                  <td className="py-1" colSpan={2}>
                    {node.sourceRows.length} account{node.sourceRows.length === 1 ? "" : "s"}
                  </td>
                  <td className="py-1 text-right tabular-nums">{node.display}</td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      ) : null}
    </>
  );
}
