"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { ANSWER_PAGE_COPY } from "@/lib/keybase-answer/copy";

/**
 * The question field.
 *
 * A textarea rather than an input, so a long question wraps instead of
 * scrolling out of sight, growing with its content up to a ceiling. Enter
 * submits and Shift+Enter starts a line, which is the convention for a field
 * that is usually one line but can be several.
 *
 * The privacy note under it is not decoration: this is a public form, and the
 * clearest moment to say "not your account number" is before it is typed.
 */
export default function FinancialQuestionInput({
  onSubmit,
  disabled = false,
  maxLength,
  autoFocus = false,
}: {
  onSubmit: (question: string) => void;
  disabled?: boolean;
  maxLength: number;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow to fit, up to roughly four lines.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 132)}px`;
  }, [value]);

  const ready = value.trim().length > 0 && !disabled;

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const question = value.trim();
    if (!question || disabled) return;
    onSubmit(question);
    setValue("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form onSubmit={submit} className="w-full">
      <label htmlFor="keybase-answer-question" className="sr-only">
        {ANSWER_PAGE_COPY.inputLabel}
      </label>
      <div className="flex items-end gap-3 rounded-[26px] border border-black/[0.08] bg-white px-5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_10px_28px_rgba(15,23,42,0.06)] transition-all duration-300 focus-within:border-[#006d6e]/35 focus-within:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_36px_rgba(15,23,42,0.09)] sm:px-6 sm:py-4">
        <textarea
          id="keybase-answer-question"
          ref={ref}
          rows={1}
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          maxLength={maxLength}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={ANSWER_PAGE_COPY.inputPlaceholder}
          aria-describedby="keybase-answer-privacy"
          className="max-h-[132px] min-h-[28px] flex-1 resize-none border-0 bg-transparent py-1.5 text-[16px] leading-[1.55] text-[#1f2a37] outline-none placeholder:text-[#9aa3ae] disabled:opacity-60 sm:text-[17px]"
        />
        <button
          type="submit"
          disabled={!ready}
          className="mb-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#0a1f33] text-white transition-all duration-300 enabled:hover:-translate-y-0.5 enabled:hover:bg-[#006d6e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006d6e] disabled:cursor-not-allowed disabled:bg-[#0a1f33]/22"
        >
          <span className="sr-only">Ask Keybase Answer</span>
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M1 7h11M8.5 3.5L12 7l-3.5 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <p
        id="keybase-answer-privacy"
        className="mt-3 px-2 text-[12.5px] leading-relaxed text-[#8a93a0]"
      >
        {ANSWER_PAGE_COPY.privacyHint}
      </p>
    </form>
  );
}
