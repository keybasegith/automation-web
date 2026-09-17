"use client";

import {
  PORTFOLIO_PRIORITIES,
  PORTFOLIO_PRIORITY_INSTRUCTION,
  PORTFOLIO_PRIORITY_QUESTION,
} from "@/lib/risk-questionnaire/config";
import type { PortfolioPriorityId } from "@/lib/risk-questionnaire/types";
import { Instruction, QuestionHeading } from "./ui";

const RANKS = PORTFOLIO_PRIORITIES.map((_, i) => i + 1);

/**
 * The portfolio-priority ranking.
 *
 * Unscored: the source form prints no point values here, so nothing in this
 * component feeds the Risk Capacity total.
 *
 * Ranks are optional — the form says "rank all that apply" — and a rank can
 * only be held by one priority at a time. Choosing a rank already in use moves
 * it, clearing the priority that held it, rather than refusing the click.
 */
export default function PriorityRanking({
  values,
  onChange,
}: {
  values: Record<PortfolioPriorityId, number | null>;
  onChange: (next: Record<PortfolioPriorityId, number | null>) => void;
}) {
  const setRank = (id: PortfolioPriorityId, rank: number | null) => {
    const next = { ...values };
    if (rank !== null) {
      for (const key of Object.keys(next) as PortfolioPriorityId[]) {
        if (next[key] === rank) next[key] = null;
      }
    }
    next[id] = rank;
    onChange(next);
  };

  return (
    <section className="crq-question px-4 py-4" aria-labelledby="crq-priorities-heading">
      <div id="crq-priorities-heading">
        <QuestionHeading as="h3">{PORTFOLIO_PRIORITY_QUESTION}</QuestionHeading>
      </div>
      <Instruction>{PORTFOLIO_PRIORITY_INSTRUCTION}</Instruction>

      <ul className="mt-2.5 flex flex-col gap-1.5">
        {PORTFOLIO_PRIORITIES.map((priority) => {
          const selectId = `crq-priority-${priority.id}`;
          return (
            <li
              key={priority.id}
              className="flex items-center gap-3 rounded-[5px] border border-slate-200 bg-white px-3 py-2"
            >
              <select
                id={selectId}
                name={selectId}
                value={values[priority.id] ?? ""}
                onChange={(e) =>
                  setRank(priority.id, e.target.value === "" ? null : Number(e.target.value))
                }
                className="h-9 w-[62px] shrink-0 rounded-[4px] border border-slate-300 bg-white px-2 text-center text-[15px] text-[#111111] outline-none transition focus-visible:border-[#0B6165] focus-visible:ring-2 focus-visible:ring-[#0B6165]/35"
              >
                <option value="">—</option>
                {RANKS.map((rank) => (
                  <option key={rank} value={rank}>
                    {rank}
                  </option>
                ))}
              </select>
              <label htmlFor={selectId} className="text-[16px] leading-snug text-[#111111]">
                {priority.letter}) {priority.label}
              </label>
            </li>
          );
        })}
      </ul>

      <p className="crq-no-print mt-2 text-[13px] text-slate-500">
        Optional, and not part of your score. Each rank can be used once — reusing one moves it.
      </p>
    </section>
  );
}
