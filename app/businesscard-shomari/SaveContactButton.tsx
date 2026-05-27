"use client";

import { useState } from "react";
import { Download, Check } from "lucide-react";
import { downloadVCard, type VCardData } from "./vcard";

type Props = {
  card: VCardData;
  className?: string;
  style?: React.CSSProperties;
};

export default function SaveContactButton({ card, className, style }: Props) {
  const [showHint, setShowHint] = useState(false);

  const handleClick = () => {
    downloadVCard(card);
    setShowHint(true);
    window.setTimeout(() => setShowHint(false), 8000);
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        className={className}
        style={style}
        aria-label="Save contact to phone"
      >
        {showHint ? (
          <>
            <Check className="h-4 w-4" />
            <span>Save Contact</span>
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            <span>Save Contact</span>
          </>
        )}
      </button>
      {showHint ? (
        <p
          role="status"
          className="text-center text-[11px] leading-snug text-slate-500 sm:text-[12px]"
        >
          Your phone will open a contact preview. Tap{" "}
          <span className="font-semibold text-slate-700">Create New Contact</span>{" "}
          or <span className="font-semibold text-slate-700">Save</span> to add it.
        </p>
      ) : null}
    </div>
  );
}
