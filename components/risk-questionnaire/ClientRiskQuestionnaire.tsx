"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Printer } from "lucide-react";

import {
  ACKNOWLEDGEMENT_ALL_ACCOUNTS,
  ACKNOWLEDGEMENT_SINGLE_ACCOUNT_PREFIX,
  ACKNOWLEDGEMENT_SINGLE_ACCOUNT_SUFFIX,
  CAPACITY_QUESTION_IDS,
  CAPACITY_SUMMARY_INSTRUCTION,
  FORM_SUBTITLE,
  FORM_TITLE,
  FORM_VERSION,
  INTRO_PARAGRAPHS,
  INVESTMENT_CHECK_QUESTION,
  PORTFOLIO_PRIORITIES,
  QUESTIONS_BY_ID,
  SECTION_LABELS,
  TOLERANCE_QUESTION_IDS,
  TOLERANCE_SUMMARY_INSTRUCTION,
} from "@/lib/risk-questionnaire/config";
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
  PortfolioPriorityId,
  QuestionnaireState,
  ScoredQuestionId,
} from "@/lib/risk-questionnaire/types";

import PriorityRanking from "./PriorityRanking";
import QuestionCard from "./QuestionCard";
import RiskProfile from "./RiskProfile";
import ScoreSummary from "./ScoreSummary";
import SignatureField from "./SignatureField";
import UnscoredChoice from "./UnscoredChoice";
import { DateField, FieldError, RuledField, SectionBar } from "./ui";

const EMPTY_PRIORITIES = Object.fromEntries(
  PORTFOLIO_PRIORITIES.map((p) => [p.id, null]),
) as Record<PortfolioPriorityId, number | null>;

const INITIAL_STATE: QuestionnaireState = {
  accountHolderName: "",
  clientId: "",
  portfolioPriorities: EMPTY_PRIORITIES,
  investmentCheckFrequency: null,
  answers: {},
  notes: "",
  acknowledgementType: null,
  acknowledgementAccountName: "",
  accountHolderSignature: null,
  accountHolderDate: "",
  advisorName: "",
  advisorSignature: null,
  advisorDate: "",
};

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

export default function ClientRiskQuestionnaire() {
  // Deliberately not persisted to localStorage: this is a client's financial
  // profile, and the application has no encrypted draft store to put it in.
  const [state, setState] = useState<QuestionnaireState>(INITIAL_STATE);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const profile = useMemo(() => deriveRiskProfile(state.answers), [state.answers]);

  // The single source of truth for what is still missing. Surfaced only after
  // a submit attempt, then kept live so messages clear as fields are fixed.
  const outstanding = useMemo(() => validateQuestionnaire(state), [state]);
  const errors = showErrors ? outstanding : [];
  const errorFor = (fieldId: string) => errors.find((e) => e.fieldId === fieldId)?.message;

  const answeredCount = profile.capacity.answered + profile.tolerance.answered;
  const totalQuestions = profile.capacity.total + profile.tolerance.total;
  const complete = outstanding.length === 0;

  const patch = (changes: Partial<QuestionnaireState>) =>
    setState((prev) => ({ ...prev, ...changes }));

  const selectAnswer = (questionId: ScoredQuestionId, optionId: string) =>
    setState((prev) => ({
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

    const payload = buildSubmission(state);
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
    const question = QUESTIONS_BY_ID[id];
    return (
      <div key={id} className={question.chart ? "crq-question-wide lg:col-span-2" : undefined}>
        <QuestionCard
          question={question}
          fieldId={fieldIds.question(id)}
          selectedOptionId={state.answers[id]}
          onSelect={selectAnswer}
          error={errorFor(fieldIds.question(id))}
        />
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="crq-root mx-auto max-w-[1120px]">
      {/* Restrained progress strip. The authoritative figures live in the
          Risk Profile Summary, not up here. */}
      <nav
        aria-label="Questionnaire progress"
        className="crq-no-print sticky top-0 z-20 -mx-4 mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur sm:mx-0 sm:rounded-t-[6px]"
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
        <header className="px-4 pt-5 sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Image
              src="/keybase-logo-nobg.png"
              alt="Keybase Financial Group"
              width={556}
              height={124}
              priority
              className="h-[42px] w-auto"
            />
            <div className="sm:text-center">
              <h1 className="text-[26px] font-semibold tracking-tight text-[#111111] sm:text-[32px]">
                {FORM_TITLE}
              </h1>
              <p className="text-[15px] font-bold text-[#111111] sm:text-[17px]">{FORM_SUBTITLE}</p>
            </div>
            <div aria-hidden className="hidden w-[150px] lg:block" />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <RuledField
                id={fieldIds.accountHolderName}
                label="Account Holder's Name"
                value={state.accountHolderName}
                onChange={(v) => patch({ accountHolderName: v })}
                invalid={Boolean(errorFor(fieldIds.accountHolderName))}
                autoComplete="name"
              />
              {errorFor(fieldIds.accountHolderName) && (
                <FieldError
                  id={`${fieldIds.accountHolderName}-error`}
                  message={errorFor(fieldIds.accountHolderName)!}
                />
              )}
            </div>
            <RuledField
              id={fieldIds.clientId}
              label="Client ID"
              value={state.clientId}
              onChange={(v) => patch({ clientId: v })}
            />
          </div>

          <div className="mt-5 space-y-2.5 border-t-[3px] border-[#0B6165] pt-3.5">
            {INTRO_PARAGRAPHS.map((paragraph) => (
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

        <div className="crq-question-grid grid gap-x-10 px-1 py-2 sm:px-3 lg:grid-cols-2">
          <PriorityRanking
            values={state.portfolioPriorities}
            onChange={(portfolioPriorities) => patch({ portfolioPriorities })}
          />
          <UnscoredChoice
            question={INVESTMENT_CHECK_QUESTION}
            value={state.investmentCheckFrequency}
            onSelect={(optionId) =>
              patch({ investmentCheckFrequency: optionId as InvestmentCheckFrequency })
            }
          />
          {CAPACITY_QUESTION_IDS.map(renderQuestion)}
        </div>

        {/* ------------------------------------------------- Risk Tolerance */}
        <div className="mt-3">
          <SectionBar id="crq-tolerance" title={SECTION_LABELS.tolerance} startsPrintPage />
        </div>

        <div className="crq-question-grid grid gap-x-10 px-1 py-2 sm:px-3 lg:grid-cols-2">
          {TOLERANCE_QUESTION_IDS.map(renderQuestion)}
        </div>

        {/* --------------------------------------------- Risk Profile Summary */}
        <div className="mt-3">
          <SectionBar id="crq-summary" title="RISK PROFILE SUMMARY" startsPrintPage />
        </div>

        <div className="px-4 py-5 sm:px-7">
          <ScoreSummary
            title="Risk Capacity Scoring Summary"
            instruction={CAPACITY_SUMMARY_INSTRUCTION}
            questionIds={CAPACITY_QUESTION_IDS}
            answers={state.answers}
            section={profile.capacity}
          />
          <ScoreSummary
            title="Risk Tolerance Scoring Summary"
            instruction={TOLERANCE_SUMMARY_INSTRUCTION}
            questionIds={TOLERANCE_QUESTION_IDS}
            answers={state.answers}
            section={profile.tolerance}
          />

          <RiskProfile profile={profile} />

          <ProfileReadout profile={profile} />

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
                {ACKNOWLEDGEMENT_ALL_ACCOUNTS}
              </AcknowledgementOption>

              <AcknowledgementOption
                value="single_account"
                checked={state.acknowledgementType === "single_account"}
                onSelect={() => patch({ acknowledgementType: "single_account" })}
              >
                <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
                  {ACKNOWLEDGEMENT_SINGLE_ACCOUNT_PREFIX}
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
                  {ACKNOWLEDGEMENT_SINGLE_ACCOUNT_SUFFIX}
                </span>
              </AcknowledgementOption>
            </div>

            {errorFor(fieldIds.acknowledgement) && (
              <FieldError
                id={`${fieldIds.acknowledgement}-error`}
                message={errorFor(fieldIds.acknowledgement)!}
              />
            )}
            {errorFor(fieldIds.acknowledgementAccountName) && (
              <FieldError
                id={`${fieldIds.acknowledgementAccountName}-error`}
                message={errorFor(fieldIds.acknowledgementAccountName)!}
              />
            )}
          </fieldset>

          {/* ------------------------------------------------- Signatures */}
          <section className="mt-8 border-t-[3px] border-[#0B6165] pt-5">
            <h3 className="sr-only">Signatures</h3>

            <div className="crq-sign-row grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
              <SignatureField
                id={fieldIds.accountHolderSignature}
                label="Account Holder's Signature:"
                value={state.accountHolderSignature}
                onChange={(accountHolderSignature) => patch({ accountHolderSignature })}
                invalid={Boolean(errorFor(fieldIds.accountHolderSignature))}
                error={errorFor(fieldIds.accountHolderSignature)}
              />
              <div>
                <DateField
                  id={fieldIds.accountHolderDate}
                  label="Date:"
                  value={state.accountHolderDate}
                  onChange={(accountHolderDate) => patch({ accountHolderDate })}
                  invalid={Boolean(errorFor(fieldIds.accountHolderDate))}
                />
                {errorFor(fieldIds.accountHolderDate) && (
                  <FieldError
                    id={`${fieldIds.accountHolderDate}-error`}
                    message={errorFor(fieldIds.accountHolderDate)!}
                  />
                )}
              </div>
            </div>

            <div className="mt-7 border-t border-slate-200 pt-5">
              <p className="crq-no-print mb-3 text-[13px] text-slate-500">
                Completed by the advisor. Not required for the client to submit their portion.
              </p>
              <div className="crq-advisor-row grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)_220px]">
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
                onClick={() => window.print()}
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

        <footer className="border-t border-slate-200 px-4 py-3 sm:px-7">
          <p className="text-[12px] text-slate-400">{FORM_VERSION}</p>
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
function ProfileReadout({ profile }: { profile: ReturnType<typeof deriveRiskProfile> }) {
  const cells: { label: string; score: number | null; level: string | null }[] = [
    { label: "Risk Capacity", score: profile.capacity.score, level: profile.capacityLevel },
    { label: "Risk Tolerance", score: profile.tolerance.score, level: profile.toleranceLevel },
  ];

  return (
    <section className="mt-6 rounded-[6px] border border-[#0B6165]/25 bg-[#F4F9F9] px-4 py-4">
      <div className="grid gap-4 sm:grid-cols-3">
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
        <div className="border-t border-[#0B6165]/20 pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#0B6165]">
            Your Risk Ranking
          </p>
          <p className="mt-1 text-[24px] font-bold uppercase leading-tight text-[#0B6165]">
            {profile.finalRiskRanking ?? "—"}
          </p>
          <p className="mt-1 text-[13px] text-[#333333]">
            {profile.finalRiskRanking
              ? "The lower of your two risk levels."
              : "Complete Questions 1–12 to determine your ranking."}
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
