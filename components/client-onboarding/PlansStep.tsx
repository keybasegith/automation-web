"use client";

/**
 * Investment plans (NAAF Sections D–F), the general account-opening questions
 * (G) and banking (H), on one screen.
 *
 * The NAAF prints Current and New columns for every allocation. A new client
 * or a new plan has nothing current to report, so the Current column is shown
 * only on a KYC update.
 */

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  ACCOUNT_TYPE_GROUPS,
  BANK_ACCOUNT_TYPES,
  BANK_OWNERS,
  BENEFICIARY_REQUIRED_TYPES,
  CORPORATION_QUESTIONS,
  INTENDED_USES,
  INVESTMENT_OBJECTIVES,
  JOINT_ACCOUNT_TYPES,
  LEVERAGE_QUESTION,
  PLAN_COUNT,
  REGISTRATIONS,
  RISK_TOLERANCES,
  SIGNING_AUTHORITIES,
  THIRD_PARTY_FOLLOW_UP,
  THIRD_PARTY_INTRO,
  THIRD_PARTY_QUESTIONS,
  TIME_HORIZONS,
  VOID_CHEQUE_LABEL,
  type AccountType,
  type PlanColumn,
} from "@/lib/naaf/config";
import { blankPlan } from "@/lib/naaf/blank";
import { allocationTotal, fieldIds, isEntity, isPlanInUse } from "@/lib/naaf/completeness";
import type { InvestmentPlan, NaafState } from "@/lib/naaf/types";

import { Checkbox, CheckboxGroup, Choice, Grid, Section, Select, TextInput, YesNo } from "./fields";

type OnNaaf = (update: (prev: NaafState) => NaafState) => void;

const ALL_TYPES = ACCOUNT_TYPE_GROUPS.flatMap((g) => g.types.map((t) => ({ group: g.label.replace(":", ""), type: t as AccountType })));

export default function PlansStep({ naaf, onNaaf }: { naaf: NaafState; onNaaf: OnNaaf }) {
  const inUse = naaf.plans.map((p, i) => isPlanInUse(p, i));
  const [shown, setShown] = useState(() => Math.max(1, inUse.lastIndexOf(true) + 1));
  const showCurrent = naaf.formType === "KYC Update";
  const corporate = isEntity(naaf.clientA.holderType) || naaf.plans.some((p) => p.accountType === "Corporate");

  const setPlan = (index: number, changes: Partial<InvestmentPlan>) =>
    onNaaf((p) => ({ ...p, plans: p.plans.map((plan, i) => (i === index ? { ...plan, ...changes } : plan)) }));

  const removePlan = (index: number) => {
    // Later plans move up so the NAAF never has a gap between Plan 1 and Plan 3.
    onNaaf((p) => {
      const kept = p.plans.filter((_, i) => i !== index);
      return { ...p, plans: [...kept, blankPlan()] };
    });
    setShown((n) => Math.max(1, n - 1));
  };

  const bank = naaf.banking;
  const setBank = (changes: Partial<NaafState["banking"]>) => onNaaf((p) => ({ ...p, banking: { ...p.banking, ...changes } }));

  const thirdPartyYes = naaf.plans.some((p, i) => isPlanInUse(p, i) && Object.values(p.thirdParty).includes("Yes"));
  const jointTypeWithoutB = naaf.plans.some(
    (p, i) => isPlanInUse(p, i) && p.accountType !== null && JOINT_ACCOUNT_TYPES.includes(p.accountType),
  );

  return (
    <div className="flex flex-col gap-4">
      {!naaf.hasJointHolder && thirdPartyYes && (
        <div id={fieldIds.jointToggle} className="flex scroll-mt-32 flex-wrap items-center justify-between gap-3 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-900">
          <span>
            Someone other than the applicant has an interest in, authority over, or will deposit to a plan. {THIRD_PARTY_FOLLOW_UP}.
          </span>
          <button
            type="button"
            onClick={() => onNaaf((p) => ({ ...p, hasJointHolder: true }))}
            className="rounded-[7px] bg-amber-900 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-amber-950"
          >
            Add the third party (Section B)
          </button>
        </div>
      )}
      {!naaf.hasJointHolder && jointTypeWithoutB && (
        <p className="rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-900">
          A plan is a Joint account type, but this application has one account holder. Choose <b>Joint</b> on the Getting
          started screen, or pick a different account type.
        </p>
      )}
      {naaf.plans.slice(0, shown).map((plan, index) => (
        <PlanCard
          key={index}
          index={index}
          plan={plan}
          joint={naaf.hasJointHolder}
          showCurrent={showCurrent}
          onChange={(changes) => setPlan(index, changes)}
          onRemove={index > 0 ? () => removePlan(index) : undefined}
        />
      ))}

      {shown < PLAN_COUNT && (
        <button
          type="button"
          onClick={() => setShown((n) => n + 1)}
          className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-dashed border-slate-300 bg-white px-4 py-3 text-[14px] font-medium text-slate-600 transition hover:border-[#0B6165] hover:text-[#0B6165]"
        >
          <Plus aria-hidden className="h-4 w-4" />
          Add plan {shown + 1} <span className="font-normal text-slate-400">(the NAAF has room for {PLAN_COUNT})</span>
        </button>
      )}

      {corporate && (
        <Section title="For corporations">
          <div className="flex flex-col gap-4">
            {CORPORATION_QUESTIONS.map((q) => (
              <YesNo
                key={q.key}
                id={fieldIds.corporation(q.key)}
                label={q.text}
                value={naaf.corporation[q.key]}
                onChange={(v) => onNaaf((p) => ({ ...p, corporation: { ...p.corporation, [q.key]: v } }))}
              />
            ))}
          </div>
        </Section>
      )}

      <Section title="Banking" description="For pre-authorized contributions and withdrawals. Leave blank if not needed.">
        <Checkbox checked={bank.voidChequeOnFile} onChange={(voidChequeOnFile) => setBank({ voidChequeOnFile })}>
          {VOID_CHEQUE_LABEL}
        </Checkbox>
        {!bank.voidChequeOnFile && (
          <div className="mt-4">
            <Grid cols={3}>
              <Choice id={fieldIds.banking("owner")} label="Account owner" options={BANK_OWNERS} value={bank.owner} onChange={(owner) => setBank({ owner })} />
              <Choice
                id={fieldIds.banking("accountType")}
                label="Account type"
                options={BANK_ACCOUNT_TYPES}
                value={bank.accountType}
                onChange={(accountType) => setBank({ accountType })}
              />
              <TextInput id={fieldIds.banking("bankName")} label="Bank name" value={bank.bankName} onChange={(bankName) => setBank({ bankName })} />
              <TextInput id={fieldIds.banking("transit")} label="Transit #" inputMode="numeric" value={bank.transit} onChange={(transit) => setBank({ transit })} />
              <TextInput id={fieldIds.banking("bankNumber")} label="Bank #" inputMode="numeric" value={bank.bankNumber} onChange={(bankNumber) => setBank({ bankNumber })} />
              <TextInput id={fieldIds.banking("accountNumber")} label="Account #" inputMode="numeric" value={bank.accountNumber} onChange={(accountNumber) => setBank({ accountNumber })} />
            </Grid>
          </div>
        )}
      </Section>
    </div>
  );
}

function PlanCard({
  index,
  plan,
  joint,
  showCurrent,
  onChange,
  onRemove,
}: {
  index: number;
  plan: InvestmentPlan;
  joint: boolean;
  showCurrent: boolean;
  onChange: (changes: Partial<InvestmentPlan>) => void;
  onRemove?: () => void;
}) {
  const id = (field: string) => fieldIds.plan(index, field);
  const columns: PlanColumn[] = showCurrent ? ["current", "new"] : ["new"];
  const needsBeneficiary = plan.accountType !== null && BENEFICIARY_REQUIRED_TYPES.includes(plan.accountType);
  const isJointType = plan.accountType !== null && JOINT_ACCOUNT_TYPES.includes(plan.accountType);
  const [showBeneficiary, setShowBeneficiary] = useState(() => plan.beneficiary.name.trim() !== "");

  return (
    <section className="rounded-[10px] border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 @xl:px-5">
        <h3 className="text-[15px] font-semibold text-slate-900">
          Plan {index + 1} <span className="font-normal text-slate-400">· NAAF Section {"DEF"[index]}</span>
        </h3>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-[13px] text-slate-500 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 aria-hidden className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </header>

      <div className="flex flex-col gap-5 p-4 @xl:p-5">
        <Grid cols={3}>
          <TextInput id={id("planIdType")} label="Plan ID & plan type" value={plan.planIdType} onChange={(planIdType) => onChange({ planIdType })} placeholder="e.g. RRSP" />
          <Select
            id={id("accountType")}
            label="Account type"
            options={ALL_TYPES.map((t) => t.type)}
            labels={Object.fromEntries(ALL_TYPES.map((t) => [t.type, `${t.type} — ${t.group}`]))}
            value={plan.accountType}
            onChange={(accountType) => onChange({ accountType })}
          />
          {plan.accountType === "Other" ? (
            <TextInput id={id("accountTypeOther")} label="Other type" value={plan.accountTypeOther} onChange={(accountTypeOther) => onChange({ accountTypeOther })} />
          ) : (
            <div />
          )}
          {joint && (
            <Choice
              id={id("owner")}
              label="Plan owner"
              options={["A", "B"] as const}
              labels={{ A: "Client A", B: "Client B" }}
              value={plan.owner}
              onChange={(owner) => onChange({ owner })}
            />
          )}
          <Choice
            id={id("registration")}
            label="Registration"
            options={REGISTRATIONS.map((r) => r.value)}
            labels={{ client: "Client name", nominee: "Keybase nominee", intermediary: "Intermediary" }}
            value={plan.registration}
            onChange={(registration) => onChange({ registration })}
            className={joint ? "@3xl:col-span-2" : "@3xl:col-span-3"}
          />
          {plan.registration === "intermediary" && (
            <TextInput id={id("intermediary")} label="Intermediary name & account #" value={plan.intermediary} onChange={(intermediary) => onChange({ intermediary })} />
          )}
          {isJointType && (
            <Choice
              id={id("signingAuthority")}
              label="Signing authority"
              options={SIGNING_AUTHORITIES}
              value={plan.signingAuthority}
              onChange={(signingAuthority) => onChange({ signingAuthority })}
              className="@3xl:col-span-2"
            />
          )}
        </Grid>

        <div className="flex flex-col gap-3">
          <YesNo id={id("leverage")} label={<><b className="font-medium">Leverage:</b> {LEVERAGE_QUESTION}</>} value={plan.leverage} onChange={(leverage) => onChange({ leverage })} />
          {plan.leverage === "Yes" && (
            <TextInput id={id("lendingInstitution")} label="Lending institution" value={plan.lendingInstitution} onChange={(lendingInstitution) => onChange({ lendingInstitution })} className="max-w-sm" />
          )}
        </div>

        <div className="grid gap-5 @3xl:grid-cols-2">
          <PercentTable
            id={id("objectives")}
            title="Investment objectives"
            rows={INVESTMENT_OBJECTIVES}
            columns={columns}
            values={plan.objectives}
            onChange={(column, row, value) =>
              onChange({ objectives: { ...plan.objectives, [column]: { ...plan.objectives[column], [row]: value } } })
            }
          />
          <PercentTable
            id={id("riskTolerance")}
            title="Risk tolerance"
            rows={RISK_TOLERANCES}
            columns={columns}
            values={plan.riskTolerance}
            onChange={(column, row, value) =>
              onChange({ riskTolerance: { ...plan.riskTolerance, [column]: { ...plan.riskTolerance[column], [row]: value } } })
            }
          />
        </div>

        <Grid cols={2}>
          {columns.map((column) => (
            <Select
              key={column}
              id={column === "new" ? id("timeHorizon") : `${id("timeHorizon")}-current`}
              label={showCurrent ? `Time horizon (${column})` : "Time horizon"}
              options={TIME_HORIZONS}
              value={plan.timeHorizon[column]}
              onChange={(v) => onChange({ timeHorizon: { ...plan.timeHorizon, [column]: v } })}
            />
          ))}
        </Grid>

        {columns.map((column) => (
          <CheckboxGroup
            key={column}
            id={column === "new" ? id("intendedUse") : `${id("intendedUse")}-current`}
            label={showCurrent ? `Intended use of account (${column})` : "Intended use of account"}
            options={INTENDED_USES}
            values={plan.intendedUse[column]}
            onChange={(v) => onChange({ intendedUse: { ...plan.intendedUse, [column]: v } })}
          />
        ))}
        {[...plan.intendedUse.current, ...plan.intendedUse.new].includes("Other: Please Specify") && (
          <TextInput id={id("intendedUseOther")} label="Other intended use" value={plan.intendedUseOther} onChange={(intendedUseOther) => onChange({ intendedUseOther })} className="max-w-md" />
        )}

        <div className="rounded-[8px] bg-slate-50 p-3.5">
          {needsBeneficiary || showBeneficiary ? (
            <>
              <p className="mb-3 text-[13px] font-medium text-slate-700">
                Beneficiary / ITF {needsBeneficiary && <span className="font-normal text-slate-500">— required for a {plan.accountType} plan</span>}
              </p>
              <Grid cols={3}>
                <TextInput id={id("beneficiary-name")} label="Name" value={plan.beneficiary.name} onChange={(name) => onChange({ beneficiary: { ...plan.beneficiary, name } })} />
                <TextInput id={id("beneficiary-dob")} label="Date of birth" placeholder="mm/dd/yyyy" value={plan.beneficiary.dob} onChange={(dob) => onChange({ beneficiary: { ...plan.beneficiary, dob } })} />
                <TextInput id={id("beneficiary-sin")} label="SIN" optional={!plan.accountType?.includes("RESP")} value={plan.beneficiary.sin} onChange={(sin) => onChange({ beneficiary: { ...plan.beneficiary, sin } })} />
                <TextInput id={id("beneficiary-relationship")} label="Relationship to client" optional value={plan.beneficiary.relationship} onChange={(relationship) => onChange({ beneficiary: { ...plan.beneficiary, relationship } })} />
                <TextInput id={id("beneficiary-allocation")} label="Allocation %" optional inputMode="decimal" value={plan.beneficiary.allocation} onChange={(allocation) => onChange({ beneficiary: { ...plan.beneficiary, allocation } })} />
                <div className="flex items-end pb-2">
                  <Checkbox checked={plan.beneficiary.primary} onChange={(primary) => onChange({ beneficiary: { ...plan.beneficiary, primary } })}>
                    Primary beneficiary
                  </Checkbox>
                </div>
              </Grid>
            </>
          ) : (
            <button type="button" onClick={() => setShowBeneficiary(true)} className="text-[13px] font-medium text-[#0B6165] hover:underline">
              + Add a beneficiary
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
          <p className="text-[13px] font-medium text-slate-700">{THIRD_PARTY_INTRO}</p>
          {THIRD_PARTY_QUESTIONS.map((q) => (
            <YesNo
              key={q.key}
              id={id(`tp-${q.key}`)}
              label={
                <>
                  {q.text} {q.note && <span className="text-slate-500">{q.note}</span>}
                </>
              }
              value={plan.thirdParty[q.key]}
              onChange={(v) => onChange({ thirdParty: { ...plan.thirdParty, [q.key]: v } })}
            />
          ))}
          {Object.values(plan.thirdParty).includes("Yes") && (
            <p className="rounded-[7px] bg-amber-50 px-3 py-2 text-[13px] text-amber-900">{THIRD_PARTY_FOLLOW_UP}.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function PercentTable<K extends string>({
  id,
  title,
  rows,
  columns,
  values,
  onChange,
}: {
  id: string;
  title: string;
  rows: readonly K[];
  columns: PlanColumn[];
  values: Record<PlanColumn, Record<K, string>>;
  onChange: (column: PlanColumn, row: K, value: string) => void;
}) {
  return (
    <fieldset id={id} className="scroll-mt-32">
      <legend className="mb-1.5 text-[13px] font-medium text-slate-700">{title} (%)</legend>
      <table className="w-full text-[14px]">
        {columns.length > 1 && (
          <thead>
            <tr className="text-[12px] text-slate-500">
              <th className="text-left font-normal" />
              {columns.map((c) => (
                <th key={c} className="w-24 pb-1 text-right font-normal capitalize">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row) => (
            <tr key={row} className="border-t border-slate-100">
              <td className="py-1 pr-2 text-slate-700">{row}</td>
              {columns.map((column) => (
                <td key={column} className="w-24 py-1">
                  <label className="relative block">
                    <span className="sr-only">{`${row}, ${column}`}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={values[column][row]}
                      onChange={(e) => onChange(column, row, e.target.value)}
                      className="h-8 w-full rounded-[6px] border border-slate-300 pr-6 text-right tabular-nums outline-none focus-visible:border-[#0B6165] focus-visible:ring-4 focus-visible:ring-[#0B6165]/20"
                    />
                    <span aria-hidden className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                      %
                    </span>
                  </label>
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-slate-200">
            <td className="pt-1.5 text-[13px] font-medium text-slate-600">Total</td>
            {columns.map((column) => {
              const { empty, total } = allocationTotal(values[column]);
              const ok = !empty && total === 100;
              return (
                <td
                  key={column}
                  className={`pt-1.5 pr-2 text-right text-[13px] font-semibold tabular-nums ${
                    empty ? "text-slate-400" : ok ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {empty ? "—" : total === null ? "?" : `${total}%`}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </fieldset>
  );
}
