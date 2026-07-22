"use client";

/**
 * The CRQ half of the verification screen.
 *
 * Deliberately does NOT show what the score totals compute to. The reviewer's
 * job here is to record what the advisor actually checked on the form; showing
 * the derived answer alongside would invite them to "correct" the form to match
 * it, and rule X4 — which exists precisely to catch an advisor scoring error —
 * would then never fire. The comparison belongs in the results, not here.
 *
 * The three CRQ layouts (Individual / Joint / Corporate) all produce these same
 * outputs, so one set of fields serves all three.
 */

import type { CrqData, SourceMap } from "@/lib/discrepancy-detector/types";
import {
  CRQ_INCOME_BANDS,
  CRQ_RISK_RANKINGS,
  CRQ_VERSIONS,
} from "@/lib/discrepancy-detector/vocab";
import { CheckField, FieldGroup, NumberField, SelectField, TextField } from "./ui";

export default function CrqFields({
  data,
  sources,
  onChange,
}: {
  data: CrqData;
  sources: SourceMap;
  onChange: (next: CrqData) => void;
}) {
  const set = <K extends keyof CrqData>(key: K, value: CrqData[K]) =>
    onChange({ ...data, [key]: value });

  return (
    <div className="flex flex-col gap-4">
      <FieldGroup title="Client">
        <SelectField
          label="CRQ version"
          value={data.crq_version}
          options={CRQ_VERSIONS}
          onChange={(v) => set("crq_version", v)}
          hint="From the form header."
          source={sources.crq_version}
        />
        <TextField
          label="Client ID"
          value={data.crq_client_id}
          onChange={(v) => set("crq_client_id", v)}
          source={sources.crq_client_id}
        />
        <TextField
          label="Client / entity name"
          value={data.crq_client_name}
          onChange={(v) => set("crq_client_name", v)}
          source={sources.crq_client_name}
        />
      </FieldGroup>

      <FieldGroup
        title="Question 3 — Annual income"
        description="Record the band the advisor checked, not the point value."
      >
        <SelectField
          label="Annual income (from all sources)"
          value={data.crq_income_band}
          options={CRQ_INCOME_BANDS}
          onChange={(v) => set("crq_income_band", v)}
          source={sources.crq_income_band}
        />
      </FieldGroup>

      <FieldGroup
        title="Risk Profile Summary"
        description="Enter the totals and the Risk Ranking exactly as they appear on the form, even if they look wrong — the checks compare them for you."
      >
        <NumberField
          label="Risk Capacity Score Total"
          value={data.crq_risk_capacity_total}
          onChange={(v) => set("crq_risk_capacity_total", v)}
          hint="Sum of Q1-Q6, as entered by the advisor."
          source={sources.crq_risk_capacity_total}
        />
        <NumberField
          label="Risk Tolerance Score Total"
          value={data.crq_risk_tolerance_total}
          onChange={(v) => set("crq_risk_tolerance_total", v)}
          hint="Sum of Q7-Q12, as entered by the advisor."
          source={sources.crq_risk_tolerance_total}
        />
        <SelectField
          label="Risk Ranking (the box the advisor checked)"
          value={data.crq_checked_risk_ranking}
          options={CRQ_RISK_RANKINGS}
          onChange={(v) => set("crq_checked_risk_ranking", v)}
          source={sources.crq_checked_risk_ranking}
        />
      </FieldGroup>

      <FieldGroup title="Signatures">
        <TextField
          label="Advisor's name"
          value={data.crq_advisor_name}
          onChange={(v) => set("crq_advisor_name", v)}
          source={sources.crq_advisor_name}
        />
        <div className="flex flex-col gap-2">
          <CheckField
            label="Advisor's date present"
            checked={data.crq_advisor_date_present}
            onChange={(v) => set("crq_advisor_date_present", v)}
          />
          <CheckField
            label="Client signature present"
            checked={data.crq_client_signature_present}
            onChange={(v) => set("crq_client_signature_present", v)}
          />
        </div>
      </FieldGroup>
    </div>
  );
}
