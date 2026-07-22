import Link from "next/link";
import { ArrowLeft, ScanSearch } from "lucide-react";
import DailySettlementTool from "@/components/bp-settlement/DailySettlementTool";

export const dynamic = "force-static";

export const metadata = {
  title: "Daily Settlement Check · Business Processing · Keybase",
};

export default function DailySettlementPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <Link
          href="/dashboard/departments/business-processing"
          className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Business Processing
        </Link>

        <header className="mb-7 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <ScanSearch className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-[28px] font-semibold tracking-tight text-slate-900">
              Daily Settlement Check
            </h1>
            <p className="mt-1 max-w-2xl text-[15px] text-slate-500">
              Upload Fundserv and Winfund exports to identify Buy and Sell differences before settlement.
            </p>
          </div>
        </header>

        <DailySettlementTool />
      </div>
    </div>
  );
}
