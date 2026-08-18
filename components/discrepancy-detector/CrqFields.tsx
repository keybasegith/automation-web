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
 *
 * The two REVISIONS are a different matter. crq24 and v2-crq25 offer different
 * income bands and score on different tables, so the revision selector below is
 * not cosmetic: until it is set, the income band and rule X4 are held back.
 */

import type { CrqData, SourceMap } from "@/lib/discrepancy-detector/types";
import type { CrqIncomeBand } from "@/lib/discrepancy-detector/vocab";
import {
  CRQ_FORM_VERSIONS,
  CRQ_INCOME_BANDS_BY_VERSION,
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

  // Offering every band from both revisions would let a reviewer record an
  // answer the form in front of them cannot express.
  const incomeBands = (
    data.crq_form_version ? CRQ_INCOME_BANDS_BY_VERSION[data.crq_form_version] : []
  ) as readonly CrqIncomeBand[];

  return (
    <div className="flex flex-col gap-4">
      <FieldGroup title="Client">
        <SelectField
          label="CRQ revision"
          value={data.crq_form_version}
          options={CRQ_FORM_VERSIONS}
          onChange={(v) => set("crq_form_version", v)}
          hint="From the code printed in the page footer. The income bands and the scoring table follow it."
          source={sources.crq_form_version}
        />
        <SelectField
          label="Layout"
          value={data.crq_version}
          options={CRQ_VERSIONS}
          onChange={(v) => set("crq_version", v)}
          hint="Individual / Joint / Corporate, from the form header."
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
        title="Annual income"
        description={
          data.crq_form_version
            ? `Record the band the advisor checked, not the point value. Bands shown are the ${data.crq_form_version} list.`
            : "Set the CRQ revision above to load the right income bands — the two revisions offer different ones."
        }
      >
        <SelectField
          label="Annual income (from all sources)"
          value={data.crq_income_band}
          options={incomeBands}
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
