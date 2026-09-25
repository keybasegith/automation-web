"use client";

import Image from "next/image";
import { Check } from "lucide-react";

import type { RiskQuestion } from "@/lib/risk-questionnaire/types";

export interface QuestionNote {
  text: string;
  /** "differs" when the answer disagrees with what the other form implies. */
  tone: "linked" | "differs";
}
import { FieldError, Instruction, QuestionHeading } from "./ui";

/**
 * One answer row. A real <input type="radio"> carries the semantics and the
 * focus ring; the square styling only approximates the printed checkbox. The
 * whole row is a <label>, so the answer text is a click target.
 */
export function RadioOption({
  name,
  option,
  checked,
  onSelect,
}: {
  name: string;
  option: { id: string; letter: string; label: string; pointsLabel: string };
  checked: boolean;
  onSelect: (optionId: string) => void;
}) {
  return (
    <label
      htmlFor={option.id}
      className="crq-option group flex cursor-pointer items-start gap-3 rounded-[5px] border border-slate-200 bg-white px-3 py-2.5 transition hover:border-[#7AA8AB] has-[input:checked]:border-[#0B6165] has-[input:checked]:bg-[#EEF5F5]"
    >
      <span className="relative mt-[3px] flex h-[19px] w-[19px] shrink-0 items-center justify-center">
        <input
          id={option.id}
          name={name}
          type="radio"
          value={option.id}
          checked={checked}
          onChange={() => onSelect(option.id)}
          className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-[3px] border-[1.5px] border-[#7AA8AB] bg-white transition checked:border-[#0B6165] checked:bg-[#0B6165] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B6165]"
        />
        <Check
          aria-hidden
          strokeWidth={3.5}
          className="pointer-events-none relative h-[13px] w-[13px] text-white opacity-0 transition-opacity peer-checked:opacity-100"
        />
      </span>
      <span className="text-[16px] leading-snug text-[#111111]">
        {option.letter}) {option.label}{" "}
        <span className="whitespace-nowrap text-[#333333]">{option.pointsLabel}</span>
      </span>
    </label>
  );
}

/**
 * A numbered, scored question. Rendered as a fieldset so screen readers
 * announce the question text as the group label for its options.
 */
export default function QuestionCard({
  question,
  fieldId,
  selectedOptionId,
  onSelect,
  error,
  note,
}: {
  question: RiskQuestion;
  fieldId: string;
  selectedOptionId: string | undefined;
  onSelect: (questionId: RiskQuestion["id"], optionId: string) => void;
  error?: string;
  /** A short line under the heading, e.g. that the answer was filled from the NAAF. */
  note?: QuestionNote;
}) {
  const errorId = `${fieldId}-error`;

  return (
    <fieldset
      id={fieldId}
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? true : undefined}
      className={`crq-question scroll-mt-28 rounded-[6px] border px-4 py-4 transition ${
        error ? "border-red-400 bg-red-50/40" : "border-transparent"
      }`}
    >
      <legend className="sr-only">
        Question {question.number}. {question.question}
      </legend>

      <QuestionHeading as="h3">
        {question.number}.{" "}
        {question.question.split("\n").map((line, i) => (
          <span key={i} className={i > 0 ? "block" : undefined}>
            {line}
          </span>
        ))}
      </QuestionHeading>
      {note && (
        <p
          className={`crq-no-print mt-1 inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium ${
            note.tone === "differs" ? "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200" : "bg-[#EEF5F5] text-[#0B6165]"
          }`}
        >
          {note.text}
        </p>
      )}

      {/* A charted question puts the chart beside its answers on wide screens,
          the way the source form pairs them, instead of stacking a very tall
          image above the options. */}
      <div
        className={
          question.chart
            ? "crq-chart-layout mt-3 grid gap-x-8 gap-y-3 @3xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] @3xl:items-start"
            : undefined
        }
      >
        {question.chart && (
          <figure className="crq-chart overflow-hidden rounded-[4px] border border-slate-200 bg-white">
            <Image
              src={question.chart.src}
              alt={question.chart.alt}
              width={question.chart.width}
              height={question.chart.height}
              sizes="(max-width: 1024px) 100vw, 780px"
              className="h-auto w-full object-contain"
            />
          </figure>
        )}

        <div>
          <Instruction>{question.instruction}</Instruction>

          <div className="mt-2.5 flex flex-col gap-1.5">
            {question.options.map((option) => (
              <RadioOption
                key={option.id}
                name={question.id}
                option={option}
                checked={selectedOptionId === option.id}
                onSelect={(optionId) => onSelect(question.id, optionId)}
              />
            ))}
          </div>
        </div>
      </div>

      {error && <FieldError id={errorId} message={error} />}
    </fieldset>
  );
}
