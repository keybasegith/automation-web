import { describe, it, expect } from "vitest";
import {
  normalizeTransactionType,
  normalizeAmount,
  detectCurrency,
  isCanadianDollar,
  isNotSettled,
} from "../normalize";
import { parseAmountToCents } from "../money";
import { mapWinfundSheet, mapFundservDetailSheet } from "../parsers/row-mappers";
import type { ParsedSheet } from "@/lib/net-settlement/parse";

describe("transaction type normalization (Buy/Sell only)", () => {
  it("maps buy spellings", () => {
    for (const s of ["Buy Shares", "BUY", "Purchase", "Subscription"]) expect(normalizeTransactionType(s)).toBe("BUY_SHARES");
  });
  it("maps sell spellings", () => {
    for (const s of ["Sell of Shares", "Sell Shares", "Redemption", "Withdrawal"]) expect(normalizeTransactionType(s)).toBe("SELL_SHARES");
  });
  it("excludes out-of-scope types (returns null)", () => {
    for (const s of ["Cash Distribution", "Commission", "Deposit", "", null]) expect(normalizeTransactionType(s)).toBeNull();
  });
});

describe("amount normalization", () => {
  it("Buy negative Winfund value normalizes to positive (sign is not an error)", () => {
    const cents = parseAmountToCents("-5,000.00")!;
    expect(cents).toBe(-500000);
    expect(normalizeAmount(cents)).toBe(500000);
  });
  it("Sell uses absolute positive amount", () => {
    expect(normalizeAmount(parseAmountToCents("96,699.92")!)).toBe(9669992);
  });
});

describe("currency filtering", () => {
  it("detects CAD/USD", () => {
    expect(detectCurrency("CAD")).toBe("CAD");
    expect(detectCurrency("USD")).toBe("USD");
    expect(detectCurrency("American Dollar")).toBe("USD");
  });
  it("keeps CAD/unknown, excludes USD", () => {
    expect(isCanadianDollar("CAD")).toBe(true);
    expect(isCanadianDollar("")).toBe(true);
    expect(isCanadianDollar("USD")).toBe(false);
  });
});

describe("not-settled status", () => {
  it("recognizes Not Settled variants", () => {
    expect(isNotSettled("Not Settled")).toBe(true);
    expect(isNotSettled("Settled")).toBe(false);
  });
});

function sheet(headers: string[], rows: Record<string, unknown>[]): ParsedSheet {
  return {
    name: "Transactions",
    headers,
    rows: rows.map((cells, i) => ({ rowNumber: i + 2, cells })),
  };
}

describe("row mappers — CAD filtering + USD exclusion", () => {
  const headers = ["Supplier", "Fund", "Plan ID", "Transaction Type", "Amount", "Settlement Status", "Currency"];
  it("excludes USD rows and counts them", () => {
    const s = sheet(headers, [
      { Supplier: "PIM", Fund: "100", "Plan ID": "P1", "Transaction Type": "Buy", Amount: "-500.00", "Settlement Status": "Not Settled", Currency: "CAD" },
      { Supplier: "PIM", Fund: "101", "Plan ID": "P2", "Transaction Type": "Buy", Amount: "-600.00", "Settlement Status": "Not Settled", Currency: "USD" },
    ]);
    const r = mapWinfundSheet(s, "w1", "winfund.xlsx");
    expect(r.transactions).toHaveLength(1);
    expect(r.usdExcludedCount).toBe(1);
    expect(r.transactions[0].normalizedAmountCents).toBe(50000);
    expect(r.transactions[0].transactionType).toBe("BUY_SHARES");
  });
  it("drops out-of-scope types in the detail file", () => {
    const s = sheet(["Supplier", "Fund", "Plan ID", "Transaction Type", "Amount"], [
      { Supplier: "PIM", Fund: "100", "Plan ID": "P1", "Transaction Type": "Sell of Shares", Amount: "500.00" },
      { Supplier: "PIM", Fund: "100", "Plan ID": "P2", "Transaction Type": "Cash Distribution", Amount: "10.00" },
    ]);
    const r = mapFundservDetailSheet(s, "f1", "detail.xlsx");
    expect(r.transactions).toHaveLength(1);
    expect(r.outOfScopeCount).toBe(1);
    expect(r.transactions[0].transactionType).toBe("SELL_SHARES");
  });
});
