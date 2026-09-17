import type { Metadata } from "next";

import ClientRiskQuestionnaire from "@/components/risk-questionnaire/ClientRiskQuestionnaire";

export const metadata: Metadata = {
  title: "Client Risk Questionnaire — Individual Account Holder",
  description:
    "Digital version of the Keybase Financial Group Client Risk Questionnaire for individual account holders (form v2-crq25).",
};

export default function ClientRiskQuestionnairePage() {
  return (
    <div className="mx-auto max-w-[1120px]">
      <header className="crq-no-print mb-5">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">Compliance</p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Client Risk Questionnaire
        </h2>
        <p className="max-w-3xl text-sm text-slate-500">
          The individual account holder questionnaire, completed on screen. Scores, risk levels and
          the final risk ranking are calculated from the answers as they are selected — nothing is
          totalled by hand.
        </p>
      </header>

      <ClientRiskQuestionnaire />
    </div>
  );
}
