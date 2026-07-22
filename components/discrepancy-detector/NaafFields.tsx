"use client";

/**
 * The NAAF half of the verification screen.
 *
 * Section letters match the printed form (V3-NAAFE-2022) so a reviewer can look
 * from the page image to the right group without translating.
 */

import type { NaafData, SourceMap } from "@/lib/discrepancy-detector/types";
import {
  MAX_PLANS,
  NAAF_FORM_TYPES,
  NAAF_INCOME_BANDS,
  NAAF_RISK_TOLERANCES,
  NAAF_TIME_HORIZONS,
} from "@/lib/discrepancy-detector/vocab";
import { CheckField, FieldGroup, NumberField, SelectField, TextField } from "./ui";

export default function NaafFields({
  data,
  sources,
  onChange,
}: {
  data: NaafData;
  sources: SourceMap;
  onChange: (next: NaafData) => void;
}) {
  const set = <K extends keyof NaafData>(key: K, value: NaafData[K]) =>
    onChange({ ...data, [key]: value });

  const setPlan = (index: number, patch: Partial<NaafData["naaf_plans"][number]>) => {
    const plans = data.naaf_plans.map((p, i) => (i === index ? { ...p, ...patch } : p));
    onChange({ ...data, naaf_plans: plans });
  };

  /** Section Q needs one signature block per account holder. */
  const setJoint = (isJoint: boolean) => {
    const signatures = isJoint
      ? [
          data.naaf_client_signatures[0] ?? { signature_present: false, date_present: false },
          data.naaf_client_signatures[1] ?? { signature_present: false, date_present: false },
        ]
      : [data.naaf_client_signatures[0] ?? { signature_present: false, date_present: false }];
    onChange({ ...data, naaf_is_joint: isJoint, naaf_client_signatures: signatures });
  };

  const setSignature = (index: number, patch: { signature_present?: boolean; date_present?: boolean }) => {
    const signatures = data.naaf_client_signatures.map((s, i) =>
      i === index ? { ...s, ...patch } : s
    );
    onChange({ ...data, naaf_client_signatures: signatures });
  };

  return (
    <div className="flex flex-col gap-4">
      <FieldGroup title="Section A — Account Holder Information">
        <SelectField
          label="Form type"
          value={data.naaf_form_type}
          options={NAAF_FORM_TYPES}
          onChange={(v) => set("naaf_form_type", v)}
          source={sources.naaf_form_type}
        />
        <TextField
          label="Client ID"
          value={data.naaf_client_id}
          onChange={(v) => set("naaf_client_id", v)}
          source={sources.naaf_client_id}
        />
        <TextField
          label="Client name (Client A)"
          value={data.naaf_client_name}
          onChange={(v) => set("naaf_client_name", v)}
          hint="Surname, First Name"
          source={sources.naaf_client_name}
        />
        <div className="flex flex-col justify-end gap-2.5">
          <CheckField
            label="Joint account (Section B present)"
            checked={data.naaf_is_joint}
            onChange={setJoint}
            hint="Adds the Client B requirements to Sections P and Q."
          />
        </div>
        {data.naaf_is_joint && (
          <TextField
            label="Client name (Client B)"
            value={data.naaf_client_b_name}
            onChange={(v) => set("naaf_client_b_name", v)}
            hint="Surname, First Name"
          />
        )}
      </FieldGroup>

      <FieldGroup
        title="Section C — Client KYC"
        description="Net worth is captured for the record; the CRQ net-worth cross-check is not part of this version."
      >
        <SelectField
          label="Approximate Income"
          value={data.naaf_income_band}
          options={NAAF_INCOME_BANDS}
          onChange={(v) => set("naaf_income_band", v)}
          source={sources.naaf_income_band}
        />
        <TextField
          label="Net Worth"
          value={data.naaf_net_worth}
          onChange={(v) => set("naaf_net_worth", v)}
          hint="Fixed + Liquid - Liabilities"
          source={sources.naaf_net_worth}
        />
      </FieldGroup>

      <FieldGroup title="Investment plans" columns={1}>
        <p className="-mt-1 text-[11px] leading-relaxed text-slate-500">
          Complete a plan by selecting both a risk tolerance and a time horizon. Checks
          read the New column and fall back to Current when New is blank. Leave unused
          plans empty.
        </p>
        <div className="flex flex-col gap-2">
          {Array.from({ length: MAX_PLANS }, (_, i) => {
            const plan = data.naaf_plans[i];
            const touched =
              plan.risk_tolerance_new ||
              plan.risk_tolerance_current ||
              plan.time_horizon_new ||
              plan.time_horizon_current;
            return (
              <div
                key={plan.plan_index}
                className={`rounded-xl border p-2.5 transition ${
                  touched ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50/60"
                }`}
              >
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Plan {plan.plan_index}
                </p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <SelectField
                    label="Risk Tolerance — New"
                    value={plan.risk_tolerance_new}
                    options={NAAF_RISK_TOLERANCES}
                    onChange={(v) => setPlan(i, { risk_tolerance_new: v })}
                    placeholder="Not selected"
                  />
                  <SelectField
                    label="Risk Tolerance — Current"
                    value={plan.risk_tolerance_current}
                    options={NAAF_RISK_TOLERANCES}
                    onChange={(v) => setPlan(i, { risk_tolerance_current: v })}
                    placeholder="Not selected"
                  />
                  <SelectField
                    label="Time Horizon — New"
                    value={plan.time_horizon_new}
                    options={NAAF_TIME_HORIZONS}
                    onChange={(v) => setPlan(i, { time_horizon_new: v })}
                    placeholder="Not selected"
                  />
                  <SelectField
                    label="Time Horizon — Current"
                    value={plan.time_horizon_current}
                    options={NAAF_TIME_HORIZONS}
                    onChange={(v) => setPlan(i, { time_horizon_current: v })}
                    placeholder="Not selected"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </FieldGroup>

      <FieldGroup
        title="Section M — Trusted Contact Person"
        description="Firm policy treats any missing Trusted Contact field as a deficiency."
      >
        <TextField
          label="Surname"
          value={data.naaf_tcp.surname}
          onChange={(v) => set("naaf_tcp", { ...data.naaf_tcp, surname: v })}
        />
        <TextField
          label="First Name"
          value={data.naaf_tcp.first_name}
          onChange={(v) => set("naaf_tcp", { ...data.naaf_tcp, first_name: v })}
        />
        <TextField
          label="Phone Number"
          value={data.naaf_tcp.phone}
          onChange={(v) => set("naaf_tcp", { ...data.naaf_tcp, phone: v })}
        />
        <TextField
          label="Email Address"
          value={data.naaf_tcp.email}
          onChange={(v) => set("naaf_tcp", { ...data.naaf_tcp, email: v })}
        />
        <TextField
          label="Relationship to Client"
          value={data.naaf_tcp.relationship}
          onChange={(v) => set("naaf_tcp", { ...data.naaf_tcp, relationship: v })}
        />
      </FieldGroup>

      <FieldGroup title="Section P — Financial Advisor Outside Business Activities" columns={1}>
        <CheckField
          label="Not Applicable is checked"
          checked={data.naaf_oba_not_applicable}
          onChange={(v) => set("naaf_oba_not_applicable", v)}
          hint="If unchecked, a description and the account holder's initials are required."
        />
        {!data.naaf_oba_not_applicable && (
          <div className="grid gap-2.5 sm:grid-cols-2">
            <TextField
              label="Description of outside activity"
              value={data.naaf_oba_description}
              onChange={(v) => set("naaf_oba_description", v)}
            />
            <TextField
              label="Primary Account Holder's Initials"
              value={data.naaf_oba_primary_initials}
              onChange={(v) => set("naaf_oba_primary_initials", v)}
            />
            {data.naaf_is_joint && (
              <TextField
                label="Joint Account Holder's Initials"
                value={data.naaf_oba_joint_initials}
                onChange={(v) => set("naaf_oba_joint_initials", v)}
              />
            )}
          </div>
        )}
      </FieldGroup>

      <FieldGroup
        title="Section Q — Account Agreement"
        description="Confirm against the page image. Signatures are never pre-filled."
        columns={1}
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          {data.naaf_client_signatures.map((sig, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {data.naaf_is_joint ? (i === 0 ? "Primary holder" : "Joint holder") : "Account holder"}
              </p>
              <CheckField
                label="Client Signature present"
                checked={sig.signature_present}
                onChange={(v) => setSignature(i, { signature_present: v })}
              />
              <CheckField
                label="Date present"
                checked={sig.date_present}
                onChange={(v) => setSignature(i, { date_present: v })}
              />
            </div>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup title="Section R — Dealer / Financial Advisor Information">
        <TextField
          label="Rep Code"
          value={data.naaf_rep_code}
          onChange={(v) => set("naaf_rep_code", v)}
          hint="Used to look up the advisor to email."
          source={sources.naaf_rep_code}
        />
        <TextField
          label="Dealer Code"
          value={data.naaf_dealer_code}
          onChange={(v) => set("naaf_dealer_code", v)}
          source={sources.naaf_dealer_code}
        />
        <TextField
          label="Advisor's Name"
          value={data.naaf_advisor_name}
          onChange={(v) => set("naaf_advisor_name", v)}
          source={sources.naaf_advisor_name}
        />
        <div className="flex flex-col gap-2">
          <CheckField
            label="Advisor's Signature present"
            checked={data.naaf_advisor_signature_present}
            onChange={(v) => set("naaf_advisor_signature_present", v)}
          />
          <CheckField
            label="Advisor's Date present"
            checked={data.naaf_advisor_date_present}
            onChange={(v) => set("naaf_advisor_date_present", v)}
          />
        </div>
      </FieldGroup>
    </div>
  );
}
