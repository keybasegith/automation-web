/**
 * The single registry behind the internal workspace: every department, every
 * tool card, how a department page groups its tools, and what the dashboard
 * directory search matches on.
 *
 * The sidebar, the dashboard home, and the department pages all derive from
 * this file (via lib/workspace-nav.ts), so a tool added here is reachable
 * everywhere at once. Hiding or showing a card here is navigation only — it
 * is not access control.
 */

import {
  Banknote,
  Briefcase,
  BriefcaseBusiness,
  CalendarDays,
  Calculator,
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
  FileText,
  FileCheck2,
  FileSearch,
  PackageCheck,
  ClipboardList,
  RefreshCw,
  Workflow,
  UserPlus,
  PlayCircle,
  CheckCircle2,
  Scale,
  Landmark,
  Captions,
  type LucideIcon,
} from "lucide-react";

export interface DepartmentTool {
  /** Stable identifier, unique within its department. Never derived from the label. */
  id: string;
  label: string;
  hint: string;
  href: string;
  icon: LucideIcon;
  /**
   * Which of the department's `categories` this tool renders under.
   * Omitted when the department lists its tools flat.
   */
  category?: string;
  /** Extra terms the dashboard directory search matches besides label and hint. */
  keywords?: readonly string[];
}

export interface DepartmentAction {
  label: string;
  href: string;
}

export interface Department {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  /**
   * Display order of tool groups on the department page. Departments with a
   * short tool list omit this and render flat.
   */
  categories?: readonly string[];
  /** The one action most staff open this department for, when one clearly exists. */
  primaryAction?: DepartmentAction;
  tools: readonly DepartmentTool[];
}

export const DEPARTMENTS: readonly Department[] = [
  {
    slug: "finance",
    name: "Finance",
    tagline: "Analysis & reporting",
    description:
      "Sage exports, account analysis, meeting transcripts, and monthly reconciliation workflows.",
    icon: Banknote,
    categories: ["Analysis & reporting", "Supporting tools"],
    tools: [
      {
        id: "financial-statement-generator",
        label: "Financial Statement Generator",
        hint: "Upload a trial balance to generate a balance sheet and income statement",
        href: "/financial-statement-generator",
        icon: FileText,
        category: "Analysis & reporting",
        keywords: ["balance sheet", "income statement", "trial balance", "sage"],
      },
      {
        id: "monthly-account-analysis",
        label: "Monthly Account Analysis",
        hint: "Upload Sage exports & generate analysis",
        href: "/finance-intelligence",
        icon: FileSpreadsheet,
        category: "Analysis & reporting",
        keywords: ["sage", "reconciliation", "finance intelligence"],
      },
      {
        id: "transcript-formatter",
        label: "Transcript Formatter",
        hint: "Clean raw meeting transcripts and export them as editable Word documents",
        href: "/transcript-formatter",
        icon: Captions,
        category: "Supporting tools",
        keywords: ["meeting notes", "word", "docx"],
      },
      {
        id: "compound-interest-calculator",
        label: "Compound Interest Calculator",
        hint: "Project growth of a lump sum or recurring contributions over time",
        href: "/compound-interest",
        icon: Calculator,
        category: "Supporting tools",
        keywords: ["projection", "savings", "growth"],
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
    categories: ["Intake & forms", "Approved packages", "Settlement"],
    primaryAction: {
      label: "Review approved packages",
      href: "/dashboard/bp/approved-packages",
    },
    tools: [
      {
        id: "form-processing-compliance",
        label: "Form Processing & Compliance",
        hint: "Process and compliance-check forms",
        href: "/dashboard/form-processing-compliance",
        icon: FileCheck2,
        category: "Intake & forms",
        keywords: ["validation", "ocr"],
      },
      {
        id: "form-prepopulation",
        label: "Form Pre-population",
        hint: "Auto-fill forms from client data",
        href: "/dashboard/form-prepopulation",
        icon: ClipboardList,
        category: "Intake & forms",
        keywords: ["autofill", "kyc", "naaf"],
      },
      {
        id: "smart-document-intake",
        label: "Smart Document Intake",
        hint: "Scan, classify, and split documents",
        href: "/smart-document-intake",
        icon: ScanLine,
        category: "Intake & forms",
        keywords: ["scan", "classify", "split", "upload"],
      },
      {
        id: "approved-packages",
        label: "Approved Packages",
        hint: "Review packages ready for processing",
        href: "/dashboard/bp/approved-packages",
        icon: PackageCheck,
        category: "Approved packages",
        keywords: ["submissions", "processing queue"],
      },
      {
        id: "daily-settlement-check",
        label: "Daily Settlement Check",
        hint: "Identify Buy/Sell differences between Fundserv and Winfund",
        href: "/bp-dailysettlement",
        icon: Landmark,
        category: "Settlement",
        keywords: ["fundserv", "winfund", "buy", "sell"],
      },
      {
        id: "net-settlement",
        label: "Net Settlement Reconciliation",
        hint: "Reconcile Fundserv N$M against Winfund trust data",
        href: "/net-settlement",
        icon: Scale,
        category: "Settlement",
        keywords: ["fundserv", "winfund", "trust", "daily process"],
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
    categories: ["Review tools", "Policies & rules", "Audit"],
    primaryAction: {
      label: "Open review queue",
      href: "/dashboard/form-processing",
    },
    tools: [
      {
        id: "client-risk-questionnaire",
        label: "Client Risk Questionnaire",
        hint: "Complete an individual, joint or corporate CRQ and score it automatically",
        href: "/client-risk-questionnaire",
        icon: ClipboardList,
        category: "Review tools",
        keywords: ["crq", "risk score"],
      },
      {
        id: "discrepancy-detector",
        label: "NAAF / CRQ Discrepancy Detector",
        hint: "Check a new account's NAAF against its CRQ and draft the advisor email",
        href: "/discrepancy-detector",
        icon: FileSearch,
        category: "Review tools",
        keywords: ["deficiency", "new account"],
      },
      {
        id: "form-intelligence-review",
        label: "Form Intelligence & Review",
        hint: "Inspect forms flagged for compliance",
        href: "/dashboard/form-processing",
        icon: FileCheck2,
        category: "Review tools",
        keywords: ["review queue", "flagged"],
      },
      {
        id: "compliance-rules",
        label: "Compliance Rules",
        hint: "Configure rules that drive the review queue",
        href: "/dashboard/compliance",
        icon: ShieldCheck,
        category: "Policies & rules",
        keywords: ["policies"],
      },
      {
        id: "audit-logs",
        label: "Audit Logs",
        hint: "Full record of system events",
        href: "/dashboard/audit",
        icon: Inbox,
        category: "Audit",
        keywords: ["events", "history", "trail"],
      },
    ],
  },
  {
    slug: "financial-advisors",
    name: "Financial Advisors",
    tagline: "Client applications",
    description:
      "Onboard a new client step by step, or work in the NAAF and CRQ side by side — shared details fill in across both, and the signed forms are filed on the client's record.",
    icon: BriefcaseBusiness,
    categories: ["Onboarding", "Applications & forms"],
    primaryAction: { label: "Start client onboarding", href: "/onboarding/new" },
    tools: [
      {
        id: "new-client-onboarding",
        label: "New Client Onboarding",
        hint: "Step-by-step onboarding: answer once, then the NAAF and CRQ are filled, signed and filed on the client's record",
        href: "/onboarding/new",
        icon: UserPlus,
        category: "Onboarding",
        keywords: ["wizard", "new client"],
      },
      {
        id: "new-account-application",
        label: "New Account Application Form",
        hint: "The NAAF beside its CRQ — shared details fill in across both, blanks and missing signatures are flagged",
        href: "/dashboard/new-account",
        icon: FileText,
        category: "Applications & forms",
        keywords: ["naaf"],
      },
      {
        id: "crq-individual",
        label: "CRQ — Individual Account Holder",
        hint: "Individual risk questionnaire, side by side with the NAAF",
        href: "/dashboard/new-account?crq=individual",
        icon: ClipboardList,
        category: "Applications & forms",
        keywords: ["risk questionnaire"],
      },
      {
        id: "crq-joint",
        label: "CRQ — Joint Account Holders",
        hint: "Joint risk questionnaire with both holders' signatures, side by side with the NAAF",
        href: "/dashboard/new-account?crq=joint",
        icon: ClipboardList,
        category: "Applications & forms",
        keywords: ["risk questionnaire"],
      },
      {
        id: "crq-corporate",
        label: "CRQ — Corporate Accounts",
        hint: "Corporate risk questionnaire signed by the Authorized Signing Officer, side by side with the NAAF",
        href: "/dashboard/new-account?crq=corporate",
        icon: ClipboardList,
        category: "Applications & forms",
        keywords: ["risk questionnaire"],
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
    categories: ["Clients", "Outreach"],
    primaryAction: { label: "View clients", href: "/dashboard/clients" },
    tools: [
      {
        id: "clients",
        label: "Clients",
        hint: "Browse and manage the client list",
        href: "/dashboard/clients",
        icon: Users,
        category: "Clients",
        keywords: ["book", "records", "search clients"],
      },
      {
        id: "import-clients",
        label: "Import Clients",
        hint: "Upload a CSV of new clients",
        href: "/dashboard/clients/import",
        icon: Upload,
        category: "Clients",
        keywords: ["csv", "upload"],
      },
      {
        id: "client-communication",
        label: "Client Communication",
        hint: "Generate and send outreach emails",
        href: "/dashboard/client-communication",
        icon: Mail,
        category: "Outreach",
        keywords: ["email", "outreach"],
      },
      {
        id: "document-refresh",
        label: "Document Refresh",
        hint: "Request updated documents from clients",
        href: "/dashboard/document-refresh",
        icon: RefreshCw,
        category: "Outreach",
        keywords: ["expiring", "stale documents"],
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
    tools: [
      {
        id: "audit-logs",
        label: "Audit Logs",
        hint: "All system events and actor history",
        href: "/dashboard/audit",
        icon: Inbox,
        keywords: ["events", "history"],
      },
      {
        id: "automation-runs",
        label: "Automation Runs",
        hint: "Triggered jobs and background workflows",
        href: "/dashboard/automation",
        icon: Workflow,
        keywords: ["jobs", "workflows"],
      },
    ],
  },
  {
    slug: "insurance-sales",
    name: "Insurance Sales",
    tagline: "Onboarding & applications",
    description: "Run new client onboarding from intake through completion.",
    icon: Umbrella,
    categories: ["Onboarding", "Documents & forms"],
    primaryAction: { label: "Start onboarding", href: "/onboarding/new" },
    tools: [
      {
        id: "new-onboarding",
        label: "New Onboarding",
        hint: "Start a fresh client onboarding",
        href: "/onboarding/new",
        icon: UserPlus,
        category: "Onboarding",
      },
      {
        id: "active-onboarding",
        label: "Active Onboarding",
        hint: "In-progress onboarding cases",
        href: "/onboarding/active",
        icon: PlayCircle,
        category: "Onboarding",
        keywords: ["resume", "in progress"],
      },
      {
        id: "completed-onboarding",
        label: "Completed Onboarding",
        hint: "Closed onboarding cases",
        href: "/onboarding/completed",
        icon: CheckCircle2,
        category: "Onboarding",
      },
      {
        id: "smart-document-intake",
        label: "Smart Document Intake",
        hint: "Scan and classify client documents",
        href: "/smart-document-intake",
        icon: ScanLine,
        category: "Documents & forms",
        keywords: ["scan", "classify"],
      },
      {
        id: "form-prepopulation",
        label: "Form Pre-population",
        hint: "Auto-fill applications from client data",
        href: "/dashboard/form-prepopulation",
        icon: ClipboardList,
        category: "Documents & forms",
        keywords: ["autofill"],
      },
    ],
  },
  {
    slug: "marketing",
    name: "Marketing",
    tagline: "Outreach & campaigns",
    description:
      "Plan the content calendar, send secure emails, and trigger campaigns.",
    icon: Megaphone,
    categories: ["Content & planning", "Outreach & campaigns"],
    tools: [
      {
        id: "content-calendar",
        label: "Content Calendar",
        hint: "Plan content, gather files and links, run approval & compliance review",
        href: "/dashboard/departments/marketing/calendar",
        icon: CalendarDays,
        category: "Content & planning",
        keywords: ["schedule", "approval"],
      },
      {
        id: "secure-email-generator",
        label: "Secure Email Generator",
        hint: "Compose encrypted outbound email",
        href: "/secure-email-generator",
        icon: Mail,
        category: "Outreach & campaigns",
        keywords: ["encrypted"],
      },
      {
        id: "client-communication",
        label: "Client Communication",
        hint: "Generate and send outreach emails",
        href: "/dashboard/client-communication",
        icon: Mail,
        category: "Outreach & campaigns",
        keywords: ["outreach"],
      },
      {
        id: "automation-runs",
        label: "Automation Runs",
        hint: "Scheduled and triggered campaigns",
        href: "/dashboard/automation",
        icon: Workflow,
        category: "Outreach & campaigns",
        keywords: ["campaigns"],
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
    tools: [
      {
        id: "clients",
        label: "Clients",
        hint: "Full client book",
        href: "/dashboard/clients",
        icon: Users,
      },
      {
        id: "audit-logs",
        label: "Audit Logs",
        hint: "Org-wide activity record",
        href: "/dashboard/audit",
        icon: Inbox,
      },
      {
        id: "compliance-rules",
        label: "Compliance Rules",
        hint: "Policies in effect across the org",
        href: "/dashboard/compliance",
        icon: ShieldCheck,
      },
      {
        id: "monthly-account-analysis",
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

/**
 * A department's tools in display order: grouped by `categories` when the
 * department defines them (uncategorised tools last), flat otherwise.
 */
export function departmentToolGroups(
  dept: Department,
): readonly { category?: string; tools: readonly DepartmentTool[] }[] {
  if (!dept.categories || dept.categories.length === 0) {
    return [{ tools: dept.tools }];
  }
  const groups: { category?: string; tools: readonly DepartmentTool[] }[] =
    dept.categories
      .map((category) => ({
        category,
        tools: dept.tools.filter((t) => t.category === category),
      }))
      .filter((g) => g.tools.length > 0);
  const uncategorised = dept.tools.filter(
    (t) => !t.category || !dept.categories?.includes(t.category),
  );
  if (uncategorised.length > 0) groups.push({ tools: uncategorised });
  return groups;
}
