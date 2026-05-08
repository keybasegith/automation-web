import Link from "next/link";

interface Feature {
  id: string;
  title: string;
  description: string;
  href?: string;
  icon: React.ReactNode;
  status: "available" | "coming-soon";
}

const FEATURES: Feature[] = [
  {
    id: "form-prepopulation",
    title: "Form Pre-Population",
    description:
      "Extract structured client data from existing KYC or NAAF documents and auto-fill new forms — no inference, only data that's explicitly present.",
    href: "/dashboard/form-prepopulation",
    icon: <FormIcon />,
    status: "available",
  },
  {
    id: "form-validation",
    title: "Form Validation",
    description:
      "Validate completed forms against firm and regulatory rules before submission.",
    icon: <ChecklistIcon />,
    status: "coming-soon",
  },
  {
    id: "form-extraction-ocr",
    title: "OCR Document Extraction",
    description:
      "Read scanned PDFs and images and extract structured data into the system.",
    icon: <ScanIcon />,
    status: "coming-soon",
  },
];

export default function FormProcessingLanding() {
  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Module
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Form Processing & Compliance
        </h2>
        <p className="text-sm text-slate-500">
          Tools for compliance-safe form pre-population, validation, and
          structured data extraction.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}
      </div>
    </div>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const isAvailable = feature.status === "available" && feature.href;

  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          {feature.icon}
        </div>
        {feature.status === "coming-soon" && (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
            Coming soon
          </span>
        )}
        {feature.status === "available" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Available
          </span>
        )}
      </div>

      <h3 className="text-base font-semibold tracking-tight text-slate-900">
        {feature.title}
      </h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-500">
        {feature.description}
      </p>

      <div className="mt-5">
        {isAvailable ? (
          <Link
            href={feature.href!}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            Open
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex h-9 cursor-not-allowed items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-400"
          >
            Coming soon
          </button>
        )}
      </div>
    </article>
  );
}

function FormIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

function ChecklistIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="m8 9 2 2 4-4M8 15l2 2 4-4" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" />
    </svg>
  );
}
