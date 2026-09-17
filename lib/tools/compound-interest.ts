export interface CalcParams {
  principal: number;
  monthlyContribution: number;
  annualRate: number;
  years: number;
  compoundFreq: number;
  inflationRate: number;
  taxRate: number;
  contributionIncrease: number;
}

export interface YearRow {
  year: number;
  balance: number;
  contributions: number;
  interest: number;
  yearInterest: number;
  realBalance: number;
  afterTaxBalance: number;
}

export function calculateCompoundInterest(params: CalcParams): YearRow[] {
  const {
    principal,
    monthlyContribution,
    annualRate,
    years,
    compoundFreq,
    inflationRate,
    taxRate,
    contributionIncrease,
  } = params;

  const r = annualRate / 100;
  const inf = inflationRate / 100;
  const tax = taxRate / 100;
  const contribInc = contributionIncrease / 100;
  const n = compoundFreq;

  const yearlyData: YearRow[] = [];
  let balance = principal;
  let totalContributions = principal;
  let totalInterest = 0;
  let currentMonthlyContrib = monthlyContribution;

  // Use a standard compound interest approach:
  // Each month: add contribution, then apply one month's worth of compounded growth.
  // Effective monthly rate from nominal rate compounded n times/year:
  // effectiveMonthlyRate = (1 + r/n)^(n/12) - 1

  for (let year = 1; year <= years; year++) {
    let yearInterest = 0;
    const effectiveMonthlyRate = Math.pow(1 + r / n, n / 12) - 1;

    for (let month = 1; month <= 12; month++) {
      balance += currentMonthlyContrib;
      totalContributions += currentMonthlyContrib;

      const interest = balance * effectiveMonthlyRate;
      yearInterest += interest;
      balance += interest;
    }

    totalInterest += yearInterest;

    const realBalance = balance / Math.pow(1 + inf, year);
    const afterTaxInterest = totalInterest * (1 - tax);
    const afterTaxBalance = totalContributions + afterTaxInterest;

    yearlyData.push({
      year,
      balance: Math.round(balance * 100) / 100,
      contributions: Math.round(totalContributions * 100) / 100,
      interest: Math.round(totalInterest * 100) / 100,
      yearInterest: Math.round(yearInterest * 100) / 100,
      realBalance: Math.round(realBalance * 100) / 100,
      afterTaxBalance: Math.round(afterTaxBalance * 100) / 100,
    });

    currentMonthlyContrib *= 1 + contribInc;
  }

  return yearlyData;
}

