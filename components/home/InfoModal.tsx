"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * A footer legal link that opens its content in an accessible modal popup.
 * Handles Escape-to-close, backdrop dismissal, and body scroll locking.
 */
export default function InfoModal({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const titleId = `info-modal-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-semibold text-[#1a2433] transition-colors hover:text-[#006d6e]"
      >
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8 sm:py-16"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-black/10 px-6 py-5 sm:px-8">
              <h2
                id={titleId}
                className="font-serif text-[24px] font-normal leading-tight tracking-tight text-[#0a1f33] sm:text-[28px]"
              >
                {title}
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#5b6573] transition-colors hover:bg-[#f3f6f7] hover:text-[#0a1f33]"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-6 text-[14px] leading-relaxed text-[#4a5563] sm:px-8">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
