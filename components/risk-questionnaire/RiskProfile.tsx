"use client";

import { Check } from "lucide-react";

import { RISK_LEVELS_IN_ORDER, RISK_LEVEL_BANDS } from "@/lib/risk-questionnaire/config";
import type { CrqFormDefinition } from "@/lib/risk-questionnaire/forms";
import type { RiskProfile as Profile } from "@/lib/risk-questionnaire/scoring";
import type { RiskLevel } from "@/lib/risk-questionnaire/types";

const bandFor = (level: RiskLevel) =>
  RISK_LEVEL_BANDS.find((b) => b.level === level)!;

/** One row of the "Your Risk Levels" table, with the matched band highlighted. */
function LevelRow({
  label,
  score,
  level,
}: {
  label: string;
  score: number | null;
  level: RiskLevel | null;
}) {
  return (
    <tr>
      <th
        scope="row"
        className="border border-[#111111] bg-white px-3 py-1.5 text-left text-[15px] font-semibold text-[#111111]"
      >
        <span className="flex items-center justify-between gap-3">
          {label}
          <span className="text-[16px] font-bold tabular-nums text-[#0B6165]">
            {score ?? <span className="font-normal text-slate-300">—</span>}
          </span>
        </span>
      </th>
      {RISK_LEVELS_IN_ORDER.map((candidate) => {
        const matched = level === candidate;
        return (
          <td
            key={candidate}
            aria-current={matched ? "true" : undefined}
            className={`border border-[#111111] px-3 py-1.5 text-[15px] tabular-nums ${
              matched
                ? "bg-[#B5CFD0] font-bold text-[#0f172a]"
                : "bg-white text-[#333333]"
            }`}
          >
            <span className="flex items-center justify-center gap-1.5 whitespace-nowrap">
              {matched && <Check aria-hidden className="h-4 w-4 shrink-0" strokeWidth={3} />}
              {bandFor(candidate).display}
              {matched && <span className="sr-only">— your {label.toLowerCase()} level</span>}
            </span>
          </td>
        );
      })}
    </tr>
  );
}

/**
 * "Your Risk Profile" — the two level rows plus the final ranking.
 *
 * Everything here is derived. The final ranking is the LOWER of the two levels
 * and is never something the client or advisor picks by hand.
 */
export default function RiskProfile({
  profile,
  form,
}: {
  profile: Profile;
  /** Supplies the edition's wording ("Your Risk Profile" / "The Entity's Risk Profile"). */
  form: CrqFormDefinition;
}) {
  const { finalRiskRanking } = profile;

  return (
    <section className="mt-7">
      <h3 className="text-[17px] font-bold text-[#111111]">{form.profileHeading}</h3>
      <p className="mt-1 max-w-4xl text-[13px] leading-snug text-[#333333]">
        {form.levelsInstruction}
      </p>

      <div className="crq-scroll-x mt-2.5 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-center">
          <caption className="sr-only">
            Your risk levels — Risk Capacity and Risk Tolerance scores against the source
            threshold bands
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="w-[260px] border border-[#111111] bg-white px-3 py-1.5 text-left text-[15px] font-bold text-[#111111]"
              >
                {form.levelsLabel}
              </th>
              {RISK_LEVELS_IN_ORDER.map((level) => (
                <th
                  key={level}
                  scope="col"
                  className="border border-[#111111] bg-white px-3 py-1.5 text-[15px] font-bold text-[#111111]"
                >
                  {level}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <LevelRow
              label="Risk Capacity Score"
              score={profile.capacity.score}
              level={profile.capacityLevel}
            />
            <LevelRow
              label="Risk Tolerance Score"
              score={profile.tolerance.score}
              level={profile.toleranceLevel}
            />
          </tbody>
        </table>
      </div>

      {profile.reviewNotice && (
        <p
          role="alert"
          className="mt-3 rounded-[5px] border border-amber-300 bg-amber-50 px-3 py-2 text-[14px] text-amber-900"
        >
          {profile.reviewNotice}
        </p>
      )}

      <p className="mt-4 max-w-4xl text-[13px] leading-snug text-[#333333]">
        {form.rankingInstruction}
      </p>

      <div className="crq-scroll-x mt-2.5 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-center">
          <caption className="sr-only">Your risk ranking — the lower of the two risk levels</caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="w-[260px] border border-[#111111] bg-white px-3 py-1.5 text-left text-[15px] font-bold text-[#111111]"
              >
                {form.rankingLabel}
              </th>
              {RISK_LEVELS_IN_ORDER.map((level) => (
                <th
                  key={level}
                  scope="col"
                  className="border border-[#111111] bg-white px-3 py-1.5 text-[15px] font-bold text-[#111111]"
                >
                  {level}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#111111] bg-white px-3 py-2 text-left text-[14px] text-[#333333]">
                {finalRiskRanking
                  ? "Lower of your two risk levels"
                  : "Answer all twelve questions to determine"}
              </td>
              {RISK_LEVELS_IN_ORDER.map((level) => {
                const matched = finalRiskRanking === level;
                return (
                  <td
                    key={level}
                    aria-current={matched ? "true" : undefined}
                    className={`border border-[#111111] px-3 py-2 ${
                      matched ? "bg-[#B5CFD0]" : "bg-white"
                    }`}
                  >
                    {matched ? (
                      <span className="flex items-center justify-center gap-1.5 text-[15px] font-bold text-[#0f172a]">
                        <Check aria-hidden className="h-4 w-4" strokeWidth={3} />
                        {level}
                        <span className="sr-only">— your risk ranking</span>
                      </span>
                    ) : (
                      <span aria-hidden className="text-slate-300">
                        &nbsp;
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
