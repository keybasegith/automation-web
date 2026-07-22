import { describe, it, expect } from "vitest";
import { normalizeDate, normalizeCode, normalizeTxnType, resolveHeaders } from "../normalize";
import { FUNDSERV_ALIASES, WINFUND_ALIASES } from "../normalize";

describe("normalizeDate", () => {
  it("normalizes common formats to ISO", () => {
    expect(normalizeDate("2026-07-07")).toBe("2026-07-07");
    expect(normalizeDate("2026/7/7")).toBe("2026-07-07");
    expect(normalizeDate("07/08/2026")).toBe("2026-07-08");
    expect(normalizeDate("20260707")).toBe("2026-07-07");
  });
  it("returns null for empty", () => {
    expect(normalizeDate("")).toBeNull();
    expect(normalizeDate(null)).toBeNull();
  });
});

describe("normalizeCode / txn type", () => {
  it("strips leading zeros but keeps value", () => {
    expect(normalizeCode("00123")).toBe("123");
    expect(normalizeCode("0")).toBe("0");
  });
  it("maps deposit/buy variants", () => {
    expect(normalizeTxnType("Deposit")).toBe("BUY");
    expect(normalizeTxnType("BUY")).toBe("BUY");
    expect(normalizeTxnType("Redemption")).toBe("SELL");
  });
});

describe("resolveHeaders", () => {
  it("maps fundserv headers with confidence", () => {
    const m = resolveHeaders(
      ["Order ID", "Settlement Amt", "Fund ID", "Tx Type"],
      FUNDSERV_ALIASES
    );
    expect(m.field.orderId).toBe(0);
    expect(m.field.settlementAmount).toBe(1);
    expect(m.field.fundId).toBe(2);
    expect(m.field.transactionType).toBe(3);
    expect(m.confidence.orderId).toBe("high");
  });
  it("maps winfund headers", () => {
    const m = resolveHeaders(["Wire Order #", "Plan ID", "Bank Code"], WINFUND_ALIASES);
    expect(m.field.wireOrderNumber).toBe(0);
    expect(m.field.planId).toBe(1);
    expect(m.field.bankCode).toBe(2);
  });
});
