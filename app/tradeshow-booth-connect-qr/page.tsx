"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

const BOOKING_URL =
  "https://cal.com/stylecast-uurjw6/business-chat-with-dax-sukhraj?overlayCalendar=true";

export default function TradeshowBoothConnectQR() {
  const [qrSrc, setQrSrc] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(BOOKING_URL, {
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
          Let&apos;s Connect
        </h1>

        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-500 sm:text-base">
          Scan with your phone camera to book a business chat with Dax Sukhraj.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {qrSrc ? (
            <Image
              src={qrSrc}
              alt="Scan to book a business chat with Dax Sukhraj"
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

        <p className="mt-8 text-xs text-slate-400">
          Powered by Cal.com · Pick a time that works for you
        </p>
      </div>
    </div>
  );
}
