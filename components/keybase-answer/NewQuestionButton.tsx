"use client";

/**
 * Back to the research state.
 *
 * There is no transcript to return to and no thread to leave — the previous
 * answer is simply cleared. Keybase Answer asks and answers one question at a
 * time on purpose.
 */
export default function NewQuestionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-3 rounded-full border border-[#0a1f33]/15 bg-white px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0a1f33] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#006d6e] hover:text-[#006d6e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006d6e]"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path
          d="M7 1.6v10.8M1.6 7h10.8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      {label}
    </button>
  );
}
