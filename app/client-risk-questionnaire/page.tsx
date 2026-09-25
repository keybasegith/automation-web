import type { Metadata } from "next";

import StandaloneQuestionnaire from "@/components/risk-questionnaire/StandaloneQuestionnaire";
import { isCrqVariant } from "@/lib/risk-questionnaire/forms";

export const metadata: Metadata = {
  title: "Client Risk Questionnaire",
  description:
    "Digital version of the Keybase Financial Group Client Risk Questionnaire — individual, joint and corporate editions (form v2-crq25).",
};

export default async function ClientRiskQuestionnairePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const initialVariant = isCrqVariant(type) ? type : "individual";

  return (
    <div className="mx-auto max-w-[1120px]">
      <header className="crq-no-print mb-5">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">Compliance</p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Client Risk Questionnaire
        </h2>
        <p className="max-w-3xl text-sm text-slate-500">
          Completed on screen, for individual, joint and corporate accounts. Scores, risk levels and
          the final risk ranking are calculated from the answers as they are selected — nothing is
          totalled by hand.
        </p>
      </header>

      <StandaloneQuestionnaire key={initialVariant} initialVariant={initialVariant} />
    </div>
  );
}
