"use client";

/**
 * The Client Risk Questionnaire, in any of its three printed editions
 * (individual, joint, corporate — see lib/risk-questionnaire/forms.ts).
 *
 * Controlled: the parent owns the answers. On its own page that is a small
 * wrapper; in the new-account workspace it is the workspace, which keeps the
 * fields the CRQ shares with the NAAF in step.
 *
 * Layout breakpoints are container queries (@xl:, @4xl:) rather than viewport
 * ones, so the form lays itself out for the space it is given — the full page,
 * or half of a split view.
 */

import Image from "next/image";
import { useMemo, useState } from "react";
import { Printer } from "lucide-react";

import { CAPACITY_SUMMARY_INSTRUCTION, TOLERANCE_SUMMARY_INSTRUCTION, SECTION_LABELS } from "@/lib/risk-questionnaire/config";
import type { CrqFormDefinition } from "@/lib/risk-questionnaire/forms";
import { deriveRiskProfile } from "@/lib/risk-questionnaire/scoring";
import {
  buildSubmission,
  submitRiskQuestionnaire,
  type SubmitResult,
} from "@/lib/risk-questionnaire/submission";
import { fieldIds, validateQuestionnaire } from "@/lib/risk-questionnaire/validation";
import type {
  AcknowledgementType,
  InvestmentCheckFrequency,
  JointInvestmentGoal,
  QuestionnaireState,
  ScoredQuestionId,
} from "@/lib/risk-questionnaire/types";

import PriorityRanking from "./PriorityRanking";
import QuestionCard, { type QuestionNote } from "./QuestionCard";
import RiskProfile from "./RiskProfile";
import ScoreSummary from "./ScoreSummary";
import SignatureField from "./SignatureField";
import UnscoredChoice from "./UnscoredChoice";
import { DateField, FieldError, RuledField, SectionBar } from "./ui";

/** Moves keyboard focus to the first thing the client still has to fix. */
function focusField(fieldId: string) {
  const element = document.getElementById(fieldId);
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  const focusable =
    element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
      ? element
      : element.querySelector<HTMLElement>("input, textarea, select, button, canvas");
  focusable?.focus({ preventScroll: true });
}

export default function ClientRiskQuestionnaire({
  form,
  state,
  onChange,
  answerNotes,
  onPrint,
}: {
  form: CrqFormDefinition;
  state: QuestionnaireState;
  onChange: (update: (prev: QuestionnaireState) => QuestionnaireState) => void;
  /** Per-question lines shown under the heading, e.g. "Filled from the NAAF". */
  answerNotes?: Partial<Record<ScoredQuestionId, QuestionNote>>;
  /** Overrides the print button, for pages that show more than one form. */
  onPrint?: () => void;
}) {
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const joint = form.variant === "joint";
  const corporate = form.variant === "corporate";

  const profile = useMemo(() => deriveRiskProfile(state.answers, form), [state.answers, form]);

  // The single source of truth for what is still missing. Surfaced only after
  // a submit attempt, then kept live so messages clear as fields are fixed.
  const outstanding = useMemo(() => validateQuestionnaire(state, form), [state, form]);
  const errors = showErrors ? outstanding : [];
  const errorFor = (fieldId: string) => errors.find((e) => e.fieldId === fieldId)?.message;

  const answeredCount = profile.capacity.answered + profile.tolerance.answered;
  const totalQuestions = profile.capacity.total + profile.tolerance.total;
  const complete = outstanding.length === 0;

  const patch = (changes: Partial<QuestionnaireState>) => onChange((prev) => ({ ...prev, ...changes }));

  const selectAnswer = (questionId: ScoredQuestionId, optionId: string) =>
    onChange((prev) => ({
      ...prev,
      // Replacing the key replaces the points: there is no accumulation here.
      answers: { ...prev.answers, [questionId]: optionId },
    }));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowErrors(true);
    setResult(null);

    if (outstanding.length > 0) {
      focusField(outstanding[0].fieldId);
      return;
    }

    const payload = buildSubmission(state, form);
    if (!payload) {
      setResult({ ok: false, stored: false, error: "The questionnaire is incomplete." });
      return;
    }

    setSubmitting(true);
    try {
      setResult(await submitRiskQuestionnaire(payload));
    } catch (err) {
      setResult({
        ok: false,
        stored: false,
        error: err instanceof Error ? err.message : "Submission failed.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (id: ScoredQuestionId) => {
    const question = form.byId[id];
    return (
      <div key={id} className={question.chart ? "crq-question-wide @4xl:col-span-2" : undefined}>
        <QuestionCard
          question={question}
          fieldId={fieldIds.question(id)}
          selectedOptionId={state.answers[id]}
          onSelect={selectAnswer}
          error={errorFor(fieldIds.question(id))}
          note={answerNotes?.[id]}
        />
      </div>
    );
  };

  const nameField = (id: string, label: string, value: string, key: "accountHolderName" | "jointHolderName") => (
    <div>
      <RuledField
        id={id}
        label={label}
        value={value}
        onChange={(v) => patch({ [key]: v })}
        invalid={Boolean(errorFor(id))}
        autoComplete={corporate ? "organization" : "name"}
      />
      {errorFor(id) && <FieldError id={`${id}-error`} message={errorFor(id)!} />}
    </div>
  );

  const signatureRow = (
    signatureId: string,
    dateId: string,
    label: string,
    signature: string | null,
    date: string,
    set: (changes: Partial<QuestionnaireState>) => void,
    keys: { signature: keyof QuestionnaireState; date: keyof QuestionnaireState },
  ) => (
    <div className="crq-sign-row grid gap-5 @4xl:grid-cols-[minmax(0,1fr)_220px]">
      <SignatureField
        id={signatureId}
        label={label}
        value={signature}
        onChange={(v) => set({ [keys.signature]: v })}
        invalid={Boolean(errorFor(signatureId))}
        error={errorFor(signatureId)}
      />
      <div>
        <DateField
          id={dateId}
          label="Date:"
          value={date}
          onChange={(v) => set({ [keys.date]: v })}
          invalid={Boolean(errorFor(dateId))}
        />
        {errorFor(dateId) && <FieldError id={`${dateId}-error`} message={errorFor(dateId)!} />}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="crq-root @container mx-auto max-w-[1120px]">
      {/* Restrained progress strip. The authoritative figures live in the
          Risk Profile Summary, not up here. */}
      <nav
        aria-label="Questionnaire progress"
        className="crq-no-print sticky top-0 z-20 -mx-4 mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur @xl:mx-0 @xl:rounded-t-[6px]"
      >
        <p className="text-[13px] font-medium text-slate-600">
          <span className="tabular-nums text-[#0B6165]">
            {answeredCount} of {totalQuestions}
          </span>{" "}
          scored questions completed
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
          <a className="text-slate-500 underline-offset-2 hover:text-[#0B6165] hover:underline" href="#crq-capacity">
            Risk Capacity
          </a>
          <a className="text-slate-500 underline-offset-2 hover:text-[#0B6165] hover:underline" href="#crq-tolerance">
            Risk Tolerance
          </a>
          <a className="text-slate-500 underline-offset-2 hover:text-[#0B6165] hover:underline" href="#crq-summary">
            Summary &amp; Acknowledgement
          </a>
        </div>
      </nav>

      <div className="crq-paper overflow-hidden rounded-[6px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {/* ---------------------------------------------------------- Header */}
        <header className="px-4 pt-5 @xl:px-7">
          <div className="flex flex-col gap-4 @xl:flex-row @xl:items-center @xl:justify-between">
            <Image
              src="/keybase-logo-nobg.png"
              alt="Keybase Financial Group"
              width={556}
              height={124}
              priority
              className="h-[42px] w-auto self-start @xl:self-auto"
            />
            <div className="@xl:text-center">
              <h1 className="text-[24px] font-semibold tracking-tight text-[#111111] @xl:text-[30px]">
                {form.title}
              </h1>
              <p className="text-[15px] font-bold text-[#111111] @xl:text-[17px]">{form.subtitle}</p>
            </div>
            <div aria-hidden className="hidden w-[150px] @5xl:block" />
          </div>

          <div className={`mt-5 grid gap-4 ${joint ? "@xl:grid-cols-3" : "@xl:grid-cols-2"}`}>
            {nameField(fieldIds.accountHolderName, form.primaryNameLabel, state.accountHolderName, "accountHolderName")}
            {joint &&
              form.jointNameLabel &&
              nameField(fieldIds.jointHolderName, form.jointNameLabel, state.jointHolderName, "jointHolderName")}
            <RuledField
              id={fieldIds.clientId}
              label="Client ID"
              value={state.clientId}
              onChange={(v) => patch({ clientId: v })}
            />
          </div>

          <div className="mt-5 space-y-2.5 border-t-[3px] border-[#0B6165] pt-3.5">
            {form.introParagraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 24)} className="text-[15px] leading-relaxed text-[#111111]">
                {paragraph}
              </p>
            ))}
          </div>
        </header>

        {/* -------------------------------------------------- Risk Capacity */}
        <div className="mt-5">
          <SectionBar id="crq-capacity" title={SECTION_LABELS.capacity} />
        </div>

        <div className="crq-question-grid grid gap-x-10 px-1 py-2 @xl:px-3 @4xl:grid-cols-2">
          <PriorityRanking
            question={form.priorityQuestion}
            instruction={form.priorityInstruction}
            values={state.portfolioPriorities}
            onChange={(portfolioPriorities) => patch({ portfolioPriorities })}
          />
          <UnscoredChoice
            question={form.investmentCheckQuestion}
            value={state.investmentCheckFrequency}
            onSelect={(optionId) =>
              patch({ investmentCheckFrequency: optionId as InvestmentCheckFrequency })
            }
          />
          {form.capacityIds.map(renderQuestion)}
        </div>

        {/* ------------------------------------------------- Risk Tolerance */}
        <div className="mt-3">
          <SectionBar id="crq-tolerance" title={SECTION_LABELS.tolerance} startsPrintPage />
        </div>

        <div className="crq-question-grid grid gap-x-10 px-1 py-2 @xl:px-3 @4xl:grid-cols-2">
          {form.toleranceIds.map(renderQuestion)}
        </div>

        {/* --------------------------------------------- Risk Profile Summary */}
        <div className="mt-3">
          <SectionBar id="crq-summary" title="RISK PROFILE SUMMARY" startsPrintPage />
        </div>

        <div className="px-4 py-5 @xl:px-7">
          <ScoreSummary
            title="Risk Capacity Scoring Summary"
            instruction={CAPACITY_SUMMARY_INSTRUCTION}
            questionIds={form.capacityIds}
            answers={state.answers}
            section={profile.capacity}
            sheet={form}
          />
          <ScoreSummary
            title="Risk Tolerance Scoring Summary"
            instruction={TOLERANCE_SUMMARY_INSTRUCTION}
            questionIds={form.toleranceIds}
            answers={state.answers}
            section={profile.tolerance}
            sheet={form}
          />

          <RiskProfile profile={profile} form={form} />

          <ProfileReadout profile={profile} rankingLabel={form.rankingLabel} corporate={corporate} />

          {/* ------------------------------------------------------- Notes */}
          <section className="mt-7">
            <label htmlFor="crq-notes" className="text-[17px] font-bold text-[#111111]">
              Notes:
            </label>
            <textarea
              id="crq-notes"
              name="crq-notes"
              rows={5}
              value={state.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              className="crq-notes mt-2 w-full resize-y whitespace-pre-wrap rounded-[5px] border border-slate-300 bg-white px-3 py-2.5 text-[16px] leading-relaxed text-[#111111] outline-none transition focus-visible:border-[#0B6165] focus-visible:ring-2 focus-visible:ring-[#0B6165]/35"
            />
          </section>

          {/* --------------------------------------------- Acknowledgement */}
          <fieldset id={fieldIds.acknowledgement} className="mt-7 scroll-mt-28">
            <legend className="text-[17px] font-bold text-[#111111]">
              Client Acknowledgement:
            </legend>

            <div className="mt-2.5 flex flex-col gap-1.5">
              <AcknowledgementOption
                value="all_accounts"
                checked={state.acknowledgementType === "all_accounts"}
                onSelect={() => patch({ acknowledgementType: "all_accounts" })}
              >
                {form.acknowledgement.all}
              </AcknowledgementOption>

              <AcknowledgementOption
                value="single_account"
                checked={state.acknowledgementType === "single_account"}
                onSelect={() => patch({ acknowledgementType: "single_account" })}
              >
                <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
                  {form.acknowledgement.singlePrefix}
                  <input
                    id={fieldIds.acknowledgementAccountName}
                    name={fieldIds.acknowledgementAccountName}
                    type="text"
                    aria-label="Account name this questionnaire applies to"
                    placeholder="account name"
                    value={state.acknowledgementAccountName}
                    disabled={state.acknowledgementType !== "single_account"}
                    aria-invalid={
                      Boolean(errorFor(fieldIds.acknowledgementAccountName)) || undefined
                    }
                    onChange={(e) => patch({ acknowledgementAccountName: e.target.value })}
                    className={`h-9 w-[210px] scroll-mt-28 rounded-[4px] border bg-white px-2.5 text-[16px] text-[#111111] outline-none transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#0B6165]/35 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 ${
                      errorFor(fieldIds.acknowledgementAccountName)
                        ? "border-red-500"
                        : "border-slate-300 focus-visible:border-[#0B6165]"
                    }`}
                  />
                  {form.acknowledgement.singleSuffix}
                  {form.acknowledgement.goalChoices && (
                    <>
                      {/* Printed as "(Balanced/Growth/High Growth)" to be circled. */}
                      <select
                        id={fieldIds.acknowledgementGoal}
                        name={fieldIds.acknowledgementGoal}
                        aria-label="Investment goal for this joint account"
                        value={state.acknowledgementGoal ?? ""}
                        disabled={state.acknowledgementType !== "single_account"}
                        aria-invalid={Boolean(errorFor(fieldIds.acknowledgementGoal)) || undefined}
                        onChange={(e) =>
                          patch({ acknowledgementGoal: (e.target.value || null) as JointInvestmentGoal | null })
                        }
                        className={`h-9 scroll-mt-28 rounded-[4px] border bg-white px-2 text-[15px] text-[#111111] outline-none disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 ${
                          errorFor(fieldIds.acknowledgementGoal) ? "border-red-500" : "border-slate-300"
                        }`}
                      >
                        <option value="">(Balanced/Growth/High Growth)</option>
                        {form.acknowledgement.goalChoices.map((goal) => (
                          <option key={goal} value={goal}>
                            {goal}
                          </option>
                        ))}
                      </select>
                      {form.acknowledgement.goalTail}
                    </>
                  )}
                </span>
              </AcknowledgementOption>
            </div>

            {[fieldIds.acknowledgement, fieldIds.acknowledgementAccountName, fieldIds.acknowledgementGoal].map(
              (id) => errorFor(id) && <FieldError key={id} id={`${id}-error`} message={errorFor(id)!} />,
            )}
          </fieldset>

          {/* ------------------------------------------------- Signatures */}
          <section className="mt-8 flex flex-col gap-6 border-t-[3px] border-[#0B6165] pt-5">
            <h3 className="sr-only">Signatures</h3>

            {signatureRow(
              fieldIds.accountHolderSignature,
              fieldIds.accountHolderDate,
              form.primarySignatureLabel,
              state.accountHolderSignature,
              state.accountHolderDate,
              patch,
              { signature: "accountHolderSignature", date: "accountHolderDate" },
            )}
            {joint &&
              form.jointSignatureLabel &&
              signatureRow(
                fieldIds.jointHolderSignature,
                fieldIds.jointHolderDate,
                form.jointSignatureLabel,
                state.jointHolderSignature,
                state.jointHolderDate,
                patch,
                { signature: "jointHolderSignature", date: "jointHolderDate" },
              )}
            {form.signingNote && (
              <p className="-mt-3 text-[13px] italic text-[#333333]">{form.signingNote}</p>
            )}

            <div className="border-t border-slate-200 pt-5">
              <p className="crq-no-print mb-3 text-[13px] text-slate-500">
                Completed by the advisor. Not required for the client to submit their portion.
              </p>
              <div className="crq-advisor-row grid gap-5 @4xl:grid-cols-[220px_minmax(0,1fr)_220px]">
                <RuledField
                  id="crq-advisor-name"
                  label="Advisor's Name:"
                  value={state.advisorName}
                  onChange={(advisorName) => patch({ advisorName })}
                />
                <SignatureField
                  id="crq-advisor-signature"
                  label="Advisor's Signature:"
                  value={state.advisorSignature}
                  onChange={(advisorSignature) => patch({ advisorSignature })}
                />
                <DateField
                  id="crq-advisor-date"
                  label="Date:"
                  value={state.advisorDate}
                  onChange={(advisorDate) => patch({ advisorDate })}
                />
              </div>
            </div>
          </section>

          {/* ----------------------------------------------------- Actions */}
          <div className="crq-no-print mt-8 border-t border-slate-200 pt-5">
            {showErrors && errors.length > 0 && (
              <div
                role="alert"
                className="mb-4 rounded-[6px] border border-red-300 bg-red-50 px-4 py-3"
              >
                <p className="text-[14px] font-semibold text-red-800">
                  {errors.length} item{errors.length === 1 ? "" : "s"} still need
                  {errors.length === 1 ? "s" : ""} attention before this questionnaire can be
                  submitted.
                </p>
                <ul className="mt-2 flex flex-col gap-1">
                  {errors.slice(0, 6).map((error) => (
                    <li key={error.fieldId}>
                      <button
                        type="button"
                        onClick={() => focusField(error.fieldId)}
                        className="text-left text-[13px] text-red-700 underline underline-offset-2 hover:text-red-900"
                      >
                        {error.message}
                      </button>
                    </li>
                  ))}
                  {errors.length > 6 && (
                    <li className="text-[13px] text-red-700">
                      …and {errors.length - 6} more.
                    </li>
                  )}
                </ul>
              </div>
            )}

            {result && <SubmitNotice result={result} />}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center rounded-[6px] bg-[#0B6165] px-6 text-[15px] font-semibold text-white transition hover:bg-[#08504f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit questionnaire"}
              </button>
              <button
                type="button"
                onClick={() => (onPrint ? onPrint() : window.print())}
                disabled={!complete}
                title={
                  complete
                    ? undefined
                    : "Complete every required field to print the finished questionnaire."
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[6px] border border-slate-300 bg-white px-5 text-[15px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer aria-hidden className="h-4 w-4" />
                Print / Save as PDF
              </button>
            </div>
          </div>
        </div>

        <footer className="border-t border-slate-200 px-4 py-3 @xl:px-7">
          <p className="text-[12px] text-slate-400">{form.formVersion}</p>
        </footer>
      </div>
    </form>
  );
}

/** A checkbox-styled radio for the two mutually exclusive acknowledgements. */
function AcknowledgementOption({
  value,
  checked,
  onSelect,
  children,
}: {
  value: AcknowledgementType;
  checked: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className="crq-option flex cursor-pointer items-start gap-3 rounded-[5px] border border-slate-200 bg-white px-3 py-2.5 transition hover:border-[#7AA8AB] has-[input:checked]:border-[#0B6165] has-[input:checked]:bg-[#EEF5F5]"
    >
      <span className="relative mt-[3px] flex h-[19px] w-[19px] shrink-0 items-center justify-center">
        <input
          type="radio"
          name="crq-acknowledgement-type"
          value={value}
          checked={checked}
          onChange={onSelect}
          className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-[3px] border-[1.5px] border-[#7AA8AB] bg-white transition checked:border-[#0B6165] checked:bg-[#0B6165] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B6165]"
        />
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none relative h-[13px] w-[13px] text-white opacity-0 transition-opacity peer-checked:opacity-100"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <span className="text-[16px] leading-relaxed text-[#111111]">{children}</span>
    </label>
  );
}

/** The plain-language readout under the two printed tables. */
function ProfileReadout({
  profile,
  rankingLabel,
  corporate,
}: {
  profile: ReturnType<typeof deriveRiskProfile>;
  rankingLabel: string;
  corporate: boolean;
}) {
  const cells: { label: string; score: number | null; level: string | null }[] = [
    { label: "Risk Capacity", score: profile.capacity.score, level: profile.capacityLevel },
    { label: "Risk Tolerance", score: profile.tolerance.score, level: profile.toleranceLevel },
  ];

  return (
    <section className="mt-6 rounded-[6px] border border-[#0B6165]/25 bg-[#F4F9F9] px-4 py-4">
      <div className="grid gap-4 @xl:grid-cols-3">
        {cells.map((cell) => (
          <div key={cell.label}>
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#0B6165]">
              {cell.label}
            </p>
            <p className="mt-1 text-[26px] font-semibold tabular-nums leading-none text-[#111111]">
              {cell.score ?? "—"}
            </p>
            <p className="mt-1 text-[14px] text-[#333333]">{cell.level ?? "Incomplete"}</p>
          </div>
        ))}
        <div className="border-t border-[#0B6165]/20 pt-4 @xl:border-l @xl:border-t-0 @xl:pl-4 @xl:pt-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#0B6165]">
            {rankingLabel}
          </p>
          <p className="mt-1 text-[24px] font-bold uppercase leading-tight text-[#0B6165]">
            {profile.finalRiskRanking ?? "—"}
          </p>
          <p className="mt-1 text-[13px] text-[#333333]">
            {profile.finalRiskRanking
              ? `The lower of ${corporate ? "the entity's" : "your"} two risk levels.`
              : "Complete Questions 1–12 to determine the ranking."}
          </p>
        </div>
      </div>
    </section>
  );
}

/** Outcome of a submit attempt, including whether the record was persisted. */
function SubmitNotice({ result }: { result: SubmitResult }) {
  if (!result.ok) {
    return (
      <div role="alert" className="mb-4 rounded-[6px] border border-red-300 bg-red-50 px-4 py-3">
        <p className="text-[14px] font-semibold text-red-800">Submission failed</p>
        <p className="mt-1 text-[13px] text-red-700">{result.error}</p>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="mb-4 rounded-[6px] border border-emerald-300 bg-emerald-50 px-4 py-3"
    >
      <p className="text-[14px] font-semibold text-emerald-900">
        Questionnaire submitted{result.stored ? " and recorded." : "."}
      </p>
      {result.recalculated && (
        <p className="mt-1 text-[13px] text-emerald-800">
          Verified server-side: Risk Capacity {result.recalculated.riskCapacityScore}, Risk
          Tolerance {result.recalculated.riskToleranceScore}, risk ranking{" "}
          {result.recalculated.finalRiskRanking ?? "requires advisor review"}.
        </p>
      )}
      {!result.stored && (
        <p className="mt-1 text-[13px] text-emerald-800">
          Storage is not configured on this deployment, so the record was not saved to the
          database. Print or save a PDF copy before leaving this page.
        </p>
      )}
    </div>
  );
}
