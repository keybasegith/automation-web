import { describe, it, expect } from "vitest";
import { parseCategorySummary } from "../parsers/fundserv-summary";
import { SAMPLE_CATEGORY_SUMMARY_TEXT } from "../fixtures";

describe("Fundserv Category Summary parser", () => {
  const meta = { fileName: "category.pdf", documentType: "FUNDSERV_CATEGORY_SUMMARY" as const, page: 1 };
  const parsed = parseCategorySummary(SAMPLE_CATEGORY_SUMMARY_TEXT, meta);

  it("extracts Buy from Net Matched - Pay Only", () => {
    expect(parsed.buy.amountCents).toBe(47089305); // 470,893.05
    expect(parsed.buy.txCount).toBe(81);
    expect(parsed.buy.source.row).toBe("Net Matched - Pay Only");
    expect(parsed.buy.source.extractionStatus).toBe("extracted");
  });

  it("extracts Sell from Net Matched - Rec Only", () => {
    expect(parsed.sell.amountCents).toBe(9669992); // 96,699.92
    expect(parsed.sell.txCount).toBe(8);
    expect(parsed.sell.source.row).toBe("Net Matched - Rec Only");
  });

  it("captures Net Matched - All as secondary validation", () => {
    expect(parsed.netMatchedAll?.payableCents).toBe(47089305);
    expect(parsed.netMatchedAll?.receivableCents).toBe(9669992);
  });

  it("excludes the USD section (does not read 12,000.00)", () => {
    expect(parsed.buy.amountCents).not.toBe(1200000);
    expect(parsed.warnings.some((w) => /USD/i.test(w))).toBe(true);
  });

  it("reports unavailable when the summary cannot be read", () => {
    const empty = parseCategorySummary("no category content here", meta);
    expect(empty.parsed).toBe(false);
    expect(empty.buy.amountCents).toBeNull();
    expect(empty.buy.source.extractionStatus).toBe("unavailable");
  });
});
