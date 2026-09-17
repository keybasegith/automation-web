"use client";

import type { TranscriptOptions } from "@/lib/transcript-formatter/format";

interface OptionDefinition {
  key: keyof TranscriptOptions;
  label: string;
  hint: string;
}

/** The five cleaning rules, in the order they read most naturally. */
const OPTIONS: readonly OptionDefinition[] = [
  {
    key: "removeTimestamps",
    label: "Remove timestamps",
    hint: "Timestamp lines and prefixes. Clocks inside a sentence are left alone.",
  },
  {
    key: "keepSpeakerNames",
    label: "Keep speaker names",
    hint: "Keep the attribution in front of each segment.",
  },
  {
    key: "mergeSameSpeaker",
    label: "Merge consecutive same-speaker lines",
    hint: "Fold a speaker's neighbouring segments into one paragraph.",
  },
  {
    key: "removeDuplicateBlankLines",
    label: "Remove duplicate blank lines",
    hint: "One blank line between segments instead of the source's own spacing.",
  },
  {
    key: "fixLineBreaks",
    label: "Fix line breaks",
    hint: "Rejoin sentences broken across lines by a narrow copy window.",
  },
];

export default function TranscriptOptionsPanel({
  options,
  onChange,
  disabled,
}: {
  options: TranscriptOptions;
  onChange: (key: keyof TranscriptOptions, value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
      <legend className="sr-only">Cleaning options</legend>
      {OPTIONS.map((option) => (
        <label
          key={option.key}
          className="flex cursor-pointer items-start gap-2.5 text-[13px] text-slate-700"
        >
          <input
            type="checkbox"
            checked={options[option.key]}
            disabled={disabled}
            onChange={(event) => onChange(option.key, event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]"
          />
          <span className="min-w-0">
            <span className="font-medium text-slate-900">{option.label}</span>
            <span className="mt-0.5 block text-[12px] leading-relaxed text-slate-500">
              {option.hint}
            </span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
