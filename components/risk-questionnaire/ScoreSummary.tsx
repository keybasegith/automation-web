"use client";

import { QUESTIONS_BY_ID } from "@/lib/risk-questionnaire/config";
import type { ScoredQuestionId, SectionScore } from "@/lib/risk-questionnaire/types";
import { pointsForAnswer } from "@/lib/risk-questionnaire/scoring";

/**
 * One of the two scoring tables from the source form, filled in automatically.
 *
 * The paper version has three blank columns after the six questions; they are
 * kept so the digital table reads as the same artifact, but they are inert.
 */
export default function ScoreSummary({
  title,
  instruction,
  questionIds,
  answers,
  section,
}: {
  title: string;
  instruction: string;
  questionIds: readonly ScoredQuestionId[];
  answers: Partial<Record<ScoredQuestionId, string>>;
  section: SectionScore;
}) {
  const spacerColumns = [0, 1, 2];

  return (
    <section className="mt-6">
      <h3 className="text-[17px] font-bold text-[#111111]">{title}</h3>
      <p className="mt-1 max-w-4xl text-[13px] leading-snug text-[#333333]">{instruction}</p>

      <div className="crq-scroll-x mt-2.5 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-center">
          <caption className="sr-only">{title}</caption>
          <tbody>
            <tr>
              <th
                scope="row"
                className="w-[150px] border border-[#111111] bg-white px-3 py-1.5 text-left text-[15px] font-bold text-[#111111]"
              >
                Question #:
              </th>
              {questionIds.map((id) => (
                <th
                  key={id}
                  scope="col"
                  className="border border-[#111111] px-3 py-1.5 text-[15px] font-bold text-[#111111]"
                >
                  {QUESTIONS_BY_ID[id].number}
                </th>
              ))}
              {spacerColumns.map((i) => (
                <td key={i} aria-hidden className="border border-[#111111] px-3 py-1.5" />
              ))}
              <th
                scope="col"
                className="w-[130px] border border-[#111111] px-3 py-1.5 text-[15px] font-bold text-[#111111]"
              >
                Score Totals
              </th>
            </tr>
            <tr>
              <th
                scope="row"
                className="border border-[#111111] bg-white px-3 py-1.5 text-left text-[15px] font-bold text-[#111111]"
              >
                Answers:
              </th>
              {questionIds.map((id) => {
                const points = pointsForAnswer(id, answers[id]);
                return (
                  <td
                    key={id}
                    className="border border-[#111111] px-3 py-1.5 text-[16px] tabular-nums text-[#111111]"
                  >
                    {points ?? <span className="text-slate-300">—</span>}
                  </td>
                );
              })}
              {spacerColumns.map((i) => (
                <td key={i} aria-hidden className="border border-[#111111] px-3 py-1.5" />
              ))}
              <td className="border border-[#111111] bg-[#EEF5F5] px-3 py-1.5 text-[17px] font-bold tabular-nums text-[#0B6165]">
                {section.score ?? <span className="text-slate-400">—</span>}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {!section.complete && (
        <p className="crq-no-print mt-2 text-[13px] text-slate-500">
          {section.answered} of {section.total} answered — the total appears once every question in
          this section has an answer.
        </p>
      )}
    </section>
  );
}
