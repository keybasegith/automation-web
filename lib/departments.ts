import {
  Banknote,
  Briefcase,
  ShieldCheck,
  TrendingUp,
  Server,
  Umbrella,
  Megaphone,
  Crown,
  Mail,
  Upload,
  ScanLine,
  Inbox,
  Users,
  FileSpreadsheet,
  FileCheck2,
  PackageCheck,
  ClipboardList,
  RefreshCw,
  Workflow,
  UserPlus,
  PlayCircle,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

export interface DepartmentTool {
  label: string;
  hint: string;
  href: string;
  icon: LucideIcon;
}

export interface Department {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  tools: readonly DepartmentTool[];
}

export const DEPARTMENTS: readonly Department[] = [
  {
    slug: "finance",
    name: "Finance",
    tagline: "Analysis & reporting",
    description:
      "Sage exports, account analysis, and monthly reconciliation workflows.",
    icon: Banknote,
    accent: "from-emerald-500/15 to-emerald-500/5 text-emerald-700",
    tools: [
      {
        label: "Monthly Account Analysis",
        hint: "Upload Sage exports & generate analysis",
        href: "/finance-intelligence",
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    slug: "business-processing",
    name: "Business Processing",
    tagline: "Forms, packages & intake",
    description:
      "Process forms, manage approval packages, and pre-populate client data.",
    icon: Briefcase,
    accent: "from-sky-500/15 to-sky-500/5 text-sky-700",
    tools: [
      {
        label: "Form Processing & Compliance",
        hint: "Process and compliance-check forms",
        href: "/dashboard/form-processing-compliance",
        icon: FileCheck2,
      },
      {
        label: "Approved Packages",
        hint: "Review packages ready for processing",
        href: "/dashboard/bp/approved-packages",
        icon: PackageCheck,
      },
      {
        label: "Form Pre-population",
        hint: "Auto-fill forms from client data",
        href: "/dashboard/form-prepopulation",
        icon: ClipboardList,
      },
      {
        label: "Smart Document Intake",
        hint: "Scan, classify, and split documents",
        href: "/smart-document-intake",
        icon: ScanLine,
      },
    ],
  },
  {
    slug: "compliance",
    name: "Compliance",
    tagline: "Review & oversight",
    description:
      "Review forms, manage compliance rules, and inspect the audit trail.",
    icon: ShieldCheck,
    accent: "from-amber-500/15 to-amber-500/5 text-amber-700",
    tools: [
      {
        label: "Form Intelligence & Review",
        hint: "Inspect forms flagged for compliance",
        href: "/dashboard/form-processing",
        icon: FileCheck2,
      },
      {
        label: "Compliance Rules",
        hint: "Configure rules that drive the review queue",
        href: "/dashboard/compliance",
        icon: ShieldCheck,
      },
      {
        label: "Audit Logs",
        hint: "Full record of system events",
        href: "/dashboard/audit",
        icon: Inbox,
      },
    ],
  },
  {
    slug: "sales",
    name: "Sales",
    tagline: "Clients & outreach",
    description:
      "Manage the client book, draft outreach, and refresh stale documents.",
    icon: TrendingUp,
    accent: "from-violet-500/15 to-violet-500/5 text-violet-700",
    tools: [
      {
        label: "Clients",
        hint: "Browse and manage the client list",
        href: "/dashboard/clients",
        icon: Users,
      },
      {
        label: "Import Clients",
        hint: "Upload a CSV of new clients",
        href: "/dashboard/clients/import",
        icon: Upload,
      },
      {
        label: "Client Communication",
        hint: "Generate and send outreach emails",
        href: "/dashboard/client-communication",
        icon: Mail,
      },
      {
        label: "Document Refresh",
        hint: "Request updated documents from clients",
        href: "/dashboard/document-refresh",
        icon: RefreshCw,
      },
    ],
  },
  {
    slug: "it",
    name: "IT",
    tagline: "Systems & automation",
    description:
      "Monitor system activity, automation runs, and configuration health.",
    icon: Server,
    accent: "from-slate-500/15 to-slate-500/5 text-slate-700",
    tools: [
      {
        label: "Audit Logs",
        hint: "All system events and actor history",
        href: "/dashboard/audit",
        icon: Inbox,
      },
      {
        label: "Automation Runs",
        hint: "Triggered jobs and background workflows",
        href: "/dashboard/automation",
        icon: Workflow,
      },
    ],
  },
  {
    slug: "insurance-sales",
    name: "Insurance Sales",
    tagline: "Onboarding & applications",
    description:
      "Run new client onboarding from intake through completion.",
    icon: Umbrella,
    accent: "from-cyan-500/15 to-cyan-500/5 text-cyan-700",
    tools: [
      {
        label: "New Onboarding",
        hint: "Start a fresh client onboarding",
        href: "/onboarding/new",
        icon: UserPlus,
      },
      {
        label: "Active Onboarding",
        hint: "In-progress onboarding cases",
        href: "/onboarding/active",
        icon: PlayCircle,
      },
      {
        label: "Completed Onboarding",
        hint: "Closed onboarding cases",
        href: "/onboarding/completed",
        icon: CheckCircle2,
      },
      {
        label: "Smart Document Intake",
        hint: "Scan and classify client documents",
        href: "/smart-document-intake",
        icon: ScanLine,
      },
      {
        label: "Form Pre-population",
        hint: "Auto-fill applications from client data",
        href: "/dashboard/form-prepopulation",
        icon: ClipboardList,
      },
    ],
  },
  {
    slug: "marketing",
    name: "Marketing",
    tagline: "Outreach & campaigns",
    description:
      "Send secure emails, draft client communication, and trigger campaigns.",
    icon: Megaphone,
    accent: "from-pink-500/15 to-pink-500/5 text-pink-700",
    tools: [
      {
        label: "Secure Email Generator",
        hint: "Compose encrypted outbound email",
        href: "/secure-email-generator",
        icon: Mail,
      },
      {
        label: "Client Communication",
        hint: "Generate and send outreach emails",
        href: "/dashboard/client-communication",
        icon: Mail,
      },
      {
        label: "Automation Runs",
        hint: "Scheduled and triggered campaigns",
        href: "/dashboard/automation",
        icon: Workflow,
      },
    ],
  },
  {
    slug: "senior-management",
    name: "Senior Management",
    tagline: "Oversight & strategy",
    description:
      "Cross-functional view of clients, compliance posture, and finance.",
    icon: Crown,
    accent: "from-indigo-500/15 to-indigo-500/5 text-indigo-700",
    tools: [
      {
        label: "Clients",
        hint: "Full client book",
        href: "/dashboard/clients",
        icon: Users,
      },
      {
        label: "Audit Logs",
        hint: "Org-wide activity record",
        href: "/dashboard/audit",
        icon: Inbox,
      },
      {
        label: "Compliance Rules",
        hint: "Policies in effect across the org",
        href: "/dashboard/compliance",
        icon: ShieldCheck,
      },
      {
        label: "Monthly Account Analysis",
        hint: "Financial reporting workflows",
        href: "/finance-intelligence",
        icon: FileSpreadsheet,
      },
    ],
  },
];

export const getDepartment = (slug: string): Department | undefined =>
  DEPARTMENTS.find((d) => d.slug === slug);
