import { describe, it, expect } from "vitest";
import { parseTransactionListing } from "../parsers/transaction-listing";
import { classifyFile } from "../file-classifier";

// Flattened text as OCR / PDF extraction would produce from the real Winfund
// "TRUST ACCOUNT LISTING" screenshot.
const WINFUND_LISTING_TEXT = `
TRUST ACCOUNT LISTING   Karthika #344   9744 T+1 Sell   Settled 07-17-2026
CURRENCY: Canadian Dollar
TRANSACTIONS DATED : July 16, 2026
CLIENT NAME   FUND   CODE   TRANSACTION TYPE / TYPE 2   TRANSACTION STATUS   AMOUNT
Hendrikx, Amanda   ATL   5012   Sell Of Shares   Settled (No Cheque)   $22,787.24
R   MFC   6155   Sell Of Shares   Settled (No Cheque)   $10,933.35
R   DYN   2210   Sell Of Shares   Settled (No Cheque)   $9,100.00
MFC   9501   Sell Of Shares   Settled (No Cheque)   $3,000.00
y   MAW   120   Sell Of Shares   Settled (No Cheque)   $10,000.00
FID   5491   Sell Of Shares   Settled (No Cheque)   $824.68
FID   1246   Sell Of Shares   Settled (No Cheque)   $4,444.44
Olacco, Luigi   FID   3998   Sell Of Shares   Settled (No Cheque)   $35,610.21
TOTAL INFLOW :   $96,699.92
TOTAL OUTFLOW :   $0.00
TOTAL FOR DATE :   $96,699.92
`;

const META = { fileName: "winfund.png", documentType: "WINFUND_UNSETTLED" as const, source: "WINFUND" as const };

describe("Winfund Trust Account Listing parser", () => {
  const r = parseTransactionListing(WINFUND_LISTING_TEXT, META);

  it("reads all 8 Sell transactions", () => {
    expect(r.transactions).toHaveLength(8);
    expect(r.transactions.every((t) => t.transactionType === "SELL_SHARES")).toBe(true);
    expect(r.transactions.every((t) => t.source === "WINFUND")).toBe(true);
  });

  it("maps FUND→supplier and CODE→fund number", () => {
    expect(r.transactions.map((t) => t.supplierCode)).toEqual(["ATL", "MFC", "DYN", "MFC", "MAW", "FID", "FID", "FID"]);
    expect(r.transactions.map((t) => t.fundCode)).toEqual(["5012", "6155", "2210", "9501", "120", "5491", "1246", "3998"]);
  });

  it("reads amounts as integer cents and totals to the printed total", () => {
    expect(r.transactions[0].normalizedAmountCents).toBe(2278724);
    expect(r.transactions[7].normalizedAmountCents).toBe(3561021);
    expect(r.sumCents).toBe(9669992); // $96,699.92
    expect(r.declaredTotalCents).toBe(9669992);
    expect(r.warnings).toHaveLength(0); // row sum matches printed total → no OCR warning
  });

  it("extracts the settlement date from the header", () => {
    expect(r.settlementDate).toBe("2026-07-17");
  });

  it("captures the settlement status", () => {
    expect(r.transactions[0].settlementStatus).toMatch(/settled \(no cheque\)/i);
  });

  it("flags an OCR row-sum mismatch as a warning", () => {
    const corrupted = WINFUND_LISTING_TEXT.replace("$22,787.24", "$22,787.99");
    const bad = parseTransactionListing(corrupted, META);
    expect(bad.warnings.some((w) => /does not match the listing/i.test(w))).toBe(true);
  });

  it("classifies the listing as a Winfund file", () => {
    expect(classifyFile(WINFUND_LISTING_TEXT).fileType).toBe("WINFUND_UNSETTLED");
  });
});
