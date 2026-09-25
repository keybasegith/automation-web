"use client";

/**
 * The digital New Account Application Form (V3-NAAF-2022), for advisors.
 *
 * Laid out section by section as printed, A through O. The completeness check
 * (lib/naaf/completeness) runs on every change; its findings are shown once the
 * advisor asks for a check, and stay live from then on so each item clears as
 * the box is filled.
 *
 * Controlled: the new-account workspace owns the state, so it can keep the
 * fields shared with the CRQ in step. Breakpoints are container queries, so
 * the form fits whatever width its pane has.
 */

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { ListChecks, Printer, RotateCcw } from "lucide-react";

import SignatureField from "@/components/risk-questionnaire/SignatureField";
import {
  ADVISOR_QUESTIONS,
  AGREEMENT_INTRO,
  AGREEMENT_POINTS,
  BANK_ACCOUNT_TYPES,
  BANK_OWNERS,
  CASL_CONSENT,
  CORPORATION_INTRO,
  CORPORATION_QUESTIONS,
  DEALER_ADDRESS,
  DEFINITIONS,
  DEFINITIONS_INTRO,
  EDD_CONSENT,
  FORM_FOOTER,
  FORM_TITLE,
  FORM_TYPES,
  FORM_VERSION,
  OBA_DISCLAIMER,
  OBA_INTRO,
  PLAN_COUNT,
  SECTION_TITLES,
  TCP_PARAGRAPH,
  THIRD_PARTY_FOLLOW_UP,
  THIRD_PARTY_INTRO,
  THIRD_PARTY_QUESTIONS,
  VOID_CHEQUE_LABEL,
} from "@/lib/naaf/config";
import { blankNaaf } from "@/lib/naaf/blank";
import {
  checkNaaf,
  fieldIds,
  isBlank,
  isPlanInUse,
  type IssueKind,
} from "@/lib/naaf/completeness";
import type { HolderInfo, InvestmentPlan, KycColumn, NaafState } from "@/lib/naaf/types";

import CompletenessPanel, { type SignatureStatus } from "./CompletenessPanel";
import HolderSection from "./HolderSection";
import KycSection from "./KycSection";
import PlanSection from "./PlanSection";
import {
  BoxField,
  FormText,
  IssueContext,
  LineField,
  SectionBar,
  SectionBody,
  TickBox,
  TickGroup,
  YesNoBoxes,
  issueRing,
  useIssue,
} from "./ui";

/** When one box has several findings, the outline shows the most serious. */
const SEVERITY: Record<IssueKind, number> = { signature: 3, blank: 2, invalid: 2, review: 1 };

/** Scrolls to a flagged field and focuses the first control in it. */
function jumpTo(fieldId: string) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const focusable =
    el instanceof HTMLInputElement ? el : el.querySelector<HTMLElement>("input:not([disabled]), textarea, canvas");
  focusable?.focus({ preventScroll: true });
}

export default function NaafForm({
  state,
  onChange,
  onPrint,
}: {
  state: NaafState;
  onChange: (update: (prev: NaafState) => NaafState) => void;
  /** Overrides the print button, for pages that show more than one form. */
  onPrint?: () => void;
}) {
  const [checked, setChecked] = useState(false);

  const report = useMemo(() => checkNaaf(state), [state]);

  const issueKinds = useMemo(() => {
    const map = new Map<string, IssueKind>();
    if (!checked) return map;
    for (const issue of report.issues) {
      const prev = map.get(issue.fieldId);
      if (!prev || SEVERITY[issue.kind] > SEVERITY[prev]) map.set(issue.fieldId, issue.kind);
    }
    return map;
  }, [checked, report]);
  const lookup = useCallback((id: string) => issueKinds.get(id), [issueKinds]);

  const update = onChange;
  const patch = (changes: Partial<NaafState>) => update((prev) => ({ ...prev, ...changes }));
  const patchHolder = (h: "A" | "B", changes: Partial<HolderInfo>) =>
    update((prev) => {
      const key = h === "A" ? "clientA" : "clientB";
      return { ...prev, [key]: { ...prev[key], ...changes } };
    });
  const patchKyc = (h: "A" | "B", changes: Partial<KycColumn>) =>
    update((prev) => ({ ...prev, kyc: { ...prev.kyc, [h]: { ...prev.kyc[h], ...changes } } }));
  const patchPlan = (index: number, changes: Partial<InvestmentPlan>) =>
    update((prev) => ({
      ...prev,
      plans: prev.plans.map((p, i) => (i === index ? { ...p, ...changes } : p)),
    }));
  const patchNested = <K extends "banking" | "tcp" | "oba" | "advisor">(key: K, changes: Partial<NaafState[K]>) =>
    update((prev) => ({ ...prev, [key]: { ...prev[key], ...changes } }));
  const patchSignature = (index: number, changes: Partial<NaafState["clientSignatures"][number]>) =>
    update((prev) => ({
      ...prev,
      clientSignatures: prev.clientSignatures.map((s, i) => (i === index ? { ...s, ...changes } : s)),
    }));

  const runCheck = () => {
    setChecked(true);
    // The results panel renders at the top of the form; bring it into view in
    // whichever element scrolls (the page, or a split-view pane).
    requestAnimationFrame(() =>
      document.getElementById("naaf-top")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const reset = () => {
    if (!window.confirm("Clear every field on this form? This cannot be undone.")) return;
    onChange(() => blankNaaf());
    setChecked(false);
  };

  const joint = state.hasJointHolder;

  const signatureStatus: SignatureStatus[] = [
    {
      label: joint ? "Client A" : "Client",
      signed: Boolean(state.clientSignatures[0].signature),
      dated: !isBlank(state.clientSignatures[0].date),
    },
    ...(joint
      ? [
          {
            label: "Client B",
            signed: Boolean(state.clientSignatures[1].signature),
            dated: !isBlank(state.clientSignatures[1].date),
          },
        ]
      : []),
    { label: "Advisor", signed: Boolean(state.advisor.signature), dated: !isBlank(state.advisor.date) },
  ];

  const formTypeIssue = lookup(fieldIds.formType);
  const blocking = report.blank + report.signatures + report.invalid;

  return (
    <IssueContext.Provider value={lookup}>
      <div id="naaf-top" className="crq-root naaf-root @container mx-auto max-w-[1180px] scroll-mt-4">
        {/* ------------------------------------------------ Action bar */}
        <nav
          aria-label="Form actions"
          className="naaf-no-print crq-no-print sticky top-0 z-20 -mx-4 mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur @xl:mx-0 @xl:rounded-t-[6px]"
        >
          <p className="text-[13px] font-medium text-slate-600" aria-live="polite">
            {!checked ? (
              "Fill the form in, then check it for blank boxes and missing signatures."
            ) : blocking === 0 ? (
              <span className="text-emerald-700">No blank boxes or missing signatures.</span>
            ) : (
              <span className="text-red-700">
                {blocking} item{blocking === 1 ? "" : "s"} still open
                {report.signatures > 0 &&
                  `, including ${report.signatures} missing signature${report.signatures === 1 ? "" : "s"}`}
                .
              </span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-9 items-center gap-1.5 rounded-[6px] px-3 text-[13px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <RotateCcw aria-hidden className="h-3.5 w-3.5" />
              Clear form
            </button>
            <button
              type="button"
              onClick={() => (onPrint ? onPrint() : window.print())}
              className="inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Printer aria-hidden className="h-4 w-4" />
              Print / Save as PDF
            </button>
            <button
              type="button"
              onClick={runCheck}
              className="inline-flex h-9 items-center gap-1.5 rounded-[6px] bg-[#006C67] px-4 text-[13px] font-semibold text-white transition hover:bg-[#00544f]"
            >
              <ListChecks aria-hidden className="h-4 w-4" />
              Check for blanks &amp; signatures
            </button>
          </div>
        </nav>

        {checked && <CompletenessPanel report={report} signatures={signatureStatus} onJump={jumpTo} />}

        <div className="naaf-paper rounded-[6px] border border-slate-200 bg-white px-3 pb-4 pt-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] @xl:px-6">
          {/* ------------------------------------------------ Header */}
          <header className="grid items-start gap-4 @2xl:grid-cols-[210px_minmax(0,1fr)_230px]">
            <Image
              src="/keybase-logo-nobg.png"
              alt="Keybase Financial Group"
              width={556}
              height={124}
              priority
              className="h-[46px] w-auto"
            />
            <div className="text-center">
              <h1 className="font-serif text-[28px] font-bold leading-tight text-[#006C67] @xl:text-[32px]">
                {FORM_TITLE}
              </h1>
              <fieldset
                id={fieldIds.formType}
                className={`mt-1 inline-flex scroll-mt-28 flex-wrap justify-center gap-x-5 gap-y-1 ${issueRing(formTypeIssue)}`}
              >
                <legend className="sr-only">Application type</legend>
                {FORM_TYPES.map((type) => (
                  <TickBox
                    key={type}
                    checked={state.formType === type}
                    onChange={(on) => patch({ formType: on ? type : null })}
                    label={
                      type === "Existing Client (New Plan)" ? (
                        <>
                          Existing Client <span className="text-[14px]">(New Plan)</span>
                        </>
                      ) : (
                        type
                      )
                    }
                    className="font-serif text-[18px]"
                  />
                ))}
              </fieldset>
            </div>
            <address className="text-[13px] not-italic leading-snug text-[#006C67] @2xl:text-right">
              {DEALER_ADDRESS.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </header>

          {/* ------------------------------------------------ A */}
          <SectionBar
            id="naaf-section-A"
            letter="A"
            title={
              <>
                {SECTION_TITLES.A} <span className="text-[14px] font-normal">(Client A)</span>
              </>
            }
            aside={
              <BoxField
                id={fieldIds.clientId}
                label="Client ID:"
                value={state.clientId}
                onChange={(clientId) => patch({ clientId })}
              />
            }
          />
          <SectionBody>
            <HolderSection holder="A" info={state.clientA} onChange={(c) => patchHolder("A", c)} />
          </SectionBody>

          {/* ------------------------------------------------ B */}
          <SectionBar
            id="naaf-section-B"
            letter="B"
            title={
              <>
                {SECTION_TITLES.B} <span className="text-[14px] font-normal">(Client B)</span>
              </>
            }
            aside={<JointToggle joint={joint} onChange={(hasJointHolder) => patch({ hasJointHolder })} />}
          />
          <SectionBody className={joint ? "" : "naaf-inactive"}>
            {!joint && (
              <p className="naaf-no-print mb-1 text-[12.5px] text-slate-500">
                No joint account holder. Tick “Joint application” above to complete Client B.
              </p>
            )}
            <fieldset disabled={!joint} className={joint ? "" : "opacity-45"}>
              <legend className="sr-only">Client B</legend>
              <HolderSection holder="B" info={state.clientB} onChange={(c) => patchHolder("B", c)} />
            </fieldset>
          </SectionBody>

          {/* ------------------------------------------------ C */}
          <SectionBar
            id="naaf-section-C"
            letter="C"
            title={
              <>
                {SECTION_TITLES.C}{" "}
                <span className="text-[14px] font-normal">(Complete “Client B&quot; for joint accounts)</span>
              </>
            }
            aside={
              <a href="#naaf-section-O" className="text-[14px] text-[#0000E0] underline-offset-2 hover:underline">
                Please refer to the KYC Terms and Definitions (Attached)
              </a>
            }
          />
          <SectionBody className="py-4">
            <KycSection
              kyc={state.kyc}
              joint={joint}
              onChange={patchKyc}
              onSpouseChange={(netWorthIncludesSpouse) =>
                update((prev) => ({ ...prev, kyc: { ...prev.kyc, netWorthIncludesSpouse } }))
              }
            />
          </SectionBody>
          <PageFoot page={1} />

          {/* ------------------------------------------------ D-F */}
          {state.plans.slice(0, PLAN_COUNT).map((plan, index) => (
            <PlanSection
              key={index}
              index={index}
              plan={plan}
              inUse={isPlanInUse(plan, index)}
              onChange={(c) => patchPlan(index, c)}
            />
          ))}

          {/* ------------------------------------------------ G */}
          <SectionBar id="naaf-section-G" letter="G" title={SECTION_TITLES.G} />
          <SectionBody>
            <p className="text-[14.5px] text-[#0000E0]">{THIRD_PARTY_INTRO}</p>
            <div className="mt-0.5 flex flex-col gap-1">
              {THIRD_PARTY_QUESTIONS.map((q) => (
                <div key={q.key} className="grid items-center gap-x-4 gap-y-0.5 @4xl:grid-cols-[minmax(0,1fr)_auto]">
                  <p className="text-[14.5px] text-[#0000E0]">
                    {q.text} {q.note && <span className="text-[12.5px]">{q.note}</span>}
                  </p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    {state.plans.map((plan, index) => (
                      <span key={index} className="inline-flex items-center gap-1.5 text-[13.5px] text-[#0000E0]">
                        Plan {index + 1}
                        <YesNoBoxes
                          id={fieldIds.plan(index, `tp-${q.key}`)}
                          legend={`Plan ${index + 1}: ${q.text}`}
                          yesLabel="YES"
                          value={plan.thirdParty[q.key]}
                          onChange={(v) => patchPlan(index, { thirdParty: { ...plan.thirdParty, [q.key]: v } })}
                        />
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-[13px] text-[#0000E0] @4xl:text-right">
                If you answered <b>YES</b> {THIRD_PARTY_FOLLOW_UP.replace("If you answered YES ", "")}
              </p>
            </div>

            <p className="mt-3 text-[14.5px] text-[#0000E0]">{CORPORATION_INTRO}</p>
            <div className="flex flex-col gap-0.5">
              {CORPORATION_QUESTIONS.map((q) => (
                <div key={q.key} className="flex flex-wrap items-center justify-between gap-x-4">
                  <p className="text-[14.5px] text-[#0000E0]">{q.text}</p>
                  <YesNoBoxes
                    id={fieldIds.corporation(q.key)}
                    legend={q.text}
                    yesLabel="YES"
                    value={state.corporation[q.key]}
                    onChange={(v) => patch({ corporation: { ...state.corporation, [q.key]: v } })}
                  />
                </div>
              ))}
            </div>
          </SectionBody>

          {/* ------------------------------------------------ H */}
          <SectionBar
            id="naaf-section-H"
            letter="H"
            title={SECTION_TITLES.H}
            aside={
              <TickBox
                checked={state.banking.voidChequeOnFile}
                onChange={(voidChequeOnFile) => patchNested("banking", { voidChequeOnFile })}
                label={VOID_CHEQUE_LABEL}
                className="text-[14.5px]"
              />
            }
          />
          <SectionBody>
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 text-[14.5px]">
              <TickGroup
                id={fieldIds.banking("owner")}
                legend="Personal or Business"
                options={BANK_OWNERS}
                value={state.banking.owner}
                onChange={(owner) => patchNested("banking", { owner })}
              />
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[#0000E0]">Account Type:</span>
                <TickGroup
                  id={fieldIds.banking("accountType")}
                  legend="Account Type"
                  options={BANK_ACCOUNT_TYPES}
                  value={state.banking.accountType}
                  onChange={(accountType) => patchNested("banking", { accountType })}
                  className="[&_div]:gap-x-8"
                />
              </div>
            </div>
            <div className="mt-1.5 grid gap-x-5 gap-y-1.5 @xl:grid-cols-[1.6fr_1fr_1fr_1.3fr]">
              <LineField id={fieldIds.banking("bankName")} label="Bank Name:" value={state.banking.bankName} onChange={(bankName) => patchNested("banking", { bankName })} />
              <LineField id={fieldIds.banking("transit")} label="Transit #:" value={state.banking.transit} onChange={(transit) => patchNested("banking", { transit })} inputMode="numeric" />
              <LineField id={fieldIds.banking("bankNumber")} label="Bank #:" value={state.banking.bankNumber} onChange={(bankNumber) => patchNested("banking", { bankNumber })} inputMode="numeric" />
              <LineField id={fieldIds.banking("accountNumber")} label="Account #:" value={state.banking.accountNumber} onChange={(accountNumber) => patchNested("banking", { accountNumber })} inputMode="numeric" />
            </div>
          </SectionBody>
          <PageFoot page={2} />

          {/* ------------------------------------------------ I */}
          <SectionBar id="naaf-section-I" letter="I" title={SECTION_TITLES.I} />
          <SectionBody>
            <FormText>{TCP_PARAGRAPH}</FormText>
            <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 @xl:grid-cols-5">
              {(
                [
                  ["surname", "Surname"],
                  ["firstName", "First Name"],
                  ["phone", "Phone Number"],
                  ["email", "Email Address"],
                  ["relationship", "Relationship to Client"],
                ] as const
              ).map(([field, caption]) => (
                <TcpField
                  key={field}
                  id={fieldIds.tcp(field)}
                  caption={caption}
                  value={state.tcp[field]}
                  onChange={(v) => patchNested("tcp", { [field]: v })}
                />
              ))}
            </div>
          </SectionBody>

          {/* ------------------------------------------------ J */}
          <SectionBar id="naaf-section-J" letter="J" title={SECTION_TITLES.J} />
          <SectionBody>
            <ConsentBox id={fieldIds.casl} checked={state.caslConsent} onChange={(caslConsent) => patch({ caslConsent })} text={CASL_CONSENT} />
          </SectionBody>

          {/* ------------------------------------------------ K */}
          <SectionBar id="naaf-section-K" letter="K" title={SECTION_TITLES.K} />
          <SectionBody>
            <ConsentBox id={fieldIds.edd} checked={state.eddConsent} onChange={(eddConsent) => patch({ eddConsent })} text={EDD_CONSENT} />
          </SectionBody>

          {/* ------------------------------------------------ L */}
          <SectionBar
            id="naaf-section-L"
            letter="L"
            title={SECTION_TITLES.L}
            aside={
              <TickBox
                id={fieldIds.oba("notApplicable")}
                checked={state.oba.notApplicable}
                onChange={(notApplicable) => patchNested("oba", { notApplicable })}
                label="Not Applicable"
                className="text-[15px]"
              />
            }
          />
          <SectionBody>
            <FormText>{OBA_INTRO}</FormText>
            <ObaDescription
              value={state.oba.description}
              disabled={state.oba.notApplicable}
              onChange={(description) => patchNested("oba", { description })}
            />
            <FormText className="mt-2">{OBA_DISCLAIMER}</FormText>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-16 gap-y-2">
              <BoxField
                id={fieldIds.oba("primaryInitials")}
                label={<span className="font-normal">Primary Account Holder’s Initials:</span>}
                value={state.oba.primaryInitials}
                onChange={(primaryInitials) => patchNested("oba", { primaryInitials })}
                inputClassName="w-20 text-center"
              />
              <BoxField
                id={fieldIds.oba("jointInitials")}
                label={<span className="font-normal">Joint Account Holder’s Initials:</span>}
                value={state.oba.jointInitials}
                onChange={(jointInitials) => patchNested("oba", { jointInitials })}
                inputClassName="w-20 text-center"
              />
            </div>
          </SectionBody>

          {/* ------------------------------------------------ M */}
          <SectionBar id="naaf-section-M" letter="M" title={SECTION_TITLES.M} />
          <SectionBody>
            <p className="text-[14.5px] text-[#0000E0]">{AGREEMENT_INTRO}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-10 text-[14.5px] leading-snug text-[#0000E0]">
              {AGREEMENT_POINTS.map((point) => (
                <li key={point.slice(0, 30)}>{point}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-5">
              {[0, 1].map((i) => (
                <SignatureRow
                  key={i}
                  signatureId={fieldIds.clientSignature(i)}
                  dateId={fieldIds.clientDate(i)}
                  label="Client Signature:"
                  hint={i === 0 ? (joint ? "Client A" : undefined) : "Client B — joint accounts only"}
                  inactive={i === 1 && !joint}
                  signature={state.clientSignatures[i].signature}
                  date={state.clientSignatures[i].date}
                  onSignature={(signature) => patchSignature(i, { signature })}
                  onDate={(date) => patchSignature(i, { date })}
                />
              ))}
            </div>
          </SectionBody>

          {/* ------------------------------------------------ N */}
          <SectionBar
            id="naaf-section-N"
            letter="N"
            title={SECTION_TITLES.N}
            aside={
              <>
                <BoxField id={fieldIds.advisor("dealerCode")} label="Dealer Code:" value={state.advisor.dealerCode} onChange={(dealerCode) => patchNested("advisor", { dealerCode })} inputClassName="w-28" />
                <BoxField id={fieldIds.advisor("repCode")} label="Rep Code:" value={state.advisor.repCode} onChange={(repCode) => patchNested("advisor", { repCode })} inputClassName="w-28" />
              </>
            }
          />
          <SectionBody>
            <div className="flex flex-col gap-1">
              {ADVISOR_QUESTIONS.map((q) => (
                <div key={q.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5">
                  <p className="text-[14.5px] text-[#0000E0]">
                    {q.text} {q.note && <span className="text-[12.5px]">{q.note}</span>}
                  </p>
                  <YesNoBoxes
                    id={fieldIds.advisor(q.key)}
                    legend={q.text}
                    value={state.advisor.answers[q.key]}
                    onChange={(v) => patchNested("advisor", { answers: { ...state.advisor.answers, [q.key]: v } })}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 @4xl:grid-cols-[260px_minmax(0,1fr)]">
              <LineField
                id={fieldIds.advisor("name")}
                label="Advisor’s Name:"
                value={state.advisor.name}
                onChange={(name) => patchNested("advisor", { name })}
                className="self-start pt-7"
              />
              <SignatureRow
                signatureId={fieldIds.advisor("signature")}
                dateId={fieldIds.advisor("date")}
                label="Signature:"
                signature={state.advisor.signature}
                date={state.advisor.date}
                onSignature={(signature) => patchNested("advisor", { signature })}
                onDate={(date) => patchNested("advisor", { date })}
              />
            </div>
          </SectionBody>
          <PageFoot page={3} />

          {/* ------------------------------------------------ O (page 4) */}
          <section className="naaf-definitions">
            <SectionBar id="naaf-section-O" letter="O" title={SECTION_TITLES.O} />
            <SectionBody className="py-4">
              <FormText>{DEFINITIONS_INTRO}</FormText>
              <div className="mt-3 gap-8 @2xl:columns-2">
                {DEFINITIONS.map((block) => (
                  <div key={block.heading} className="mb-3 break-inside-avoid-column">
                    <h3 className="text-center text-[15px] font-bold text-[#0000E0]">{block.heading}</h3>
                    {block.paragraphs.map((p) => (
                      <FormText key={p.slice(0, 24)} className="mt-1 text-[13.5px]">
                        {p}
                      </FormText>
                    ))}
                    {block.terms?.map((t) => (
                      <FormText key={t.term} className="mt-1.5 text-[13.5px]">
                        <b>{t.term}</b> {t.text}
                      </FormText>
                    ))}
                  </div>
                ))}
              </div>
            </SectionBody>
            <PageFoot page={4} />
          </section>
        </div>
      </div>
    </IssueContext.Provider>
  );
}

// ---------------------------------------------------------------- pieces

/** Digital-only switch: whether Section B applies. Not printed. */
function JointToggle({ joint, onChange }: { joint: boolean; onChange: (joint: boolean) => void }) {
  const issue = useIssue(fieldIds.jointToggle);
  return (
    <span id={fieldIds.jointToggle} className={`naaf-no-print crq-no-print scroll-mt-28 rounded-full bg-white px-3 py-1 ring-1 ring-slate-300 ${issueRing(issue)}`}>
      <TickBox checked={joint} onChange={onChange} label="Joint application — complete Client B" className="text-[13px] font-medium" />
    </span>
  );
}

function PageFoot({ page }: { page: number }) {
  return (
    <div className="naaf-page-foot mt-2 grid grid-cols-3 items-end pb-4 text-black">
      <span className="text-[12px]">{FORM_VERSION}</span>
      <span className="text-center font-serif text-[16px] font-bold">{FORM_FOOTER}</span>
      <span className="text-right font-serif text-[15px]">{page}| Page</span>
    </div>
  );
}

function ConsentBox({
  id,
  checked,
  onChange,
  text,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  text: string;
}) {
  const issue = useIssue(id);
  return (
    <label className={`flex cursor-pointer items-start gap-2 ${issueRing(issue)}`}>
      <span className="pt-[3px]">
        <TickBox id={id} checked={checked} onChange={onChange} ariaLabel={text.slice(0, 60)} />
      </span>
      <span className="text-justify text-[14.5px] leading-snug text-[#0000E0]">{text}</span>
    </label>
  );
}

function TcpField({
  id,
  caption,
  value,
  onChange,
}: {
  id: string;
  caption: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="text-center">
      <LineField id={id} label={caption} srLabel value={value} onChange={onChange} />
      <p aria-hidden className="mt-0.5 text-[13px] text-[#0000E0]">
        {caption}
      </p>
    </div>
  );
}

function ObaDescription({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const id = fieldIds.oba("description");
  const issue = useIssue(id);
  const tone = !issue ? "border-slate-300" : issue === "review" ? "border-amber-500 bg-amber-50" : "border-red-500 bg-red-50";
  return (
    <div className="mt-2">
      <label htmlFor={id} className="sr-only">
        Products and/or services your Financial Advisor also provides
      </label>
      <textarea
        id={id}
        rows={3}
        value={value}
        disabled={disabled}
        placeholder={disabled ? "Not applicable" : "Organization name and the products and/or services provided"}
        onChange={(e) => onChange(e.target.value)}
        className={`naaf-textarea w-full scroll-mt-28 resize-y border px-2.5 py-2 text-[15px] text-black outline-none placeholder:text-slate-400 focus-visible:border-[#006C67] disabled:cursor-not-allowed disabled:bg-slate-50 ${tone}`}
      />
    </div>
  );
}

/** A signature pad with its Date box, as laid out in Sections M and N. */
function SignatureRow({
  signatureId,
  dateId,
  label,
  hint,
  inactive = false,
  signature,
  date,
  onSignature,
  onDate,
}: {
  signatureId: string;
  dateId: string;
  label: string;
  hint?: string;
  inactive?: boolean;
  signature: string | null;
  date: string;
  onSignature: (value: string | null) => void;
  onDate: (value: string) => void;
}) {
  const sigIssue = useIssue(signatureId);
  return (
    <div inert={inactive} className={`grid items-end gap-4 @2xl:grid-cols-[minmax(0,1fr)_220px] ${inactive ? "opacity-45" : ""}`}>
      <div className="naaf-signature">
        <SignatureField
          id={signatureId}
          label={hint ? `${label} (${hint})` : label}
          value={signature}
          onChange={onSignature}
          invalid={Boolean(sigIssue)}
          error={sigIssue ? "Signature missing." : undefined}
          helperText="Sign with a mouse, finger, or stylus."
        />
      </div>
      <LineField id={dateId} label="Date:" type="date" value={date} onChange={onDate} className="pb-10" />
    </div>
  );
}
