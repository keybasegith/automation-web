"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

export default function TriviaFormQR() {
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const target = "https://automation-web-red.vercel.app/trivia-game-form";
    setUrl(target);
    QRCode.toDataURL(target, {
      margin: 1,
      width: 1024,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then(setQrSrc)
      .catch(() => setQrSrc(null));
  }, []);

  return (
    <div className="min-h-screen w-full bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6 py-10 text-center">
        <Image
          src="/keybase-logo%20copy.png"
          alt="Keybase Financial Group"
          width={200}
          height={200}
          priority
          className="mb-6 h-16 w-16 rounded-2xl object-contain"
        />

        <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-brand">
          Keybase Financial Group
        </p>

        <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Finance Trivia Challenge
        </h1>

        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-500 sm:text-base">
          Scan with your phone camera to play. Nine questions, about three
          minutes.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {qrSrc ? (
            <Image
              src={qrSrc}
              alt="Scan to connect with Keybase Financial Group"
              width={1024}
              height={1024}
              unoptimized
              className="h-[280px] w-[280px] sm:h-[400px] sm:w-[400px]"
            />
          ) : (
            <div className="flex h-[280px] w-[280px] items-center justify-center text-sm text-slate-400 sm:h-[400px] sm:w-[400px]">
              Generating QR code…
            </div>
          )}
        </div>

        <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-5 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Or visit
          </span>
          <span className="font-mono text-sm text-slate-700">{url}</span>
        </div>

        <p className="mt-8 text-xs text-slate-400">
          9 questions · ~3 minutes · Your info stays private
        </p>
      </div>
    </div>
  );
}
