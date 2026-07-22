import { describe, it, expect } from "vitest";
import { parseAmountToCents, formatCents, formatMoney, sumCents } from "../money";

describe("parseAmountToCents", () => {
  it("parses plain and grouped amounts", () => {
    expect(parseAmountToCents("5,000.00")).toBe(500000);
    expect(parseAmountToCents("1234.56")).toBe(123456);
    expect(parseAmountToCents("$1,234.56")).toBe(123456);
    expect(parseAmountToCents(1234.56)).toBe(123456);
    expect(parseAmountToCents("0")).toBe(0);
  });
  it("handles negatives (brackets, trailing sign, DR)", () => {
    expect(parseAmountToCents("(50.00)")).toBe(-5000);
    expect(parseAmountToCents("50.00-")).toBe(-5000);
    expect(parseAmountToCents("100 DR")).toBe(-10000);
    expect(parseAmountToCents("100 CR")).toBe(10000);
  });
  it("handles EU decimal comma", () => {
    expect(parseAmountToCents("1.000,50")).toBe(100050);
  });
  it("returns null for non-numeric", () => {
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents(null)).toBeNull();
    expect(parseAmountToCents("N/A")).toBeNull();
  });
  it("is decimal-safe (no float drift)", () => {
    expect(parseAmountToCents("0.1")! + parseAmountToCents("0.2")!).toBe(30);
  });
});

describe("formatting", () => {
  it("formats cents", () => {
    expect(formatCents(500000)).toBe("5000.00");
    expect(formatCents(-5000)).toBe("-50.00");
    expect(formatMoney(-500000, "CAD")).toBe("-CAD 5,000.00");
  });
  it("sums exactly", () => {
    expect(sumCents([100000, 200000, -5000])).toBe(295000);
  });
});
