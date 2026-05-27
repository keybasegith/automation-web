"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type Props = {
  front: React.ReactNode;
  fullName: string;
  title: string;
  company: string;
  accentColor: string;
};

export default function FlipCard({
  front,
  fullName,
  title,
  company,
  accentColor,
}: Props) {
  const [flipped, setFlipped] = useState(false);
  const [qrSrc, setQrSrc] = useState<string | null>(null);

  useEffect(() => {
    // TODO: replace with window.location.origin + pathname once the canonical
    // domain is finalized. Hardcoded for now so QR scans always resolve to prod.
    const url = "https://automation-web-red.vercel.app/businesscard-darko";
    QRCode.toDataURL(url, {
      margin: 1,
      width: 480,
      color: { dark: "#ffffff", light: "#00000000" },
    })
      .then(setQrSrc)
      .catch(() => setQrSrc(null));
  }, []);

  return (
    <div
      className="relative w-full max-w-[360px] sm:max-w-[420px]"
      style={{ perspective: "1200px" }}
    >
      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        aria-label={flipped ? "Show card front" : "Show QR code"}
        className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full shadow-md ring-1 ring-black/10 transition"
        style={{
          backgroundColor: flipped ? accentColor : "rgba(255,255,255,0.92)",
          color: flipped ? "#ffffff" : "#0f172a",
        }}
      >
        {flipped ? (
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="currentColor"
            aria-hidden
          >
            <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm8 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h4v2h-4v-2z" />
          </svg>
        )}
      </button>

      <div
        className="relative transition-transform duration-700 ease-in-out"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <div style={{ backfaceVisibility: "hidden" }}>{front}</div>

        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <article
            className="flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[22px] px-5 py-5 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.5)] sm:rounded-[24px] sm:px-6 sm:py-6"
            style={{ backgroundColor: "#0a0a0a" }}
          >
            {/* QR code */}
            <div className="flex h-48 w-48 items-center justify-center sm:h-60 sm:w-60">
              {qrSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrSrc}
                  alt={`QR code linking to ${fullName}'s digital business card`}
                  className="h-full w-full"
                />
              ) : (
                <div className="h-full w-full animate-pulse rounded bg-white/10" />
              )}
            </div>

            <p className="font-display mt-4 text-center text-[16px] font-bold text-white sm:mt-6 sm:text-[18px]">
              {fullName}
            </p>
            <p className="mt-0.5 text-center text-[11px] text-white/60 sm:text-[12px]">
              {title}
            </p>
            <p className="text-center text-[11px] text-white/60 sm:text-[12px]">
              {company}
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}
