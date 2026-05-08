import Link from "next/link";
import UploadDropzone from "@/components/form-processing/UploadDropzone";

export const dynamic = "force-dynamic";

export default function UploadNaafPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link
          href="/dashboard/form-processing"
          className="text-xs font-medium text-brand transition hover:text-brand-hover"
        >
          ← Back to dashboard
        </Link>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Upload NAAF
        </h2>
        <p className="text-sm text-slate-500">
          Upload the completed NAAF document. Extraction is automatic for plain
          text uploads; PDFs and images currently fall back to a manual fill
          step pending an approved OCR vendor.
        </p>
      </header>

      <UploadDropzone />
    </div>
  );
}
