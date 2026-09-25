"use client";

/**
 * The CRQ on its own page, with the edition picker above it. Holds the
 * answers itself — deliberately not in localStorage, as they are a client's
 * financial profile and there is no encrypted draft store to put them in.
 */

import { useState } from "react";

import { blankQuestionnaire } from "@/lib/risk-questionnaire/blank";
import { CRQ_FORMS } from "@/lib/risk-questionnaire/forms";
import { switchVariant } from "@/lib/risk-questionnaire/variants";
import type { CrqVariant, QuestionnaireState } from "@/lib/risk-questionnaire/types";

import ClientRiskQuestionnaire from "./ClientRiskQuestionnaire";
import CrqVariantPicker from "./CrqVariantPicker";

export default function StandaloneQuestionnaire({ initialVariant }: { initialVariant: CrqVariant }) {
  const [variant, setVariant] = useState<CrqVariant>(initialVariant);
  const [state, setState] = useState<QuestionnaireState>(blankQuestionnaire);

  const changeVariant = (next: CrqVariant) => {
    setState((prev) => switchVariant(prev, variant, next));
    setVariant(next);
  };

  return (
    <>
      <CrqVariantPicker value={variant} onChange={changeVariant} className="mb-4" />
      <ClientRiskQuestionnaire form={CRQ_FORMS[variant]} state={state} onChange={setState} />
    </>
  );
}
