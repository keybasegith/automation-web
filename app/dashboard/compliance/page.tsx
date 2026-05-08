import { revalidatePath } from "next/cache";
import {
  DEFAULT_COMPLIANCE_SETTINGS,
  getComplianceSettings,
  updateComplianceSettings,
  type ComplianceSettings,
} from "@/lib/db/compliance";
import { getCurrentUser } from "@/lib/currentUser";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

const formatTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Never";

const splitLines = (raw: FormDataEntryValue | null): string[] => {
  if (typeof raw !== "string") return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

async function saveSettings(formData: FormData) {
  "use server";

  const user = getCurrentUser();
  await updateComplianceSettings({
    signature:
      (formData.get("signature") as string)?.trim() ||
      DEFAULT_COMPLIANCE_SETTINGS.signature,
    mandatoryFooter: ((formData.get("mandatoryFooter") as string) ?? "").trim(),
    requiredPhrases: splitLines(formData.get("requiredPhrases")),
    prohibitedPhrases: splitLines(formData.get("prohibitedPhrases")),
    updatedBy: user.id,
  });

  revalidatePath("/dashboard/compliance");
}

export default async function CompliancePage() {
  if (!isServerSupabaseConfigured()) {
    return <NotConfigured />;
  }

  let settings: ComplianceSettings = DEFAULT_COMPLIANCE_SETTINGS;
  let loadError: string | null = null;
  try {
    settings = await getComplianceSettings();
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Compliance
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Compliance Rules
        </h2>
        <p className="text-sm text-slate-500">
          Firm-wide guardrails injected into every AI-generated email. Updated
          rules apply to new generations only.
        </p>
      </header>

      {loadError && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          {loadError.includes("does not exist") ||
          loadError.includes("relation")
            ? "Migration 002-compliance-settings.sql has not been run yet. Open Supabase SQL Editor and run the file at supabase/002-compliance-settings.sql."
            : `Failed to load compliance settings: ${loadError}`}
        </div>
      )}

      <form
        action={saveSettings}
        className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <Section
          title="Email signature"
          description="The exact line every email is signed off with."
        >
          <input
            name="signature"
            type="text"
            defaultValue={settings.signature}
            placeholder="Your Keybase Advisor"
            className={inputClass}
          />
          <Hint>
            Once SSO is in place, this can switch to the logged-in advisor&apos;s
            name automatically. For now, a single firm-level value applies to
            all advisors.
          </Hint>
        </Section>

        <Section
          title="Mandatory footer"
          description="Boilerplate disclaimer appended to every email body."
        >
          <textarea
            name="mandatoryFooter"
            rows={4}
            defaultValue={settings.mandatoryFooter}
            placeholder="e.g. The information in this Keybase e-mail is confidential and may be privileged. Any use or disclosure of this e-mail by anyone other than the intended recipient is unauthorized. If you are not the intended recipient, please delete this e-mail and notify us by reply e-mail."
            className={`${inputClass} resize-y leading-relaxed`}
          />
          <Hint>
            Leave empty to omit. Will appear as the final paragraph of every
            generated email.
          </Hint>
        </Section>

        <Section
          title="Required phrases"
          description="Each phrase must appear verbatim in every email body."
        >
          <textarea
            name="requiredPhrases"
            rows={4}
            defaultValue={settings.requiredPhrases.join("\n")}
            placeholder={`Investments may lose value\nConsult your advisor before making decisions`}
            className={`${inputClass} resize-y font-mono text-xs`}
          />
          <Hint>One phrase per line. Leave empty to disable.</Hint>
        </Section>

        <Section
          title="Prohibited phrases"
          description="The model is instructed to never use these terms."
        >
          <textarea
            name="prohibitedPhrases"
            rows={4}
            defaultValue={settings.prohibitedPhrases.join("\n")}
            placeholder={`guaranteed\nrisk-free\ncan't lose\nsure thing`}
            className={`${inputClass} resize-y font-mono text-xs`}
          />
          <Hint>One word or phrase per line. Case-insensitive.</Hint>
        </Section>

        <footer className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-500">
            Last updated: {formatTime(settings.updatedAt)}
          </span>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-5 text-sm font-medium text-white transition hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            Save rules
          </button>
        </footer>
      </form>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-400">{children}</p>;
}

function NotConfigured() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Compliance
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Compliance Rules
        </h2>
      </header>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-sm font-semibold text-amber-900">
          Database is not configured
        </p>
        <p className="mt-2 text-sm text-amber-800">
          Set Supabase env vars in{" "}
          <code className="font-mono">.env.local</code> and restart the dev
          server.
        </p>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15";
