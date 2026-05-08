import type {
  ConsistencyCheckResult,
  ConsistencyFlag,
  ConsistencyOverallStatus,
  CrqDraft,
  CrqField,
  FlagCategory,
  FlagSeverity,
  KycDraft,
  KycField,
} from "@/lib/forms/types";
import {
  isMissing,
  normalizeCapacityForLoss,
  normalizeKnowledgeLevel,
  normalizeLiquidityNeed,
  normalizeName,
  normalizeObjective,
  normalizeRiskLevel,
  normalizeTimeHorizon,
  parseCurrencyToNumber,
} from "@/lib/forms/normalizers";

interface RequiredFieldRule {
  side: "kyc" | "crq" | "both";
  kycField?: KycField;
  crqField?: CrqField;
  label: string;
}

const REQUIRED_FIELDS: readonly RequiredFieldRule[] = [
  { side: "kyc", kycField: "clientFullName", label: "client name" },
  { side: "kyc", kycField: "dateOfBirth", label: "date of birth" },
  { side: "kyc", kycField: "accountType", label: "account type" },
  { side: "kyc", kycField: "advisorName", label: "advisor name" },
  { side: "kyc", kycField: "investmentObjective", label: "investment objective" },
  { side: "kyc", kycField: "riskTolerance", label: "risk tolerance" },
  { side: "kyc", kycField: "timeHorizon", label: "time horizon" },
  { side: "kyc", kycField: "investmentKnowledge", label: "investment knowledge" },
  { side: "crq", crqField: "comfortWithLoss", label: "CRQ comfort with loss" },
  { side: "crq", crqField: "primaryInvestmentGoal", label: "CRQ primary investment goal" },
  { side: "crq", crqField: "fundsNeededWithin", label: "CRQ funds needed within" },
  { side: "crq", crqField: "capacityForLoss", label: "CRQ capacity for loss" },
];

const RECOMMEND = {
  advisor:
    "Advisor should review this with the client and update documentation if needed.",
  compliance:
    "Compliance should review the explanation and supporting documentation.",
  missing:
    "This field is missing and should be completed before submission.",
} as const;

let flagCounter = 0;
const newFlagId = () => `flag-${Date.now()}-${++flagCounter}`;

function buildFlag(args: {
  category: FlagCategory;
  severity: FlagSeverity;
  kycField: string | null;
  crqField: string | null;
  kycValue: string | null;
  crqValue: string | null;
  explanation: string;
  recommendedHumanAction: string;
}): ConsistencyFlag {
  return {
    id: newFlagId(),
    ...args,
  };
}

interface RunArgs {
  submissionId: string;
  kyc: KycDraft;
  crq: CrqDraft;
}

/**
 * Run the deterministic consistency check across all categories listed in
 * the spec. Returns a structured result with category, severity, KYC/CRQ
 * fields and values, an explanation, and a safe recommendation.
 *
 * The wording in `explanation` and `recommendedHumanAction` is deliberately
 * non-judgemental: we say "potential mismatch / needs review" — never
 * "non-compliant" or "approved".
 */
export function checkKycCrqConsistency(args: RunArgs): ConsistencyCheckResult {
  flagCounter = 0;
  const { kyc, crq } = args;
  const flags: ConsistencyFlag[] = [];

  // ---------------------------------------------------------------------------
  // H. Missing required fields — checked first; any hit blocks submission.
  // ---------------------------------------------------------------------------
  for (const rule of REQUIRED_FIELDS) {
    const value =
      rule.side === "kyc"
        ? kyc.fields[rule.kycField!]
        : crq.fields[rule.crqField!];
    if (isMissing(value)) {
      flags.push(
        buildFlag({
          category: "missing_required_field",
          severity: "High",
          kycField: rule.kycField ?? null,
          crqField: rule.crqField ?? null,
          kycValue: rule.side === "kyc" ? (value as string | null) ?? null : null,
          crqValue: rule.side === "crq" ? (value as string | null) ?? null : null,
          explanation: `Required value for ${rule.label} is missing.`,
          recommendedHumanAction: RECOMMEND.missing,
        })
      );
    }
  }

  // ---------------------------------------------------------------------------
  // A. Client identity consistency
  // ---------------------------------------------------------------------------
  if (
    !isMissing(kyc.fields.clientFullName) &&
    !isMissing(crq.fields.clientFullName) &&
    normalizeName(kyc.fields.clientFullName) !==
      normalizeName(crq.fields.clientFullName)
  ) {
    flags.push(
      buildFlag({
        category: "client_identity",
        severity: "High",
        kycField: "clientFullName",
        crqField: "clientFullName",
        kycValue: kyc.fields.clientFullName,
        crqValue: crq.fields.clientFullName,
        explanation:
          "Client name on KYC differs from the name on the CRQ. Potential mismatch in identification.",
        recommendedHumanAction: RECOMMEND.compliance,
      })
    );
  }

  if (
    !isMissing(kyc.fields.accountType) &&
    !isMissing(crq.fields.accountType) &&
    kyc.fields.accountType.trim().toLowerCase() !==
      crq.fields.accountType.trim().toLowerCase()
  ) {
    flags.push(
      buildFlag({
        category: "client_identity",
        severity: "High",
        kycField: "accountType",
        crqField: "accountType",
        kycValue: kyc.fields.accountType,
        crqValue: crq.fields.accountType,
        explanation: "Account type on KYC differs from the CRQ.",
        recommendedHumanAction: RECOMMEND.compliance,
      })
    );
  }

  if (
    !isMissing(kyc.fields.advisorName) &&
    !isMissing(crq.fields.advisorName) &&
    normalizeName(kyc.fields.advisorName) !==
      normalizeName(crq.fields.advisorName)
  ) {
    flags.push(
      buildFlag({
        category: "client_identity",
        severity: "Medium",
        kycField: "advisorName",
        crqField: "advisorName",
        kycValue: kyc.fields.advisorName,
        crqValue: crq.fields.advisorName,
        explanation: "Advisor name on KYC differs from the advisor name on the CRQ.",
        recommendedHumanAction: RECOMMEND.advisor,
      })
    );
  }

  // ---------------------------------------------------------------------------
  // B. Risk tolerance consistency
  // KYC riskTolerance vs CRQ comfortWithLoss / volatilityComfort /
  // reactionToMarketDrop / capacityForLoss.
  // ---------------------------------------------------------------------------
  const kycRisk = normalizeRiskLevel(kyc.fields.riskTolerance);
  const crqLossComfort = normalizeRiskLevel(crq.fields.comfortWithLoss);
  if (kycRisk !== "unknown" && crqLossComfort !== "unknown") {
    if (kycRisk === "high" && crqLossComfort === "low") {
      flags.push(
        buildFlag({
          category: "risk_tolerance",
          severity: "High",
          kycField: "riskTolerance",
          crqField: "comfortWithLoss",
          kycValue: kyc.fields.riskTolerance,
          crqValue: crq.fields.comfortWithLoss,
          explanation:
            "KYC indicates a high risk tolerance but the CRQ indicates low comfort with loss. Potential mismatch.",
          recommendedHumanAction: RECOMMEND.compliance,
        })
      );
    } else if (kycRisk === "medium" && crqLossComfort === "low") {
      flags.push(
        buildFlag({
          category: "risk_tolerance",
          severity: "Medium",
          kycField: "riskTolerance",
          crqField: "comfortWithLoss",
          kycValue: kyc.fields.riskTolerance,
          crqValue: crq.fields.comfortWithLoss,
          explanation:
            "KYC indicates medium risk tolerance but the CRQ indicates low comfort with loss.",
          recommendedHumanAction: RECOMMEND.advisor,
        })
      );
    }
  }

  const crqVolatilityComfort = normalizeRiskLevel(crq.fields.volatilityComfort);
  if (kycRisk === "high" && crqVolatilityComfort === "low") {
    flags.push(
      buildFlag({
        category: "risk_tolerance",
        severity: "High",
        kycField: "riskTolerance",
        crqField: "volatilityComfort",
        kycValue: kyc.fields.riskTolerance,
        crqValue: crq.fields.volatilityComfort,
        explanation:
          "KYC indicates high risk tolerance but CRQ indicates low comfort with volatility.",
        recommendedHumanAction: RECOMMEND.compliance,
      })
    );
  }

  const crqMarketDrop = normalizeRiskLevel(crq.fields.reactionToMarketDrop);
  // For market-drop, "low" risk-language wording in CRQ means the client
  // would react badly to drops (i.e. would sell). High KYC + that = mismatch.
  if (kycRisk === "high" && crqMarketDrop === "low") {
    flags.push(
      buildFlag({
        category: "risk_tolerance",
        severity: "High",
        kycField: "riskTolerance",
        crqField: "reactionToMarketDrop",
        kycValue: kyc.fields.riskTolerance,
        crqValue: crq.fields.reactionToMarketDrop,
        explanation:
          "KYC indicates high risk tolerance but the CRQ describes a low tolerance for market drops.",
        recommendedHumanAction: RECOMMEND.compliance,
      })
    );
  }

  // ---------------------------------------------------------------------------
  // C. Investment objective consistency
  // ---------------------------------------------------------------------------
  const kycObjective = normalizeObjective(kyc.fields.investmentObjective);
  const crqGoal = normalizeObjective(crq.fields.primaryInvestmentGoal);
  if (kycObjective !== "unknown" && crqGoal !== "unknown") {
    if (
      kycObjective === "aggressive_growth" &&
      crqGoal === "preservation"
    ) {
      flags.push(
        buildFlag({
          category: "investment_objective",
          severity: "High",
          kycField: "investmentObjective",
          crqField: "primaryInvestmentGoal",
          kycValue: kyc.fields.investmentObjective,
          crqValue: crq.fields.primaryInvestmentGoal,
          explanation:
            "KYC objective is aggressive growth but CRQ goal is capital preservation.",
          recommendedHumanAction: RECOMMEND.compliance,
        })
      );
    } else if (kycObjective === "growth" && crqGoal === "income") {
      flags.push(
        buildFlag({
          category: "investment_objective",
          severity: "Medium",
          kycField: "investmentObjective",
          crqField: "primaryInvestmentGoal",
          kycValue: kyc.fields.investmentObjective,
          crqValue: crq.fields.primaryInvestmentGoal,
          explanation:
            "KYC objective is growth but CRQ primary goal is income.",
          recommendedHumanAction: RECOMMEND.advisor,
        })
      );
    } else if (kycObjective === "growth" && crqGoal === "preservation") {
      flags.push(
        buildFlag({
          category: "investment_objective",
          severity: "High",
          kycField: "investmentObjective",
          crqField: "primaryInvestmentGoal",
          kycValue: kyc.fields.investmentObjective,
          crqValue: crq.fields.primaryInvestmentGoal,
          explanation:
            "KYC objective is growth but CRQ goal is capital preservation.",
          recommendedHumanAction: RECOMMEND.compliance,
        })
      );
    }
  }

  // ---------------------------------------------------------------------------
  // D. Time horizon consistency
  // ---------------------------------------------------------------------------
  const kycHorizon = normalizeTimeHorizon(kyc.fields.timeHorizon);
  const crqFundsWithin = normalizeTimeHorizon(crq.fields.fundsNeededWithin);
  if (kycHorizon !== "unknown" && crqFundsWithin !== "unknown") {
    if (kycHorizon === "long" && crqFundsWithin === "short") {
      flags.push(
        buildFlag({
          category: "time_horizon",
          severity: "High",
          kycField: "timeHorizon",
          crqField: "fundsNeededWithin",
          kycValue: kyc.fields.timeHorizon,
          crqValue: crq.fields.fundsNeededWithin,
          explanation:
            "KYC time horizon is long term but CRQ indicates funds will be needed within 1-2 years.",
          recommendedHumanAction: RECOMMEND.compliance,
        })
      );
    } else if (kycHorizon === "medium" && crqFundsWithin === "short") {
      flags.push(
        buildFlag({
          category: "time_horizon",
          severity: "High",
          kycField: "timeHorizon",
          crqField: "fundsNeededWithin",
          kycValue: kyc.fields.timeHorizon,
          crqValue: crq.fields.fundsNeededWithin,
          explanation:
            "KYC time horizon is medium term but CRQ indicates funds will be needed in less than 1 year.",
          recommendedHumanAction: RECOMMEND.compliance,
        })
      );
    }
  }

  // ---------------------------------------------------------------------------
  // E. Investment knowledge & experience consistency
  // ---------------------------------------------------------------------------
  const kycKnowledge = normalizeKnowledgeLevel(kyc.fields.investmentKnowledge);
  const crqExperience = normalizeKnowledgeLevel(crq.fields.investmentExperience);
  if (kycKnowledge !== "unknown" && crqExperience !== "unknown") {
    if (kycKnowledge === "excellent" && crqExperience === "none") {
      flags.push(
        buildFlag({
          category: "knowledge_experience",
          severity: "Medium",
          kycField: "investmentKnowledge",
          crqField: "investmentExperience",
          kycValue: kyc.fields.investmentKnowledge,
          crqValue: crq.fields.investmentExperience,
          explanation:
            "KYC describes excellent knowledge but CRQ records no investment experience.",
          recommendedHumanAction: RECOMMEND.advisor,
        })
      );
    } else if (
      (kycKnowledge === "good" || kycKnowledge === "excellent") &&
      (crqExperience === "beginner" || crqExperience === "novice")
    ) {
      flags.push(
        buildFlag({
          category: "knowledge_experience",
          severity: "Low",
          kycField: "investmentKnowledge",
          crqField: "investmentExperience",
          kycValue: kyc.fields.investmentKnowledge,
          crqValue: crq.fields.investmentExperience,
          explanation:
            "KYC investment knowledge is reported as higher than CRQ investment experience.",
          recommendedHumanAction: RECOMMEND.advisor,
        })
      );
    }
  }

  // ---------------------------------------------------------------------------
  // F. Capacity for loss consistency
  // ---------------------------------------------------------------------------
  const crqCapacity = normalizeCapacityForLoss(crq.fields.capacityForLoss);
  if (kycRisk === "high" && crqCapacity === "low") {
    flags.push(
      buildFlag({
        category: "capacity_for_loss",
        severity: "High",
        kycField: "riskTolerance",
        crqField: "capacityForLoss",
        kycValue: kyc.fields.riskTolerance,
        crqValue: crq.fields.capacityForLoss,
        explanation:
          "KYC indicates high risk tolerance but CRQ indicates low capacity to absorb losses.",
        recommendedHumanAction: RECOMMEND.compliance,
      })
    );
  }

  // Cross-check: high KYC risk against low income / low liquid net worth.
  if (kycRisk === "high") {
    const annualIncome = parseCurrencyToNumber(kyc.fields.annualIncome);
    const liquidNetWorth = parseCurrencyToNumber(kyc.fields.liquidNetWorth);
    const incomeIsLow = annualIncome !== null && annualIncome < 60000;
    const liquidIsLow = liquidNetWorth !== null && liquidNetWorth < 25000;
    if (incomeIsLow || liquidIsLow) {
      flags.push(
        buildFlag({
          category: "capacity_for_loss",
          severity: "Medium",
          kycField: "riskTolerance",
          crqField: null,
          kycValue: kyc.fields.riskTolerance,
          crqValue: null,
          explanation:
            "High risk tolerance is recorded alongside low annual income or low liquid net worth — please review capacity for loss.",
          recommendedHumanAction: RECOMMEND.advisor,
        })
      );
    }
  }

  // ---------------------------------------------------------------------------
  // G. Liquidity needs consistency
  // ---------------------------------------------------------------------------
  const kycLiquidity = normalizeLiquidityNeed(kyc.fields.liquidityNeeds);
  const crqLiquidity = normalizeLiquidityNeed(crq.fields.liquidityNeeds);
  if (kycLiquidity === "low" && crqLiquidity === "high") {
    flags.push(
      buildFlag({
        category: "liquidity_needs",
        severity: "High",
        kycField: "liquidityNeeds",
        crqField: "liquidityNeeds",
        kycValue: kyc.fields.liquidityNeeds,
        crqValue: crq.fields.liquidityNeeds,
        explanation:
          "KYC indicates low liquidity needs but CRQ indicates high liquidity needs.",
        recommendedHumanAction: RECOMMEND.compliance,
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Overall status — order matters: missing > high > medium/low > clean.
  // ---------------------------------------------------------------------------
  let overallStatus: ConsistencyOverallStatus = "no_issues_detected";
  if (flags.some((f) => f.category === "missing_required_field")) {
    overallStatus = "blocked_missing_required";
  } else if (flags.some((f) => f.severity === "High")) {
    overallStatus = "needs_compliance_review";
  } else if (flags.length > 0) {
    overallStatus = "needs_advisor_review";
  }

  return {
    submissionId: args.submissionId,
    overallStatus,
    flags,
  };
}
