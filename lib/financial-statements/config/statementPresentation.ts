/**
 * How the statements are laid out.
 *
 * The mapping table decides *which* line an account feeds; this file decides
 * the order those lines are presented in, which of them appear even when they
 * are nil, and where a presented line combines more than one mapping line.
 *
 * Layout never invents or moves money. Any mapped line that this file does not
 * place explicitly is still emitted — appended to its section whenever it is
 * non-zero — so a new account in a future period can never silently vanish
 * because nobody updated the layout.
 */

/** One presented row and the mapping line(s) whose totals it shows. */
export interface PresentedLine {
  label: string;
  /**
   * Mapping `statementLine` values feeding this row. Usually one. Two where the
   * reviewed statement merges buckets the legacy master kept apart.
   */
  sources: string[];
  /** Show the row even at nil — the reviewed statement prints these. */
  alwaysShow?: boolean;
}

export const BALANCE_SHEET_PRESENTATION = {
  currentAssets: {
    section: "Current assets",
    lines: [
      { label: "Cash", sources: ["Cash"], alwaysShow: true },
      { label: "Accounts Receivable", sources: ["Accounts Receivable"], alwaysShow: true },
      { label: "Registered Account Fees", sources: ["Registered Account Fees"], alwaysShow: true },
      { label: "Commission Receivable", sources: ["Commission Receivable"], alwaysShow: true },
      { label: "Contingency Funds", sources: ["Contingency Funds"], alwaysShow: true },
      { label: "Prepaid Expenses", sources: ["Prepaid Expenses"], alwaysShow: true },
      { label: "Other Current Assets", sources: ["Other Current Assets"], alwaysShow: true },
    ] as PresentedLine[],
  },
  capitalAssets: {
    section: "Capital assets",
    lines: [
      { label: "Capital Assets", sources: ["Capital Assets"], alwaysShow: true },
      { label: "Right of Use Asset-Office", sources: ["Right of Use Asset-Office"], alwaysShow: true },
    ] as PresentedLine[],
  },
  goodwill: {
    section: "Goodwill",
    lines: [{ label: "Goodwill", sources: ["Goodwill"], alwaysShow: true }] as PresentedLine[],
  },
  payablesAndAccruals: {
    section: "Current Liabilities",
    lines: [
      { label: "Accounts Payable & Accruals", sources: ["Accounts Payable & Accruals"], alwaysShow: true },
      { label: "Taxes Payable", sources: ["Taxes Payable"], alwaysShow: true },
      { label: "Commission Payable", sources: ["Commission Payable"], alwaysShow: true },
      { label: "Lease Obligation", sources: ["Lease Obligation"], alwaysShow: true },
    ] as PresentedLine[],
  },
  otherCurrentLiabilities: {
    section: "Current Liabilities",
    lines: [
      { label: "Intercompany - KIAL", sources: ["Intercompany - KIAL"], alwaysShow: true },
      { label: "Accounts Receivable - Argosy", sources: ["Accounts Receivable - Argosy"], alwaysShow: true },
      // The legacy master kept two clearing buckets; the reviewed statement
      // prints them as one line.
      { label: "Clearing", sources: ["ETD Clearing", "Commission Clearing"], alwaysShow: true },
    ] as PresentedLine[],
  },
  longTermLiabilities: {
    section: "Long-term labilities",
    lines: [{ label: "Subordinated Loan", sources: ["Subordinated Loan"], alwaysShow: true }] as PresentedLine[],
  },
  equity: {
    section: "Shareholders Equity",
    commonShares: { label: "Common Shares", sources: ["Common Shares"], alwaysShow: true } as PresentedLine,
    retainedEarningsBeginning: {
      label: "Retained Earnings, Beginning of Year",
      sources: ["Retained Earnings, Beginning of Year"],
      alwaysShow: true,
    } as PresentedLine,
    currentPeriodEarningsLabel: "Net Profit (Loss) for the period",
  },
} as const;

export const INCOME_STATEMENT_PRESENTATION = {
  commissionIncome: {
    section: "Commission Income",
    lines: [
      { label: "Commission Revenue", sources: ["Commission Revenue"], alwaysShow: true },
      { label: "Trailers Revenue", sources: ["Trailers Revenue"], alwaysShow: true },
    ] as PresentedLine[],
  },
  commissionExpense: {
    section: "Commission Expense",
    lines: [
      { label: "Commission Expense", sources: ["Commission Expense"], alwaysShow: true },
      { label: "Trailers Expense", sources: ["Trailers Expense"], alwaysShow: true },
      { label: "Override Commission Expenses", sources: ["Override Commission Expenses"], alwaysShow: true },
    ] as PresentedLine[],
  },
  feesAndOtherIncome: {
    section: "Fee & Other Income",
    lines: [
      { label: "SDR Admin Fees", sources: ["SDR Admin Fees"], alwaysShow: true },
      { label: "FA Participation Fees", sources: ["FA Participation Fees"], alwaysShow: true },
      { label: "Interest", sources: ["Interest"], alwaysShow: true },
      { label: "Referral Fees", sources: ["Referral Fees"], alwaysShow: true },
      // Rental income is presented within Other on the reviewed statement.
      { label: "Other", sources: ["Other", "Rental Income"], alwaysShow: true },
    ] as PresentedLine[],
  },
  operatingExpense: {
    section: "Operating Expense",
    /** Sits in the Operating Expense section but is presented after the subtotal. */
    excludeFromSubtotal: ["Income Tax Provision"],
    lines: [
      { label: "Bank Charges", sources: ["Bank Charges"], alwaysShow: true },
      { label: "Biz Development", sources: ["Biz Development"], alwaysShow: true },
      { label: "Compensation Incentives", sources: ["Compensation Incentives"], alwaysShow: true },
      { label: "Statement Fees Reps", sources: ["Statement Fees Reps"], alwaysShow: true },
      { label: "Depreciation & Amortization", sources: ["Depreciation & Amortization"], alwaysShow: true },
      { label: "Human Resource", sources: ["Human Resource"], alwaysShow: true },
      { label: "Bonus", sources: ["Bonus"], alwaysShow: true },
      { label: "Equipment Rental", sources: ["Equipment Rental"], alwaysShow: true },
      { label: "Telephone & Faxes", sources: ["Telephone & Faxes"], alwaysShow: true },
      { label: "Postage & Courier", sources: ["Postage & Courier"], alwaysShow: true },
      { label: "Professional Fees", sources: ["Professional Fees"], alwaysShow: true },
      { label: "Software Licenses & Modification", sources: ["Software Licenses & Modification"], alwaysShow: true },
      { label: "SDR Fees to Computershare (MT)", sources: ["SDR Fees to Computershare (MT)"], alwaysShow: true },
      { label: "Licenses, Membership & Dues", sources: ["Licenses, Membership & Dues"], alwaysShow: true },
      { label: "Recovery from Reps - MFDA Fees", sources: ["Recovery from Reps - MFDA Fees"], alwaysShow: true },
      { label: "Acquisition Expense", sources: ["Acquisition Expense"], alwaysShow: true },
      { label: "Admin. & Trade Errors", sources: ["Admin. & Trade Errors"], alwaysShow: true },
      { label: "Settlement Costs", sources: ["Settlement Costs"], alwaysShow: true },
      { label: "Misc Expenses", sources: ["Misc Expenses"], alwaysShow: true },
      { label: "Other Expenses", sources: ["Other Expenses"], alwaysShow: true },
      { label: "Payroll Expenses", sources: ["Payroll Expenses"], alwaysShow: true },
      { label: "Management Distribution", sources: ["Management Distribution"], alwaysShow: true },
      { label: "Management Fees", sources: ["Management Fees"], alwaysShow: true },
    ] as PresentedLine[],
  },
  incomeTax: {
    label: "Income Tax Provision",
    sources: ["Income Tax Provision"],
    alwaysShow: true,
  } as PresentedLine,
} as const;

export const ENTITY_NAME = "Keybase Financial Group, Inc.";

/**
 * Which side each mapping section naturally sits on. Used by validation to spot
 * a line carrying a contra balance; the generators state their own sides
 * explicitly at the point of presentation.
 */
export const SECTION_NATURAL_BALANCE: Record<string, "debit" | "credit"> = {
  // Balance Sheet
  "Current assets": "debit",
  "Capital assets": "debit",
  Goodwill: "debit",
  "Current Liabilities": "credit",
  "Long-term labilities": "credit",
  "Shareholders Equity": "credit",
  // Income Statement
  "Commission Income": "credit",
  "Fee & Other Income": "credit",
  "Commission Expense": "debit",
  "Operating Expense": "debit",
};
