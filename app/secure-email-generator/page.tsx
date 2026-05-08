import SecureEmailGenerator from "@/components/secure-email/SecureEmailGenerator";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default function SecureEmailGeneratorPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Client Email Generator
        </h2>
        <p className="text-sm text-slate-500">
          A controlled drafting assistant that polishes language inside an
          approved template. The advisor remains responsible for final review
          and approval.
        </p>
      </header>

      {!isServerSupabaseConfigured() ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-semibold text-amber-900">
            Database is not configured
          </p>
          <p className="mt-2 text-sm text-amber-800">
            Set Supabase env vars in{" "}
            <code className="font-mono">.env.local</code> and run{" "}
            <code className="font-mono">supabase/004-secure-email-drafts.sql</code>{" "}
            to use this tool.
          </p>
        </div>
      ) : (
        <SecureEmailGenerator />
      )}
    </div>
  );
}
