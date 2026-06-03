"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import CompoundInterestCalculator from "@/components/compound-interest/CompoundInterestCalculator";

export default function CompoundCalculatorLandingPage() {
  const [qrSrc, setQrSrc] = useState<string | null>(null);

  useEffect(() => {
    const target = "https://automation-web-red.vercel.app/compound-calculator";
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
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        {/* QR code header */}
        <header className="flex flex-col items-center text-center">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-brand">
            Keybase Financial Group
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Compound Interest Calculator
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-slate-500">
            Try our Financial Intelligence Tool
          </p>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            {qrSrc ? (
              <Image
                src={qrSrc}
                alt="Scan to open the compound interest calculator"
                width={1024}
                height={1024}
                unoptimized
                className="h-[200px] w-[200px] sm:h-[240px] sm:w-[240px]"
              />
            ) : (
              <div className="flex h-[200px] w-[200px] items-center justify-center text-sm text-slate-400 sm:h-[240px] sm:w-[240px]">
                Generating QR code…
              </div>
            )}
          </div>
        </header>

        <div className="my-10 h-px w-full bg-slate-200" />

        {/* The calculator itself */}
        <CompoundInterestCalculator />
      </div>
    </div>
  );
}
