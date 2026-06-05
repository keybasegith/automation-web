"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

const PAGE_URL = "https://automation-web-red.vercel.app/wealth-offering";

export default function WealthOfferingQR() {
  const [qrSrc, setQrSrc] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(PAGE_URL, {
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
          src="/argosy-logo.png"
          alt="Argosy"
          width={200}
          height={200}
          priority
          className="mb-2 h-auto w-56 object-contain sm:w-64"
        />

        <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Wealth Offering
        </h1>

        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-500 sm:text-base">
          Scan with your phone camera to view the wealth offering.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {qrSrc ? (
            <Image
              src={qrSrc}
              alt="Scan to view the wealth offering"
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
      </div>
    </div>
  );
}
