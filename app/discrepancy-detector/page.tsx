import Link from "next/link";
import { ArrowLeft, FileSearch } from "lucide-react";
import DiscrepancyDetectorTool from "@/components/discrepancy-detector/DiscrepancyDetectorTool";

export const dynamic = "force-static";

export const metadata = {
  title: "NAAF / CRQ Discrepancy Detector · Keybase",
  description:
    "Compare a NAAF against its CRQ, list the deficiencies, and draft the advisor email.",
};

export default function DiscrepancyDetectorPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <Link
          href="/dashboard/departments/compliance"
          className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Compliance
        </Link>

        <header className="mb-7 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <FileSearch className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-[28px] font-semibold tracking-tight text-slate-900">
              NAAF / CRQ Discrepancy Detector
            </h1>
            <p className="mt-1 max-w-2xl text-[15px] text-slate-500">
              Drop a new account&apos;s NAAF and CRQ, confirm what was read off the
              forms, and get the itemised deficiency list with a drafted advisor
              email. Every finding cites the rule that produced it.
            </p>
          </div>
        </header>

        <DiscrepancyDetectorTool />
      </div>
    </div>
  );
}
