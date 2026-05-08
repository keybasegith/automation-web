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
    id: "client-email-generator",
    title: "Client Email Generator",
    description:
      "Draft client emails inside an approved template — abstracted context only, server-side personalization, and PIN-approved sending with audit trail.",
    href: "/secure-email-generator",
    icon: <SecureEmailIcon />,
    status: "available",
  },
  {
    id: "automation-engine",
    title: "Market Event Automation",
    description:
      "Detect market events, target clients automatically, and draft compliance-aware emails end to end.",
    href: "/dashboard/automation",
    icon: <CampaignIcon />,
    status: "available",
  },
  {
    id: "document-refresh",
    title: "Document Refresh & Outreach",
    description:
      "Detect outdated KYC, ID, and compliance documents and draft polite refresh requests automatically.",
    href: "/dashboard/document-refresh",
    icon: <NotesIcon />,
    status: "available",
  },
];

export default function ClientCommunicationLanding() {
  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Module
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Client Communication & Outreach
        </h2>
        <p className="text-sm text-slate-500">
          AI-powered tools for personalized, compliance-aware client outreach.
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

function SecureEmailIcon() {
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
      <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" />
      <path d="M9 12h6M9 9h6M9 15h4" />
    </svg>
  );
}

function CampaignIcon() {
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
      <path d="M3 11v2a2 2 0 0 0 2 2h2l8 4V5L7 9H5a2 2 0 0 0-2 2Z" />
      <path d="M19 8a4 4 0 0 1 0 8" />
    </svg>
  );
}

function NotesIcon() {
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
      <path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M8 10h8M8 14h8M8 18h5" />
    </svg>
  );
}
