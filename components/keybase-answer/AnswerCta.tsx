"use client";

import Link from "next/link";

import { trackClientEvent } from "@/lib/keybase-answer/client-analytics";

/**
 * The homepage call to action.
 *
 * A client component only so the click can be counted; it is a real <Link>, so
 * it navigates, opens in a new tab, and copies its address the way any other
 * link on the site does.
 */
export default function AnswerCta({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      onClick={() => trackClientEvent("keybase_answer_home_cta", { surface: "home" })}
      className="group inline-flex items-center gap-3 py-2 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#0a1f33] transition-colors duration-300 hover:text-[#006d6e] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#006d6e]"
    >
      {label}
      <svg
        width="22"
        height="10"
        viewBox="0 0 22 10"
        fill="none"
        aria-hidden="true"
        className="transition-transform duration-300 group-hover:translate-x-1.5"
      >
        <path
          d="M0 5h20M16 1l4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
