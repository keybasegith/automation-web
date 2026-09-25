"use client";

/**
 * The client onboarding wizard.
 *
 * One screen per section, a menu of sections on the left that ticks itself off
 * as each is completed, and every answer asked once: the NAAF and CRQ both
 * draw from the same draft (lib/client-onboarding/draft), with shared fields
 * kept in step by lib/new-account/sync. At the end the official forms are
 * filled, signed and filed on the client's record.
 *
 * The draft is created in client storage the first time the advisor leaves
 * "Getting started", then saved automatically a moment after each change. If
 * storage is unavailable the wizard still works end to end except for filing,
 * and says so rather than failing silently.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, Columns2, FlaskConical, Loader2 } from "lucide-react";

import {
  blankDraft,
  editCrq,
  editNaaf,
  setAccountKind,
  type AccountKind,
  type OnboardingDraft,
  type SigningMethod,
} from "@/lib/client-onboarding/draft";
import {
  blockingBeforeSigning,
  findingsFor,
  stepStatus,
  stepsFor,
  type StepId,
  type StepStatus,
} from "@/lib/client-onboarding/steps";
import type { NaafState } from "@/lib/naaf/types";
import { linkNotes } from "@/lib/new-account/sync";
import { CRQ_FORMS } from "@/lib/risk-questionnaire/forms";
import type { QuestionnaireState } from "@/lib/risk-questionnaire/types";

import { mockDraft } from "@/lib/client-onboarding/mock";
import type { RequirementId, SupportingStatus } from "@/lib/client-onboarding/supporting";

import DocumentsStep from "./DocumentsStep";
import { FindingContext } from "./fields";
import { EmploymentStep, HolderDetailsStep, IdentityStep } from "./HolderSteps";
import PlansStep from "./PlansStep";
import { AdvisorStep, ContactsStep, FinancialStep, StartStep } from "./ProfileSteps";
import ReviewStep, { type FinishResult, type SignatureSet } from "./ReviewStep";
import RiskStep from "./RiskStep";

type SaveState =
  | { kind: "local" } // not created in storage yet
  | { kind: "saving" }
  | { kind: "saved"; at: Date }
  | { kind: "unavailable"; message: string }
  | { kind: "error"; message: string };

const AUTOSAVE_MS = 1200;

export interface WizardInitial {
  id: string;
  draft: OnboardingDraft;
  currentStep: StepId | null;
  visitedSteps: StepId[];
}

export default function OnboardingWizard({
  initial,
  storageConfigured,
}: {
  initial?: WizardInitial;
  storageConfigured: boolean;
}) {
  const [draft, setDraft] = useState<OnboardingDraft>(() => initial?.draft ?? blankDraft());
  const [id, setId] = useState<string | null>(initial?.id ?? null);
  const [step, setStep] = useState<StepId>(initial?.currentStep ?? "start");
  // Steps the advisor has moved on from: their open items are now shown.
  const [visited, setVisited] = useState<Set<StepId>>(() => new Set(initial?.visitedSteps ?? []));
  const [save, setSave] = useState<SaveState>(() =>
    initial ? { kind: "saved", at: new Date() } : storageConfigured ? { kind: "local" } : { kind: "unavailable", message: "Client storage is not configured on this deployment." },
  );
  const [finished, setFinished] = useState(false);
  // Filled with mock data: shown in full, but never saved to the client records.
  const [demo, setDemo] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const dirty = useRef(false);

  const steps = useMemo(() => stepsFor(draft), [draft]);
  const findings = useMemo(() => findingsFor(draft), [draft]);
  const blocking = useMemo(() => blockingBeforeSigning(findings), [findings]);
  const notes = useMemo(() => linkNotes(draft.naaf, draft.crq, draft.variant), [draft]);

  // A step can disappear (e.g. Joint when the account becomes Individual).
  const currentStep = steps.some((s) => s.id === step) ? step : "start";
  const index = steps.findIndex((s) => s.id === currentStep);
  const statusOf = (s: StepId): StepStatus => stepStatus(findings, s);
  const doneCount = steps.filter((s) => s.id !== "review" && statusOf(s.id) !== "incomplete").length;

  // ---------------------------------------------------------------- edits
  const onNaaf = useCallback((update: (prev: NaafState) => NaafState) => {
    dirty.current = true;
    setDraft((d) => editNaaf(d, update));
  }, []);
  const onCrq = useCallback((update: (prev: QuestionnaireState) => QuestionnaireState) => {
    dirty.current = true;
    setDraft((d) => editCrq(d, update));
  }, []);
  const onKind = (kind: AccountKind) => {
    dirty.current = true;
    setDraft((d) => setAccountKind(d, kind));
  };
  const onSupporting = useCallback((requirement: RequirementId, status: SupportingStatus | null) => {
    dirty.current = true;
    setDraft((d) => {
      const supporting = { ...d.supporting };
      if (status) supporting[requirement] = status;
      else delete supporting[requirement];
      return { ...d, supporting };
    });
  }, []);

  const fillWithMock = () => {
    if (dirty.current && !window.confirm("Replace what you've entered with mock data?")) return;
    const mock = mockDraft(draft.variant);
    setDraft(mock);
    setDemo(true);
    dirty.current = false;
    // Every section counts as visited, so the menu shows its real status.
    setVisited(new Set(stepsFor(mock).map((s) => s.id)));
    setStep("review");
    window.scrollTo({ top: 0 });
  };

  const leaveDemo = () => {
    setDraft(blankDraft());
    setDemo(false);
    setVisited(new Set());
    setStep("start");
    dirty.current = false;
    window.scrollTo({ top: 0 });
  };

  // ---------------------------------------------------------------- saving
  const persist = useCallback(
    async (nextStep: StepId, nextVisited: Set<StepId>) => {
      if (!storageConfigured || finished || demo) return;
      setSave({ kind: "saving" });
      const payload = { draft, currentStep: nextStep, visitedSteps: [...nextVisited] };
      try {
        const res = await fetch(id ? `/api/client-onboarding/${id}` : "/api/client-onboarding", {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (res.status === 503) return setSave({ kind: "unavailable", message: body.error ?? "Client storage is unavailable." });
        if (!res.ok) return setSave({ kind: "error", message: body.error ?? `Save failed (${res.status}).` });
        if (!id && body.onboarding?.id) {
          setId(body.onboarding.id);
          // Put the saved onboarding in the address bar so a reload resumes it.
          window.history.replaceState(null, "", `/onboarding/${body.onboarding.id}/wizard`);
        }
        dirty.current = false;
        setSave({ kind: "saved", at: new Date() });
      } catch {
        setSave({ kind: "unavailable", message: "Client storage could not be reached." });
      }
    },
    [draft, id, storageConfigured, finished, demo],
  );

  // Autosave once the onboarding exists. Before that it is created on leaving
  // "Getting started", so an abandoned first screen leaves no empty record.
  useEffect(() => {
    if (!id || !dirty.current) return;
    const timer = setTimeout(() => void persist(currentStep, visited), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [draft, id, persist, currentStep, visited]);

  // Leaving with unsaved edits loses them; ask first.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current && !finished && !demo) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [finished, demo]);

  // ---------------------------------------------------------------- navigation
  const goTo = (next: StepId, fieldId?: string) => {
    const nextVisited = new Set(visited).add(currentStep);
    setVisited(nextVisited);
    setStep(next);
    if (!id && currentStep === "start" && storageConfigured) void persist(next, nextVisited);
    else if (id) void persist(next, nextVisited);
    requestAnimationFrame(() => {
      if (fieldId) {
        const el = document.getElementById(fieldId);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        (el instanceof HTMLInputElement || el instanceof HTMLSelectElement ? el : el?.querySelector<HTMLElement>("input,select,button,textarea"))?.focus({
          preventScroll: true,
        });
      } else {
        mainRef.current?.scrollTo({ top: 0 });
        window.scrollTo({ top: 0 });
      }
    });
  };

  // Findings show for a step once the advisor has moved past it at least once.
  const showFindings = visited.has(currentStep);
  const lookup = useCallback(
    (fieldId: string) => {
      if (!showFindings) return undefined;
      const f = findings.find((x) => x.step === currentStep && x.fieldId === fieldId);
      return f ? { kind: f.kind, message: f.message } : undefined;
    },
    [findings, currentStep, showFindings],
  );

  // ---------------------------------------------------------------- finishing
  const finish = async (method: SigningMethod, signatures: SignatureSet): Promise<FinishResult> => {
    if (!id) throw new Error("The onboarding has not been saved yet. Check the connection to client storage.");
    const res = await fetch(`/api/client-onboarding/${id}/${method === "in_person" ? "complete" : "send"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft, signatures, consent: true }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? `Could not finish (${res.status}).`);
    dirty.current = false;
    setFinished(true);
    return {
      kind: method === "in_person" ? "completed" : "sent",
      signingUrl: body.signingUrl,
      expiresAt: body.expiresAt,
      documents: (body.documents ?? []).map((d: { id: string; title: string }) => ({ id: d.id, title: d.title })),
    };
  };

  // ---------------------------------------------------------------- render
  const form = CRQ_FORMS[draft.variant];
  const a = draft.naaf.clientA;
  const clientName =
    draft.variant === "corporate" ? a.surname.trim() : [a.firstName.trim(), a.surname.trim()].filter(Boolean).join(" ");
  const canStore = storageConfigured && save.kind !== "unavailable" && id !== null && !demo;

  let body: React.ReactNode;
  switch (currentStep) {
    case "start":
      body = <StartStep naaf={draft.naaf} onNaaf={onNaaf} kind={draft.variant} onKind={onKind} />;
      break;
    case "holder":
      body = (
        <HolderDetailsStep
          holder="A"
          naaf={draft.naaf}
          onNaaf={onNaaf}
          corporate={draft.variant === "corporate"}
          dobAnswersCrq={draft.variant === "individual"}
        />
      );
      break;
    case "identity":
      body = <IdentityStep holder="A" naaf={draft.naaf} onNaaf={onNaaf} corporate={draft.variant === "corporate"} />;
      break;
    case "employment":
      body = <EmploymentStep holder="A" naaf={draft.naaf} onNaaf={onNaaf} />;
      break;
    case "joint":
      body = (
        <div className="flex flex-col gap-6">
          <HolderDetailsStep holder="B" naaf={draft.naaf} onNaaf={onNaaf} />
          <IdentityStep holder="B" naaf={draft.naaf} onNaaf={onNaaf} />
          <EmploymentStep holder="B" naaf={draft.naaf} onNaaf={onNaaf} />
        </div>
      );
      break;
    case "financial":
      body = <FinancialStep naaf={draft.naaf} onNaaf={onNaaf} kind={draft.variant} />;
      break;
    case "plans":
      body = <PlansStep naaf={draft.naaf} onNaaf={onNaaf} />;
      break;
    case "risk":
      body = <RiskStep form={form} crq={draft.crq} onCrq={onCrq} notes={notes} showFindings={showFindings} />;
      break;
    case "contacts":
      body = <ContactsStep naaf={draft.naaf} onNaaf={onNaaf} />;
      break;
    case "advisor":
      body = <AdvisorStep naaf={draft.naaf} onNaaf={onNaaf} />;
      break;
    case "documents":
      body = (
        <DocumentsStep
          naaf={draft.naaf}
          supporting={draft.supporting}
          onChange={onSupporting}
          onboardingId={id}
          canUpload={canStore}
          uploadNote={demo ? "Uploads are off for mock data — these are marked as on file." : undefined}
          showFindings={showFindings}
        />
      );
      break;
    case "review":
      body = (
        <ReviewStep
          draft={draft}
          steps={steps}
          findings={findings}
          blocking={blocking}
          onGoTo={goTo}
          canStore={canStore}
          storageMessage={
            demo
              ? "This is mock data, so nothing is signed or filed."
              : save.kind === "unavailable"
                ? `${save.message} The onboarding can't be signed and filed until storage is back.`
                : id
                  ? null
                  : "The onboarding hasn't been saved yet, so it can't be signed and filed."
          }
          onFinish={finish}
        />
      );
      break;
  }

  const stepDef = steps[index];
  const stepFindings = findings.filter((f) => f.step === currentStep && f.kind !== "review");

  return (
    // The outer element is the size container; the layout inside queries it.
    // (An element's own @-variants cannot respond to its own width.)
    <div className="@container">
    <div className="mx-auto flex max-w-[1240px] flex-col gap-5 @4xl:flex-row @4xl:items-start">
      {/* ------------------------------------------------------------ menu */}
      <aside className="@4xl:sticky @4xl:top-20 @4xl:w-[260px] @4xl:shrink-0">
        <div className="rounded-[12px] border border-slate-200 bg-white p-3">
          <div className="px-2 pb-3 pt-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">New client onboarding</p>
            <p className="mt-0.5 truncate text-[15px] font-semibold text-slate-900">{clientName || "New client"}</p>
            <p className="text-[12.5px] text-slate-500">
              {form.label} account · {doneCount} of {steps.length - 1} sections done
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#0B6165] transition-all" style={{ width: `${(doneCount / (steps.length - 1)) * 100}%` }} />
            </div>
          </div>
          <nav aria-label="Onboarding sections">
            <ol className="flex flex-col gap-0.5">
              {steps.map((s, i) => {
                const status = statusOf(s.id);
                const active = s.id === currentStep;
                const seen = visited.has(s.id);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => goTo(s.id)}
                      aria-current={active ? "step" : undefined}
                      className={`flex w-full items-center gap-2.5 rounded-[8px] px-2 py-2 text-left transition ${
                        active ? "bg-[#EEF5F5]" : "hover:bg-slate-50"
                      }`}
                    >
                      <StepMarker n={i + 1} status={s.id === "review" ? (finished ? "complete" : "none") : seen || status === "complete" ? status : "none"} active={active} />
                      <span className="min-w-0">
                        <span className={`block truncate text-[13.5px] ${active ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                          {s.title}
                        </span>
                        <span className="block truncate text-[11.5px] text-slate-400">{s.hint}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className="mt-2 border-t border-slate-100 px-2 pt-2.5">
            {demo ? (
              <p className="text-[12px] font-medium text-violet-700">Mock data — not saved</p>
            ) : (
              <SaveIndicator save={save} />
            )}

            {id && (
              <Link
                href={`/dashboard/new-account?onboarding=${id}`}
                className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#0B6165] hover:underline"
              >
                <Columns2 aria-hidden className="h-3.5 w-3.5" />
                Open in the NAAF + CRQ forms
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------------ step */}
      <div ref={mainRef} className="@container min-w-0 flex-1">
        <header className="mb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-medium text-slate-400">
                Step {index + 1} of {steps.length}
              </p>
              <h2 className="text-[22px] font-semibold tracking-tight text-slate-900">{stepDef.title}</h2>
            </div>
            {!id && !demo && (
              <button
                type="button"
                onClick={fillWithMock}
                title="Fill every section with a fictional client, to see the whole onboarding and the filled forms"
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-violet-300 bg-white px-3 text-[13px] font-semibold text-violet-800 transition hover:bg-violet-50"
              >
                <FlaskConical aria-hidden className="h-4 w-4" />
                Fill with mock data · {form.label}
              </button>
            )}
          </div>
          {showFindings && stepFindings.length > 0 && currentStep !== "review" && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] text-red-700">
              <CircleAlert aria-hidden className="h-4 w-4" />
              {stepFindings.length} item{stepFindings.length === 1 ? "" : "s"} on this screen still need an answer.
            </p>
          )}
        </header>

        {demo && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-violet-200 bg-violet-50 px-4 py-3 text-[13.5px] text-violet-950">
            <span className="inline-flex items-center gap-2">
              <FlaskConical aria-hidden className="h-4 w-4 shrink-0" />
              Mock data — a fictional {form.label.toLowerCase()} client. Look through every section and preview the filled
              forms; nothing is saved to the client records.
            </span>
            <button
              type="button"
              onClick={leaveDemo}
              className="rounded-[7px] bg-violet-900 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-violet-950"
            >
              Start a real onboarding
            </button>
          </div>
        )}

        {!demo && save.kind === "unavailable" && currentStep !== "review" && (
          <p className="mb-4 rounded-[8px] border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-900">
            Not saved — {save.message} You can keep going; the forms can be previewed at the end, but not filed until storage is back.
          </p>
        )}

        <FindingContext.Provider value={lookup}>{body}</FindingContext.Provider>

        {currentStep !== "review" && (
          <div className="sticky bottom-0 z-20 -mx-1 mt-6 flex items-center justify-between gap-3 border-t border-slate-200 bg-[var(--background)]/95 px-1 py-3 backdrop-blur">
            <button
              type="button"
              onClick={() => index > 0 && goTo(steps[index - 1].id)}
              disabled={index === 0}
              className="inline-flex h-10 items-center gap-1.5 rounded-[8px] px-3 text-[14px] font-medium text-slate-600 hover:bg-slate-100 disabled:invisible"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => goTo(steps[index + 1].id)}
              className="inline-flex h-10 items-center gap-1.5 rounded-[8px] bg-[#0B6165] px-5 text-[14px] font-semibold text-white hover:bg-[#08504f]"
            >
              Continue to {steps[index + 1].title.toLowerCase()}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

function StepMarker({ n, status, active }: { n: number; status: StepStatus | "none"; active: boolean }) {
  if (status === "complete") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0B6165] text-white">
        <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} />
        <span className="sr-only">complete</span>
      </span>
    );
  }
  if (status === "incomplete") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-red-400 text-[11px] font-semibold text-red-600">
        !<span className="sr-only">incomplete</span>
      </span>
    );
  }
  if (status === "attention") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-semibold text-amber-800">
        {n}
        <span className="sr-only">complete, optional items blank</span>
      </span>
    );
  }
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
        active ? "border-[#0B6165] text-[#0B6165]" : "border-slate-300 text-slate-400"
      }`}
    >
      {n}
    </span>
  );
}

function SaveIndicator({ save }: { save: SaveState }) {
  switch (save.kind) {
    case "saving":
      return (
        <p className="inline-flex items-center gap-1.5 text-[12px] text-slate-500">
          <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> Saving…
        </p>
      );
    case "saved":
      return (
        <p className="text-[12px] text-slate-500">
          Saved {save.at.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}
        </p>
      );
    case "local":
      return <p className="text-[12px] text-slate-500">Saved to the client&apos;s record after this first step.</p>;
    case "unavailable":
      return <p className="text-[12px] font-medium text-amber-700">Not saved — storage unavailable</p>;
    case "error":
      return <p className="text-[12px] font-medium text-red-600">Save failed: {save.message}</p>;
  }
}
