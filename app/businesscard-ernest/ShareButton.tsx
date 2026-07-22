"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

const CARD_URL = "https://automation-web-red.vercel.app/businesscard-ernest";

type Props = {
  fullName: string;
  title: string;
  company: string;
  className?: string;
  style?: React.CSSProperties;
};

export default function ShareButton({
  fullName,
  title,
  company,
  className,
  style,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    const shareData = {
      title: `${fullName} — ${title}`,
      text: `${fullName}, ${title} at ${company}`,
      url: CARD_URL,
    };

    // Prefer the native share sheet (mobile Safari/Chrome, some desktop).
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User dismissed the sheet — do nothing.
        if ((err as Error)?.name === "AbortError") return;
        // Anything else, fall through to clipboard.
      }
    }

    // Fallback: copy URL to clipboard.
    try {
      await navigator.clipboard.writeText(CARD_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Last-resort fallback for very old browsers — prompt with the URL.
      window.prompt("Copy this link:", CARD_URL);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      style={style}
      aria-label="Share card link"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          <span>Link copied</span>
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          <span>Share Card</span>
        </>
      )}
    </button>
  );
}
