"use client";

/**
 * The Client Risk Questionnaire, as one wizard screen.
 *
 * Reuses the CRQ's own question components, so the wording and scoring are
 * exactly the digital form's. Questions the NAAF already answered (income, net
 * worth, age group) arrive pre-selected and say so; the score and ranking
 * update as answers are chosen.
 */

import type { CrqFormDefinition } from "@/lib/risk-questionnaire/forms";
import { deriveRiskProfile } from "@/lib/risk-questionnaire/scoring";
import type {
  InvestmentCheckFrequency,
  JointInvestmentGoal,
  QuestionnaireState,
  ScoredQuestionId,
} from "@/lib/risk-questionnaire/types";
import { fieldIds, validateQuestionnaire } from "@/lib/risk-questionnaire/validation";
import type { LinkNote } from "@/lib/new-account/sync";

import PriorityRanking from "@/components/risk-questionnaire/PriorityRanking";
import QuestionCard from "@/components/risk-questionnaire/QuestionCard";
import UnscoredChoice from "@/components/risk-questionnaire/UnscoredChoice";

import { Section, TextInput } from "./fields";

export default function RiskStep({
  form,
  crq,
  onCrq,
  notes,
  showFindings,
}: {
  form: CrqFormDefinition;
  crq: QuestionnaireState;
  onCrq: (update: (prev: QuestionnaireState) => QuestionnaireState) => void;
  notes: Partial<Record<ScoredQuestionId, LinkNote>>;
  showFindings: boolean;
}) {
  const profile = deriveRiskProfile(crq.answers, form);
  const errors = showFindings ? validateQuestionnaire(crq, form) : [];
  const errorFor = (id: string) => errors.find((e) => e.fieldId === id)?.message;
  const patch = (changes: Partial<QuestionnaireState>) => onCrq((p) => ({ ...p, ...changes }));

  const section = (title: string, ids: readonly ScoredQuestionId[]) => (
    <Section title={title}>
      <div className="grid gap-x-8 @4xl:grid-cols-2">
        {ids.map((id) => (
          <div key={id} className={form.byId[id].chart ? "@4xl:col-span-2" : undefined}>
            <QuestionCard
              question={form.byId[id]}
              fieldId={fieldIds.question(id)}
              selectedOptionId={crq.answers[id]}
              onSelect={(qid, optionId) => onCrq((p) => ({ ...p, answers: { ...p.answers, [qid]: optionId } }))}
              error={errorFor(fieldIds.question(id))}
              note={notes[id]}
            />
          </div>
        ))}
      </div>
    </Section>
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-slate-500">
        {form.subtitle} edition. Ask the client each question; answers already given on the NAAF are pre-selected.
      </p>

      <Section title="About this portfolio" description="Not scored.">
        <div className="grid gap-x-8 @4xl:grid-cols-2">
          <PriorityRanking
            question={form.priorityQuestion}
            instruction={form.priorityInstruction}
            values={crq.portfolioPriorities}
            onChange={(portfolioPriorities) => patch({ portfolioPriorities })}
          />
          <UnscoredChoice
            question={form.investmentCheckQuestion}
            value={crq.investmentCheckFrequency}
            onSelect={(v) => patch({ investmentCheckFrequency: v as InvestmentCheckFrequency })}
          />
        </div>
      </Section>

      {section("Risk capacity", form.capacityIds)}
      {section("Risk tolerance", form.toleranceIds)}

      {/* Live result — the ranking is the lower of the two levels. */}
      <div className="sticky bottom-20 z-10 grid gap-3 rounded-[10px] border border-[#0B6165]/25 bg-[#F4F9F9]/95 p-4 backdrop-blur @xl:grid-cols-3">
        <Score label="Risk capacity" score={profile.capacity.score} level={profile.capacityLevel} answered={profile.capacity.answered} total={profile.capacity.total} />
        <Score label="Risk tolerance" score={profile.tolerance.score} level={profile.toleranceLevel} answered={profile.tolerance.answered} total={profile.tolerance.total} />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#0B6165]">{form.rankingLabel}</p>
          <p className="mt-0.5 text-[20px] font-bold uppercase leading-tight text-[#0B6165]">{profile.finalRiskRanking ?? "—"}</p>
          <p className="text-[12px] text-slate-600">The lower of the two levels.</p>
        </div>
      </div>

      <Section title="Notes" description="Printed in the CRQ's Notes box.">
        <textarea
          id="crq-notes"
          rows={3}
          value={crq.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          className="w-full rounded-[7px] border border-slate-300 px-3 py-2 text-[15px] outline-none focus-visible:border-[#0B6165] focus-visible:ring-4 focus-visible:ring-[#0B6165]/25"
        />
      </Section>

      <Section title="Client acknowledgement">
        <fieldset id={fieldIds.acknowledgement} className="flex scroll-mt-32 flex-col gap-2">
          <legend className="sr-only">Client acknowledgement</legend>
          <AckOption checked={crq.acknowledgementType === "all_accounts"} onSelect={() => patch({ acknowledgementType: "all_accounts" })}>
            {form.acknowledgement.all}
          </AckOption>
          <AckOption checked={crq.acknowledgementType === "single_account"} onSelect={() => patch({ acknowledgementType: "single_account" })}>
            {form.acknowledgement.singlePrefix} <b className="font-medium">[account]</b> {form.acknowledgement.singleSuffix}
            {form.acknowledgement.goalChoices && <> <b className="font-medium">[goal]</b> {form.acknowledgement.goalTail}</>}
          </AckOption>
        </fieldset>
        {errorFor(fieldIds.acknowledgement) && <p className="mt-1 text-[12.5px] text-red-600">{errorFor(fieldIds.acknowledgement)}</p>}
        {crq.acknowledgementType === "single_account" && (
          <div className="mt-4 grid gap-4 @xl:grid-cols-2">
            <div>
              <TextInput
                id={fieldIds.acknowledgementAccountName}
                label="Account this questionnaire applies to"
                value={crq.acknowledgementAccountName}
                onChange={(acknowledgementAccountName) => patch({ acknowledgementAccountName })}
              />
              {errorFor(fieldIds.acknowledgementAccountName) && (
                <p className="mt-1 text-[12.5px] text-red-600">{errorFor(fieldIds.acknowledgementAccountName)}</p>
              )}
            </div>
            {form.acknowledgement.goalChoices && (
              <div>
                <label htmlFor={fieldIds.acknowledgementGoal} className="mb-1 block text-[13px] font-medium text-slate-700">
                  Investment goal
                </label>
                <select
                  id={fieldIds.acknowledgementGoal}
                  value={crq.acknowledgementGoal ?? ""}
                  onChange={(e) => patch({ acknowledgementGoal: (e.target.value || null) as JointInvestmentGoal | null })}
                  className="h-10 w-full rounded-[7px] border border-slate-300 bg-white px-2.5 text-[15px]"
                >
                  <option value="">Select…</option>
                  {form.acknowledgement.goalChoices.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
                {errorFor(fieldIds.acknowledgementGoal) && (
                  <p className="mt-1 text-[12.5px] text-red-600">{errorFor(fieldIds.acknowledgementGoal)}</p>
                )}
              </div>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}

function Score({
  label,
  score,
  level,
  answered,
  total,
}: {
  label: string;
  score: number | null;
  level: string | null;
  answered: number;
  total: number;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#0B6165]">{label}</p>
      <p className="mt-0.5 text-[20px] font-semibold tabular-nums leading-tight text-slate-900">
        {score ?? "—"} <span className="text-[14px] font-medium text-slate-600">{level ?? ""}</span>
      </p>
      <p className="text-[12px] text-slate-600">
        {answered} of {total} answered
      </p>
    </div>
  );
}

function AckOption({ checked, onSelect, children }: { checked: boolean; onSelect: () => void; children: React.ReactNode }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-[8px] border px-3 py-2.5 text-[14px] leading-snug transition ${
        checked ? "border-[#0B6165] bg-[#EEF5F5]" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <input type="radio" name="crq-ack" checked={checked} onChange={onSelect} className="mt-0.5 h-4 w-4 accent-[#0B6165]" />
      <span className="text-slate-700">{children}</span>
    </label>
  );
}
