"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import CompoundInterestCalculator from "@/components/compound-interest/CompoundInterestCalculator";

// The QR encodes this URL. The `app=1` flag tells the page it was opened by
// scanning, so the QR header is hidden and only the calculator is shown.
const QR_TARGET =
  "https://automation-web-red.vercel.app/compound-calculator?app=1";

export default function CompoundCalculatorLandingPage() {
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isApp, setIsApp] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsApp(new URLSearchParams(window.location.search).get("app") === "1");

    QRCode.toDataURL(QR_TARGET, {
      margin: 1,
      width: 1024,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then(setQrSrc)
      .catch(() => setQrSrc(null));
  }, []);

  // Show the QR header only on the display page — never when opened via scan.
  // Rendered after mount so scanned visitors never see a flash of the header.
  const showHeader = mounted && !isApp;

  return (
    <div className="min-h-screen w-full bg-white text-slate-900">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        {showHeader && (
          <>
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
          </>
        )}

        {/* The calculator itself */}
        <CompoundInterestCalculator />
      </div>
    </div>
  );
}
