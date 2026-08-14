import type { ComponentType } from "react";

import EducationPlanningBody from "./EducationPlanningBody";
import EstatePlanningBody from "./EstatePlanningBody";
import RetirementPlanningBody from "./RetirementPlanningBody";
import TaxPlanningBody from "./TaxPlanningBody";
import WealthBuildingBody from "./WealthBuildingBody";
import NonRegisteredInvestmentsBody from "./NonRegisteredInvestmentsBody";
import RdspBody from "./RdspBody";
import RespBody from "./RespBody";
import RrspBody from "./RrspBody";
import TfsaBody from "./TfsaBody";
import FhsaBody from "./FhsaBody";
import TraditionalInvestmentsBody from "./TraditionalInvestmentsBody";
import AlternativeInvestmentsBody from "./AlternativeInvestmentsBody";
import InsuranceBody from "./InsuranceBody";
import TravelInsuranceBody from "./TravelInsuranceBody";
import SegregatedFundsBody from "./SegregatedFundsBody";

/**
 * Every service page body, keyed by slug. The standalone routes import their
 * own body directly; this registry is what lets /services/[slug] render any of
 * them from a route param.
 */
export const SERVICE_BODIES: Record<string, ComponentType> = {
  "education-planning": EducationPlanningBody,
  "estate-planning": EstatePlanningBody,
  "retirement-planning": RetirementPlanningBody,
  "tax-planning": TaxPlanningBody,
  "wealth-building": WealthBuildingBody,
  "non-registered-investments": NonRegisteredInvestmentsBody,
  rdsp: RdspBody,
  resp: RespBody,
  rrsp: RrspBody,
  tfsa: TfsaBody,
  fhsa: FhsaBody,
  "traditional-investments": TraditionalInvestmentsBody,
  "alternative-investments": AlternativeInvestmentsBody,
  insurance: InsuranceBody,
  "travel-insurance": TravelInsuranceBody,
  "segregated-funds": SegregatedFundsBody,
};
