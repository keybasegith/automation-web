"use client";

/**
 * Sections D, E and F — one Investment Plan block each.
 *
 * The "100%  100%  Total" line under the percentages is printed on paper; here
 * it shows the running total of each column, so an allocation that does not
 * add up is visible while it is being typed rather than at review.
 */

import {
  ACCOUNT_TYPE_GROUPS,
  INTENDED_USES,
  INVESTMENT_OBJECTIVES,
  LEVERAGE_QUESTION,
  PLAN_COLUMNS,
  PLAN_LETTERS,
  REGISTRATIONS,
  RISK_TOLERANCES,
  SIGNING_AUTHORITIES,
  TIME_HORIZONS,
  type IntendedUse,
  type PlanColumn,
  type Registration,
} from "@/lib/naaf/config";
import { allocationTotal, fieldIds } from "@/lib/naaf/completeness";
import type { Beneficiary, InvestmentPlan } from "@/lib/naaf/types";

import { BoxField, CaptionField, LineField, SectionBar, TickBox, TickGroup, YesNoBoxes, issueRing, useIssue } from "./ui";

export default function PlanSection({
  index,
  plan,
  inUse,
  onChange,
}: {
  index: number;
  plan: InvestmentPlan;
  inUse: boolean;
  onChange: (patch: Partial<InvestmentPlan>) => void;
}) {
  const id = (field: string) => fieldIds.plan(index, field);
  const ownerIssue = useIssue(id("owner"));
  const typeIssue = useIssue(id("accountType"));

  const setBeneficiary = (patch: Partial<Beneficiary>) =>
    onChange({ beneficiary: { ...plan.beneficiary, ...patch } });

  return (
    <section aria-labelledby={`${id("bar")}-title`}>
      <SectionBar
        id={id("bar")}
        letter={PLAN_LETTERS[index]}
        title={<span id={`${id("bar")}-title`}>Investment Plan ({index + 1})</span>}
        aside={
          <>
            <BoxField
              id={id("planIdType")}
              label="Plan ID & Plan Type:"
              value={plan.planIdType}
              onChange={(planIdType) => onChange({ planIdType })}
              inputClassName="w-52 @xl:w-72"
            />
            <fieldset id={id("owner")} className={`flex scroll-mt-28 items-center gap-2 ${issueRing(ownerIssue)}`}>
              <legend className="sr-only">Plan owner</legend>
              {(["A", "B"] as const).map((owner, i) => (
                <span key={owner} className="inline-flex items-center gap-2">
                  {i === 1 && <span className="text-[15px] text-[#0000E0]">or</span>}
                  <TickBox
                    checked={plan.owner === owner}
                    onChange={(on) => onChange({ owner: on ? owner : null })}
                    label={<b>Client {owner}</b>}
                    className="text-[15px]"
                  />
                </span>
              ))}
            </fieldset>
          </>
        }
      />

      <div className={`border border-t-0 border-slate-500 bg-white px-3 py-2.5 @xl:px-4 ${inUse ? "" : "naaf-plan-unused"}`}>
        {!inUse && (
          <p className="naaf-no-print mb-2 text-[12.5px] text-slate-500">
            Optional — leave this plan blank if the client is opening fewer plans. It is checked
            once anything is entered.
          </p>
        )}

        {/* ------------------------------------------ Registration & type */}
        <div className="flex flex-wrap items-end gap-x-3 gap-y-1 text-[14.5px]">
          <span className="font-bold text-[#0000E0]">Registration:</span>
          <TickGroup<Registration>
            id={id("registration")}
            legend="Registration"
            options={REGISTRATIONS.map((r) => r.value)}
            labels={Object.fromEntries(REGISTRATIONS.map((r) => [r.value, r.label]))}
            value={plan.registration}
            onChange={(registration) => onChange({ registration })}
          />
          <LineField
            id={id("intermediary")}
            label="Intermediary name and account number"
            srLabel
            value={plan.intermediary}
            onChange={(intermediary) => onChange({ intermediary })}
            className="min-w-[12rem] flex-1"
          />
        </div>

        <fieldset id={id("accountType")} className={`mt-1 scroll-mt-28 space-y-0.5 text-[14.5px] ${issueRing(typeIssue)}`}>
          <legend className="sr-only">Account type</legend>
          {ACCOUNT_TYPE_GROUPS.map((group, g) => (
            <div key={group.label} className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 ${g === 0 ? "pl-2" : "pl-6"}`}>
              <span className="font-bold text-[#0000E0]">
                {"prefix" in group ? `${group.prefix} ` : ""}
                {group.label}
              </span>
              {group.types.map((type) => (
                <TickBox
                  key={type}
                  checked={plan.accountType === type}
                  onChange={(on) => onChange({ accountType: on ? type : null })}
                  label={type === "Other" ? "Other:" : type}
                />
              ))}
              {g === 1 && (
                <LineField
                  id={id("accountTypeOther")}
                  label="Other account type"
                  srLabel
                  value={plan.accountTypeOther}
                  onChange={(accountTypeOther) => onChange({ accountTypeOther })}
                  className="w-44"
                />
              )}
              {g === 2 && (
                <TickGroup
                  id={id("signingAuthority")}
                  legend="Signing authority"
                  options={SIGNING_AUTHORITIES}
                  value={plan.signingAuthority}
                  onChange={(signingAuthority) => onChange({ signingAuthority })}
                  className="@xl:ml-auto"
                />
              )}
            </div>
          ))}
        </fieldset>

        <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1 pl-6 text-[14.5px] text-[#0000E0]">
          <span>
            <b>Leverage:</b> {LEVERAGE_QUESTION}
          </span>
          <YesNoBoxes id={id("leverage")} legend={LEVERAGE_QUESTION} value={plan.leverage} onChange={(leverage) => onChange({ leverage })} />
          <LineField
            id={id("lendingInstitution")}
            label="Lending Institution:"
            value={plan.lendingInstitution}
            onChange={(lendingInstitution) => onChange({ lendingInstitution })}
            className="min-w-[14rem] flex-1"
          />
        </div>

        {/* ------------------------------------------------- PLAN KYC grid */}
        <div className="mt-2.5 overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-[26px_1.05fr_1.1fr_1fr_1.1fr] border-[1.5px] border-[#2B4BA8]">
            <div className="row-span-2 flex flex-col items-center justify-around border-r border-[#2B4BA8] py-1 text-[15px] font-bold leading-none text-[#0000E0]" aria-hidden>
              {"PLAN KYC".split("").map((ch, i) => (
                <span key={i}>{ch === " " ? " " : ch}</span>
              ))}
            </div>
            {["Investment Objectives", "Risk Tolerance", "Time Horizon", "Intended Use of Account"].map((h) => (
              <div key={h} className="border-b border-r border-[#2B4BA8] bg-[#EAF1DD] py-0.5 text-center text-[14.5px] text-[#0000E0] last:border-r-0">
                {h}
              </div>
            ))}

            <PercentBlock
              id={id("objectives")}
              rows={INVESTMENT_OBJECTIVES}
              values={plan.objectives}
              onChange={(column, key, value) =>
                onChange({ objectives: { ...plan.objectives, [column]: { ...plan.objectives[column], [key]: value } } })
              }
            />
            <PercentBlock
              id={id("riskTolerance")}
              rows={RISK_TOLERANCES}
              values={plan.riskTolerance}
              onChange={(column, key, value) =>
                onChange({ riskTolerance: { ...plan.riskTolerance, [column]: { ...plan.riskTolerance[column], [key]: value } } })
              }
            />
            <TickColumns
              id={id("timeHorizon")}
              rows={TIME_HORIZONS}
              isChecked={(column, row) => plan.timeHorizon[column] === row}
              onToggle={(column, row, on) => onChange({ timeHorizon: { ...plan.timeHorizon, [column]: on ? row : null } })}
            />
            <TickColumns
              id={id("intendedUse")}
              rows={INTENDED_USES}
              last
              isChecked={(column, row) => plan.intendedUse[column].includes(row)}
              onToggle={(column, row: IntendedUse, on) => {
                const current = plan.intendedUse[column];
                onChange({
                  intendedUse: {
                    ...plan.intendedUse,
                    [column]: on ? [...current, row] : current.filter((x) => x !== row),
                  },
                });
              }}
              footer={
                <LineField
                  id={id("intendedUseOther")}
                  label="Other intended use"
                  srLabel
                  value={plan.intendedUseOther}
                  onChange={(intendedUseOther) => onChange({ intendedUseOther })}
                  className="px-6"
                />
              }
            />
          </div>
        </div>

        {/* ------------------------------------------------- Beneficiary */}
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 @xl:grid-cols-[1.6fr_1fr_1fr_auto_0.8fr_1.3fr]">
          <CaptionField id={id("beneficiary-name")} caption={<b>Beneficiary/ITF Name</b>} value={plan.beneficiary.name} onChange={(name) => setBeneficiary({ name })} />
          <CaptionField id={id("beneficiary-sin")} caption="S.I.N." value={plan.beneficiary.sin} onChange={(sin) => setBeneficiary({ sin })} />
          <CaptionField id={id("beneficiary-dob")} caption={<>D.O.B. <span className="text-[10.5px]">(m/d/y)</span></>} value={plan.beneficiary.dob} onChange={(dob) => setBeneficiary({ dob })} placeholder="mm/dd/yy" />
          <div className="flex items-end pb-[18px]">
            <TickBox checked={plan.beneficiary.primary} onChange={(primary) => setBeneficiary({ primary })} label="Primary Beneficiary" className="text-[13px]" />
          </div>
          <CaptionField id={id("beneficiary-allocation")} caption="Allocation %" value={plan.beneficiary.allocation} onChange={(allocation) => setBeneficiary({ allocation })} inputMode="decimal" />
          <CaptionField id={id("beneficiary-relationship")} caption="Relationship to Client" value={plan.beneficiary.relationship} onChange={(relationship) => setBeneficiary({ relationship })} />
        </div>
      </div>
    </section>
  );
}

/** Current / New percentage inputs beside each band, with a live total row. */
function PercentBlock<K extends string>({
  id,
  rows,
  values,
  onChange,
}: {
  id: string;
  rows: readonly K[];
  values: Record<PlanColumn, Record<K, string>>;
  onChange: (column: PlanColumn, key: K, value: string) => void;
}) {
  const issue = useIssue(id);
  return (
    <div id={id} className={`scroll-mt-28 border-r border-[#2B4BA8] px-2 py-1 text-[14px] ${issueRing(issue)}`}>
      <div className="grid grid-cols-[3.4rem_3.4rem_1fr] gap-x-2 text-[#0000E0]">
        <span>Current</span>
        <span>New</span>
        <span />
        {rows.map((row) => (
          <div key={row} className="contents">
            {PLAN_COLUMNS.map((column) => (
              <label key={column} className="flex items-end">
                <span className="sr-only">{`${row}, ${column}`}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={values[column][row]}
                  onChange={(e) => onChange(column, row, e.target.value)}
                  className="h-6 w-full min-w-0 border-0 border-b border-[#0000E0]/60 bg-transparent px-0.5 text-right text-[14px] tabular-nums text-black outline-none focus-visible:border-[#006C67]"
                />
                <span>%</span>
              </label>
            ))}
            <span className="self-end whitespace-nowrap">{row}</span>
          </div>
        ))}
        {PLAN_COLUMNS.map((column) => (
          <TotalCell key={column} column={values[column]} />
        ))}
        <span className="mt-0.5">Total</span>
      </div>
    </div>
  );
}

function TotalCell({ column }: { column: Record<string, string> }) {
  const { empty, total } = allocationTotal(column);
  const off = !empty && total !== 100;
  return (
    <span
      className={`mt-0.5 text-right text-[13px] tabular-nums ${off ? "font-bold text-red-600" : "text-[#0000E0]"}`}
      title={off ? "Must total 100%" : undefined}
    >
      {empty ? "100%" : total === null ? "?" : `${total}%`}
    </span>
  );
}

/** Current / New tick boxes beside each option. */
function TickColumns<T extends string>({
  id,
  rows,
  isChecked,
  onToggle,
  footer,
  last = false,
}: {
  id: string;
  rows: readonly T[];
  isChecked: (column: PlanColumn, row: T) => boolean;
  onToggle: (column: PlanColumn, row: T, on: boolean) => void;
  footer?: React.ReactNode;
  last?: boolean;
}) {
  const issue = useIssue(id);
  return (
    <div id={id} className={`scroll-mt-28 px-2 py-1 text-[14px] ${last ? "" : "border-r border-[#2B4BA8]"} ${issueRing(issue)}`}>
      <div className="grid grid-cols-[3.2rem_3.2rem_1fr] items-center gap-x-1 gap-y-[3px] text-[#0000E0]">
        <span>Current</span>
        <span>New</span>
        <span />
        {rows.map((row) => (
          <div key={row} className="contents">
            {PLAN_COLUMNS.map((column) => (
              <span key={column} className="pl-2">
                <TickBox
                  checked={isChecked(column, row)}
                  onChange={(on) => onToggle(column, row, on)}
                  ariaLabel={`${row}, ${column}`}
                />
              </span>
            ))}
            <span className="whitespace-nowrap">{row}</span>
          </div>
        ))}
      </div>
      {footer}
    </div>
  );
}
