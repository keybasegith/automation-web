"use client";

/**
 * The new-account workspace: the NAAF and the CRQ side by side, one state.
 *
 * Holding both forms here, rather than each on its own page, is what lets a
 * field typed into one appear in the other (lib/new-account/sync). Each pane
 * scrolls on its own, the divider can be dragged, and either form can be shown
 * alone. Below the lg breakpoint there is no room for two forms, so the panes
 * become tabs.
 *
 * Nothing is persisted: the forms hold SINs, ID numbers and a client's
 * financial profile, and there is no encrypted draft store to put them in.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Columns2, FileText, FlaskConical, RotateCcw, ClipboardList } from "lucide-react";

import NaafForm from "@/components/naaf/NaafForm";
import ClientRiskQuestionnaire from "@/components/risk-questionnaire/ClientRiskQuestionnaire";
import CrqVariantPicker from "@/components/risk-questionnaire/CrqVariantPicker";
import { blankNaaf } from "@/lib/naaf/blank";
import { isEntity } from "@/lib/naaf/completeness";
import type { NaafState } from "@/lib/naaf/types";
import { linkNotes, propagateFromCrq, propagateFromNaaf, relinkForVariant } from "@/lib/new-account/sync";
import { blankQuestionnaire } from "@/lib/risk-questionnaire/blank";
import { CRQ_FORMS } from "@/lib/risk-questionnaire/forms";
import type { CrqVariant, QuestionnaireState } from "@/lib/risk-questionnaire/types";
import type { OnboardingDraft } from "@/lib/client-onboarding/draft";
import { mockDraft } from "@/lib/client-onboarding/mock";

type Layout = "split" | "naaf" | "crq";
type Pane = "naaf" | "crq";

interface Workspace {
  naaf: NaafState;
  crq: QuestionnaireState;
  variant: CrqVariant;
}

const MIN_RATIO = 0.3;
const MAX_RATIO = 0.7;

/**
 * Whether the window is wide enough for two forms side by side.
 *
 * Printing counts as wide. Print lays the page out at paper width, which is
 * narrower than the breakpoint; without "print" here the workspace would drop
 * to one pane mid-print and unmount the very form being printed.
 */
const WIDE_QUERY = "(min-width: 1024px), print";

function useWide(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(WIDE_QUERY);
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );
}

/**
 * Prints one form. Both forms are .crq-root elements, which the print styles
 * lift out of the page on their own; the body attribute hides the other one.
 */
function printPane(pane: Pane) {
  document.body.dataset.printPane = pane;
  const clear = () => {
    delete document.body.dataset.printPane;
    window.removeEventListener("afterprint", clear);
  };
  window.addEventListener("afterprint", clear);
  window.print();
}

export interface SavedOnboarding {
  id: string;
  draft: OnboardingDraft;
  /** False once sent for signature or signed: edits are not saved back. */
  editable: boolean;
  clientName: string;
}

const AUTOSAVE_MS = 1200;

export default function NewAccountWorkspace({
  initialVariant,
  initialLayout = "split",
  onboarding,
}: {
  initialVariant: CrqVariant;
  initialLayout?: Layout;
  /** A saved wizard onboarding opened in the forms. */
  onboarding?: SavedOnboarding;
}) {
  const [ws, setWs] = useState<Workspace>(() =>
    onboarding
      ? { ...onboarding.draft }
      : { naaf: blankNaaf(), crq: blankQuestionnaire(), variant: initialVariant },
  );
  const [dirty, setDirty] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [ratio, setRatio] = useState(0.5);
  const wide = useWide();
  const splitRef = useRef<HTMLDivElement>(null);

  // One narrow window shows one form at a time.
  const effectiveLayout: Layout = !wide && layout === "split" ? "naaf" : layout;

  // A saved onboarding: write edits back a moment after they stop.
  useEffect(() => {
    if (!onboarding?.editable || !dirty) return;
    const timer = setTimeout(async () => {
      setSaveNote("Saving…");
      try {
        const res = await fetch(`/api/client-onboarding/${onboarding.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft: ws }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `Save failed (${res.status}).`);
        setDirty(false);
        setSaveNote(`Saved ${new Date().toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}`);
      } catch (err) {
        setSaveNote(err instanceof Error ? `Not saved — ${err.message}` : "Not saved");
      }
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [ws, dirty, onboarding]);

  // Leaving the page would discard both forms; ask first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const updateNaaf = useCallback((update: (prev: NaafState) => NaafState) => {
    setDirty(true);
    setWs((prev) => {
      const naaf = update(prev.naaf);
      return { ...prev, naaf, crq: propagateFromNaaf(prev.naaf, naaf, prev.crq, prev.variant) };
    });
  }, []);

  const updateCrq = useCallback((update: (prev: QuestionnaireState) => QuestionnaireState) => {
    setDirty(true);
    setWs((prev) => {
      const crq = update(prev.crq);
      return { ...prev, crq, naaf: propagateFromCrq(prev.crq, crq, prev.naaf, prev.variant) };
    });
  }, []);

  const changeVariant = (variant: CrqVariant) =>
    setWs((prev) =>
      prev.variant === variant
        ? prev
        : { ...prev, variant, crq: relinkForVariant(prev.naaf, prev.crq, prev.variant, variant) },
    );

  const startOver = () => {
    if (!window.confirm("Clear both forms and start a new application? This cannot be undone.")) return;
    setWs((prev) => ({ naaf: blankNaaf(), crq: blankQuestionnaire(), variant: prev.variant }));
    setDirty(false);
  };

  const notes = useMemo(() => linkNotes(ws.naaf, ws.crq, ws.variant), [ws]);

  // The NAAF says what kind of account this is; point out a CRQ edition that disagrees.
  const suggested: CrqVariant | null = isEntity(ws.naaf.clientA.holderType)
    ? "corporate"
    : ws.naaf.hasJointHolder
      ? "joint"
      : null;
  const suggestion = suggested && suggested !== ws.variant ? suggested : null;

  // ---------------------------------------------------------------- divider drag
  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const box = splitRef.current?.getBoundingClientRect();
      if (!box) return;
      const next = (ev.clientX - box.left) / box.width;
      setRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, next)));
    };
    const stop = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", stop);
      target.removeEventListener("pointercancel", stop);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", stop);
    target.addEventListener("pointercancel", stop);
  };

  const nudge = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowLeft" ? -0.05 : e.key === "ArrowRight" ? 0.05 : 0;
    if (!step) return;
    e.preventDefault();
    setRatio((r) => Math.min(MAX_RATIO, Math.max(MIN_RATIO, r + step)));
  };

  const showNaaf = effectiveLayout !== "crq";
  const showCrq = effectiveLayout !== "naaf";
  const split = effectiveLayout === "split";

  return (
    <div className="naw-root flex h-[calc(100dvh-7.5rem)] min-h-[560px] flex-col">
      {/* ------------------------------------------------------ Toolbar */}
      <div className="crq-no-print naaf-no-print mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-brand">Financial Advisors</p>
          <h2 className="text-[20px] font-semibold tracking-tight text-slate-900">
            {onboarding ? onboarding.clientName || "Saved onboarding" : "New Account Application"}
          </h2>
          {onboarding && (
            <p className="text-[12px] text-slate-500">
              <a href={`/onboarding/${onboarding.id}`} className="text-[#0B6165] hover:underline">
                Onboarding record
              </a>
              {onboarding.editable ? (saveNote ? ` · ${saveNote}` : " · Changes save automatically") : " · Signed — read only"}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-medium text-slate-500">CRQ</span>
          <CrqVariantPicker value={ws.variant} onChange={changeVariant} />

          <div role="radiogroup" aria-label="Layout" className="inline-flex rounded-[7px] border border-slate-200 bg-slate-50 p-0.5">
            {(
              [
                ...(wide ? [["split", "Side by side", Columns2] as const] : []),
                ["naaf", "NAAF", FileText] as const,
                ["crq", "CRQ", ClipboardList] as const,
              ] as const
            ).map(([value, label, Icon]) => {
              const selected = effectiveLayout === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setLayout(value)}
                  className={`inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1.5 text-[13px] font-medium transition ${
                    selected ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Icon aria-hidden className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>

          {!onboarding && (
            <button
              type="button"
              onClick={() => {
                if (dirty && !window.confirm("Replace what you've entered with mock data?")) return;
                const mock = mockDraft(ws.variant);
                setWs({ naaf: mock.naaf, crq: mock.crq, variant: mock.variant });
                setDirty(false);
              }}
              title="Fill both forms with a fictional client"
              className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-violet-300 bg-white px-2.5 text-[13px] font-semibold text-violet-800 hover:bg-violet-50"
            >
              <FlaskConical aria-hidden className="h-3.5 w-3.5" />
              Mock data
            </button>
          )}
          {!onboarding && (
          <button
            type="button"
            onClick={startOver}
            className="inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-[13px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <RotateCcw aria-hidden className="h-3.5 w-3.5" />
            Start over
          </button>
          )}
        </div>
      </div>

      {suggestion && (
        <div
          role="status"
          className="crq-no-print naaf-no-print mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900"
        >
          <span>
            The NAAF is {suggestion === "corporate" ? "for an entity (Section A)" : "a joint application (Section B)"}, but
            the CRQ is the {CRQ_FORMS[ws.variant].label} edition.
          </span>
          <button
            type="button"
            onClick={() => changeVariant(suggestion)}
            className="rounded-[5px] bg-amber-900 px-2.5 py-1 text-[12.5px] font-semibold text-white hover:bg-amber-950"
          >
            Switch CRQ to {CRQ_FORMS[suggestion].label}
          </button>
        </div>
      )}

      {/* ------------------------------------------------------ Panes
          Each pane is `relative` so the forms' visually hidden (absolutely
          positioned) labels are clipped by the pane's own scroll area instead
          of stretching the page behind it. */}
      <div ref={splitRef} className="naw-split flex min-h-0 flex-1 gap-0">
        {showNaaf && (
          <section
            aria-label="New Account Application Form"
            className="naw-pane relative min-w-0 overflow-y-auto rounded-[8px] border border-slate-200 bg-slate-50/60 p-3"
            style={split ? { flexBasis: `${ratio * 100}%`, flexGrow: 0, flexShrink: 0 } : { flex: 1 }}
          >
            <NaafForm state={ws.naaf} onChange={updateNaaf} onPrint={() => printPane("naaf")} />
          </section>
        )}

        {split && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize the two forms"
            aria-valuemin={MIN_RATIO * 100}
            aria-valuemax={MAX_RATIO * 100}
            aria-valuenow={Math.round(ratio * 100)}
            tabIndex={0}
            onPointerDown={startDrag}
            onKeyDown={nudge}
            onDoubleClick={() => setRatio(0.5)}
            className="crq-no-print group flex w-3 shrink-0 cursor-col-resize touch-none items-center justify-center outline-none"
          >
            <span className="h-12 w-1 rounded-full bg-slate-300 transition group-hover:bg-[#0B6165] group-focus-visible:bg-[#0B6165]" />
          </div>
        )}

        {showCrq && (
          <section
            aria-label={`Client Risk Questionnaire — ${CRQ_FORMS[ws.variant].subtitle}`}
            className="naw-pane relative min-w-0 flex-1 overflow-y-auto rounded-[8px] border border-slate-200 bg-slate-50/60 p-3"
          >
            <ClientRiskQuestionnaire
              key={ws.variant}
              form={CRQ_FORMS[ws.variant]}
              state={ws.crq}
              onChange={updateCrq}
              answerNotes={notes}
              onPrint={() => printPane("crq")}
            />
          </section>
        )}
      </div>
    </div>
  );
}
