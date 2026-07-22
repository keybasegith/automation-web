import { describe, it, expect } from "vitest";
import { analyze, matchTransactions } from "../reconciliation";
import { buildFixture } from "../fixtures";
import type { MismatchStatus } from "../types";

function statuses(scenario: Parameters<typeof buildFixture>[0]): MismatchStatus[] {
  return analyze(buildFixture(scenario)).matches.map((m) => m.status);
}

describe("all matched", () => {
  const r = analyze(buildFixture("all_matched"));
  it("reports overall MATCHED", () => {
    expect(r.overallStatus).toBe("MATCHED");
  });
  it("Buy totals reconcile to the sample (81 / $470,893.05)", () => {
    expect(r.buy.detailCount).toBe(81);
    expect(r.buy.detailTotalCents).toBe(47089305);
    expect(r.buy.winfundTotalCents).toBe(47089305);
    expect(r.buy.amountDifferenceCents).toBe(0);
    expect(r.buy.matched).toBe(true);
  });
  it("Sell totals reconcile (8 / $96,699.92)", () => {
    expect(r.sell.detailCount).toBe(8);
    expect(r.sell.detailTotalCents).toBe(9669992);
    expect(r.sell.winfundTotalCents).toBe(9669992);
    expect(r.sell.amountDifferenceCents).toBe(0);
    expect(r.sell.matched).toBe(true);
  });
  it("every match is EXACT_MATCH", () => {
    expect(r.matches.every((m) => m.status === "EXACT_MATCH")).toBe(true);
  });
});

describe("missing Buy transaction ($500)", () => {
  const r = analyze(buildFixture("missing_buy"));
  it("flags MISSING_IN_WINFUND", () => {
    expect(statuses("missing_buy")).toContain("MISSING_IN_WINFUND");
  });
  it("Buy amount differs by $500 and count by 1", () => {
    expect(r.buy.amountDifferenceCents).toBe(50000);
    expect(r.buy.countDifference).toBe(1);
    expect(r.overallStatus).toBe("BUY_MISMATCH");
  });
});

describe("Buy amount mismatch ($50)", () => {
  const r = analyze(buildFixture("buy_amount_mismatch"));
  it("flags AMOUNT_MISMATCH", () => {
    expect(statuses("buy_amount_mismatch")).toContain("AMOUNT_MISMATCH");
  });
  it("Buy total differs by $50", () => {
    expect(r.buy.amountDifferenceCents).toBe(5000);
    expect(r.buy.countDifference).toBe(0);
  });
});

describe("duplicate Sell", () => {
  const r = analyze(buildFixture("duplicate_sell"));
  it("flags DUPLICATE_IN_WINFUND", () => {
    expect(statuses("duplicate_sell")).toContain("DUPLICATE_IN_WINFUND");
  });
  it("Sell count difference is negative (extra Winfund row)", () => {
    expect(r.sell.countDifference).toBe(-1);
    expect(r.overallStatus).toBe("SELL_MISMATCH");
  });
});

describe("wrong settlement date", () => {
  it("flags WRONG_SETTLEMENT_DATE", () => {
    const r = analyze(buildFixture("wrong_date"));
    const wd = r.matches.find((m) => m.status === "WRONG_SETTLEMENT_DATE");
    expect(wd).toBeTruthy();
    expect(wd!.dateDifferenceDays).toBe(1);
  });
});

describe("wrong status", () => {
  it("flags WRONG_STATUS", () => {
    expect(statuses("wrong_status")).toContain("WRONG_STATUS");
  });
});

describe("extra in Winfund", () => {
  it("flags EXTRA_IN_WINFUND for a Winfund-only row", () => {
    const input = buildFixture("all_matched");
    // Add a Winfund row with no Fundserv counterpart.
    input.winfund.push({
      ...input.winfund[0],
      id: "W_EXTRA",
      supplierCode: "AGF",
      fundCode: "9999",
      planId: "PX",
      workOrderNumber: "WOX",
    });
    const r = analyze(input);
    expect(r.matches.some((m) => m.status === "EXTRA_IN_WINFUND")).toBe(true);
  });
});

describe("wrong transaction type", () => {
  it("flags WRONG_TRANSACTION_TYPE when identifying fields + amount match but type differs", () => {
    const input = buildFixture("all_matched");
    // Flip the Winfund counterpart of buy F0 to a Sell of the same amount.
    const w = input.winfund.find((x) => x.id === "W_F0")!;
    w.transactionType = "SELL_SHARES";
    w.originalAmountCents = Math.abs(w.originalAmountCents);
    const matches = matchTransactions(input.fundservDetail, input.winfund);
    expect(matches.some((m) => m.status === "WRONG_TRANSACTION_TYPE")).toBe(true);
  });
});

describe("count difference with offsetting mismatches", () => {
  it("total can match while count differs (not MATCHED)", () => {
    // Remove one Winfund buy and add a duplicate of another with the same total.
    const input = buildFixture("all_matched");
    const removed = input.winfund.find((w) => w.id === "W_F0")!; // $500
    input.winfund = input.winfund.filter((w) => w.id !== "W_F0");
    const other = input.winfund.find((w) => w.id === "W_F1")!;
    input.winfund.push({ ...other, id: "W_F1_DUP", normalizedAmountCents: removed.normalizedAmountCents, originalAmountCents: -removed.normalizedAmountCents });
    const r = analyze(input);
    // Buy Winfund total unchanged, but a missing + duplicate remain → not matched.
    expect(r.buy.matched).toBe(false);
    expect(r.buy.mismatchCount).toBeGreaterThan(0);
  });
});

describe("file review required (no silent fallback)", () => {
  it("returns FILE_REVIEW_REQUIRED when the summary is missing", () => {
    const input = buildFixture("all_matched");
    input.category = null;
    const r = analyze(input);
    expect(r.overallStatus).toBe("FILE_REVIEW_REQUIRED");
  });
  it("blocks on differing settlement dates", () => {
    const input = buildFixture("all_matched");
    input.fundservDetail[0].settlementDate = "2026-07-18";
    const r = analyze(input);
    expect(r.overallStatus).toBe("FILE_REVIEW_REQUIRED");
    expect(r.blockingErrors.some((e) => /different settlement dates/i.test(e))).toBe(true);
  });
});
