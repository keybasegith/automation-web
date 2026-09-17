"use client";

import { Check } from "lucide-react";

import type { UnscoredQuestion } from "@/lib/risk-questionnaire/types";
import { Instruction, QuestionHeading } from "./ui";

/**
 * A single-select question that carries no point value on the source form —
 * currently just "How often do you check the value of your investments?".
 * Captured for the advisor's record; never added to a section total.
 */
export default function UnscoredChoice({
  question,
  value,
  onSelect,
}: {
  question: UnscoredQuestion;
  value: string | null;
  onSelect: (optionId: string) => void;
}) {
  return (
    <fieldset className="crq-question px-4 py-4">
      <legend className="sr-only">{question.question}</legend>
      <QuestionHeading as="h3">{question.question}</QuestionHeading>
      <Instruction>{question.instruction}</Instruction>

      <div className="mt-2.5 flex flex-col gap-1.5">
        {question.options.map((option) => {
          const inputId = `crq-${question.id}-${option.id}`;
          return (
            <label
              key={option.id}
              htmlFor={inputId}
              className="crq-option flex cursor-pointer items-start gap-3 rounded-[5px] border border-slate-200 bg-white px-3 py-2.5 transition hover:border-[#7AA8AB] has-[input:checked]:border-[#0B6165] has-[input:checked]:bg-[#EEF5F5]"
            >
              <span className="relative mt-[3px] flex h-[19px] w-[19px] shrink-0 items-center justify-center">
                <input
                  id={inputId}
                  name={question.id}
                  type="radio"
                  value={option.id}
                  checked={value === option.id}
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
                {option.letter}) {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
