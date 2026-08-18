"use client";

/**
 * The outcome screen: either "Ready for approval", or the itemised deficiency
 * list plus a drafted email.
 *
 * Every line here is traceable to a rule code in lib/discrepancy-detector/rules
 * — the code is shown next to each finding on purpose, so that when someone asks
 * how the system decided an account was deficient, the reviewer can point at the
 * exact rule.
 */

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCopy, Info, Mail } from "lucide-react";
import { loadAdvisors, resolveAdvisor } from "@/lib/discrepancy-detector/advisors";
import { buildEmailDraft, mailtoHref } from "@/lib/discrepancy-detector/email";
import type {
  Advisor,
  AdvisorMatch,
  ReviewData,
  RulesReport,
} from "@/lib/discrepancy-detector/types";
import { DEFAULT_CONFIG } from "@/lib/discrepancy-detector/config";
import { Pill } from "./ui";

export default function ResultsPanel({
  data,
  report,
  onDraftGenerated,
}: {
  data: ReviewData;
  report: RulesReport;
  /** Lets the parent record in the audit log that a draft was produced. */
  onDraftGenerated: (advisor: Advisor | null) => void;
}) {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string>("");
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    loadAdvisors(controller.signal)
      .then(setAdvisors)
      .catch((err: unknown) => {
        if ((err as Error)?.name === "AbortError") return;
        setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => controller.abort();
  }, []);

  const match: AdvisorMatch = useMemo(
    () => resolveAdvisor(advisors, data.naaf.naaf_rep_code, data.naaf.naaf_advisor_name),
    [advisors, data.naaf.naaf_rep_code, data.naaf.naaf_advisor_name]
  );

  // Pre-select only a confident single hit; anything else the reviewer picks.
  useEffect(() => {
    setSelectedEmail(match.confident && match.advisor ? match.advisor.email : "");
    setConfirmed(false);
  }, [match]);

  const selected = advisors.find((a) => a.email === selectedEmail) ?? null;

  const draft = useMemo(() => {
    if (!selected) return null;
    return buildEmailDraft({
      report,
      docKind: data.naaf.naaf_doc_kind,
      advisorName: selected.advisor_name,
      advisorEmail: selected.email,
      clientName: data.naaf.naaf_client_name,
      clientId: data.naaf.naaf_client_id,
      config: DEFAULT_CONFIG,
    });
  }, [
    selected,
    report,
    data.naaf.naaf_doc_kind,
    data.naaf.naaf_client_name,
    data.naaf.naaf_client_id,
  ]);

  useEffect(() => {
    if (confirmed && selected) onDraftGenerated(selected);
    // onDraftGenerated is stable enough for this one-shot audit note.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed, selected]);

  const copy = async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(
      `To: ${draft.to}\nSubject: ${draft.subject}\n\n${draft.body}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (report.clean) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <h3 className="text-[15px] font-semibold text-emerald-900">Ready for approval</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-emerald-800">
              No discrepancies were found between the NAAF and the CRQ, and no required
              section is missing. This tool does not approve accounts — a reviewer still
              makes the final call.
            </p>
          </div>
        </div>
        <ChecksList report={report} title="What was checked" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
        <div>
          <h3 className="text-[15px] font-semibold text-rose-900">
            {report.deficiencies.length}{" "}
            {report.deficiencies.length === 1 ? "deficiency" : "deficiencies"} found
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-rose-800">
            Review each item below, confirm the advisor, then send the drafted email
            yourself. This tool never sends anything.
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">Discrepancies</h3>
        {report.deficiencies.map((item) => (
          <div
            key={item.key}
            className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-3.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={item.serious ? "serious" : "deficiency"}>
                {item.serious ? "Serious" : "Deficiency"}
              </Pill>
              <span className="text-[12px] font-semibold text-slate-900">{item.title}</span>
              <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                {item.code}
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-slate-700">{item.message}</p>
            <p className="text-[12px] leading-relaxed text-slate-500">{item.remediation}</p>
          </div>
        ))}
      </section>

      {report.notes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">
            For information
          </h3>
          {report.notes.map((item) => (
            <div
              key={item.key}
              className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50/60 p-3.5"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
              <div>
                <p className="text-[13px] leading-relaxed text-slate-700">{item.message}</p>
                <p className="mt-0.5 text-[12px] text-slate-500">{item.remediation}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* --- Advisor confirmation gate ------------------------------------- */}
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div>
          <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">
            Advisor on file
          </h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
            This email contains client KYC details. Confirm the recipient before drafting —
            sending it to the wrong advisor is a privacy incident.
          </p>
        </div>

        {loadError ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
            {loadError} Check public/discrepancy-detector/advisors.json.
          </p>
        ) : (
          <>
            <p
              className={`rounded-lg border px-3 py-2 text-[12px] leading-relaxed ${
                match.confident
                  ? "border-slate-200 bg-slate-50 text-slate-600"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {match.reason}
            </p>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-600">Send to</span>
              <select
                value={selectedEmail}
                onChange={(e) => {
                  setSelectedEmail(e.target.value);
                  setConfirmed(false);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value="">Select an advisor…</option>
                {advisors.map((a) => (
                  <option key={a.email} value={a.email}>
                    {a.advisor_name} — {a.email}
                    {a.rep_code ? ` (rep ${a.rep_code})` : ""}
                  </option>
                ))}
              </select>
            </label>

            {selected && (
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-brand focus:ring-brand/30"
                />
                <span className="text-[12px] leading-tight text-slate-700">
                  I confirm <strong>{selected.advisor_name}</strong> ({selected.email}) is the
                  correct advisor for this client.
                </span>
              </label>
            )}
          </>
        )}
      </section>

      {/* --- The draft ----------------------------------------------------- */}
      {confirmed && draft ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">
              Draft deficiency email
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copy}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <ClipboardCopy className="h-3.5 w-3.5" />
                {copied ? "Copied" : "Copy"}
              </button>
              <a
                href={mailtoHref(draft)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-2.5 text-[12px] font-medium text-white transition hover:bg-brand-hover"
              >
                <Mail className="h-3.5 w-3.5" />
                Open in mail client
              </a>
            </div>
          </div>

          <dl className="grid gap-1.5 rounded-lg bg-slate-50 p-3 text-[12px]">
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 font-medium text-slate-500">To</dt>
              <dd className="text-slate-900">{draft.to}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 font-medium text-slate-500">Subject</dt>
              <dd className="text-slate-900">{draft.subject}</dd>
            </div>
          </dl>

          <textarea
            readOnly
            value={draft.body}
            rows={18}
            className="w-full resize-y rounded-lg border border-slate-200 bg-white p-3 font-mono text-[11.5px] leading-relaxed text-slate-800 focus:outline-none"
          />
          <p className="text-[11px] text-slate-400">
            Nothing is sent from here. Copy the text or open it in your own mail client, then
            send it yourself.
          </p>
        </section>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-500">
          Confirm the advisor above to generate the draft email.
        </p>
      )}

      <ChecksList report={report} title="Everything that was checked" />
    </div>
  );
}

function ChecksList({ report, title }: { report: RulesReport; title: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">{title}</h3>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {report.results.map((r) => (
          <li key={r.key} className="flex items-start gap-2.5 px-3.5 py-2.5">
            <span className="mt-0.5">
              <Pill tone={r.status === "ok" ? "ok" : r.status === "note" ? "note" : "deficiency"}>
                {r.status === "ok" ? "Pass" : r.status === "note" ? "Note" : "Fail"}
              </Pill>
            </span>
            <span className="flex-1 text-[12px] leading-relaxed text-slate-600">{r.message}</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
              {r.code}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
