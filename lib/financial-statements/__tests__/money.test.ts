import { describe, expect, it } from "vitest";

import {
  absCents, centsToNumber, formatCents, parseMoneyToCents, subtractCents, sumCents,
} from "../money";

describe("parseMoneyToCents", () => {
  const cents = (v: unknown) => parseMoneyToCents(v).cents;

  it("reads the shapes a Trial Balance export actually contains", () => {
    expect(cents(0)).toBe(0n);
    expect(cents("0")).toBe(0n);
    expect(cents("0.00")).toBe(0n);
    expect(cents("0.01")).toBe(1n);
    expect(cents("-0.01")).toBe(-1n);
    expect(cents("1,234.56")).toBe(123456n);
    expect(cents("(1,234.56)")).toBe(-123456n);
    expect(cents("$1,234.56")).toBe(123456n);
    expect(cents("$ (1,234.56)")).toBe(-123456n);
    expect(cents("1,234.56-")).toBe(-123456n);
    expect(cents("-1,234.56")).toBe(-123456n);
  });

  it("treats an empty cell as nil rather than an error", () => {
    for (const blank of [null, undefined, "", "   ", "-"]) {
      const result = parseMoneyToCents(blank);
      expect(result.ok).toBe(true);
      expect(result.isBlank).toBe(true);
      expect(result.cents).toBe(0n);
    }
  });

  it("distinguishes an explicit zero from a blank cell", () => {
    expect(parseMoneyToCents("0.00").isBlank).toBe(false);
    expect(parseMoneyToCents("").isBlank).toBe(true);
  });

  it("reads spreadsheet floats without floating-point drift", () => {
    expect(cents(123456.78)).toBe(12345678n);
    expect(cents(8765432.10)).toBe(876543210n);
    expect(cents(-1999999.99)).toBe(-199999999n);
    expect(cents(0.1)).toBe(10n);
    expect(cents(1e6)).toBe(100000000n);
  });

  it("rounds a third decimal half away from zero", () => {
    expect(cents("1.005")).toBe(101n);
    expect(cents("1.004")).toBe(100n);
    expect(cents("-1.005")).toBe(-101n);
  });

  it("rejects rather than guesses at anything unreadable", () => {
    for (const bad of ["abc", "12.34.56", "1,2x4", {}, []]) {
      expect(parseMoneyToCents(bad).ok).toBe(false);
    }
  });

  it("never returns a value when it is not ok", () => {
    const result = parseMoneyToCents("nonsense");
    expect(result.ok).toBe(false);
    expect(result.cents).toBe(0n);
    expect(result.reason).toBeTruthy();
  });
});

describe("formatCents", () => {
  it("renders two decimals with thousands separators", () => {
    expect(formatCents(9876543210n)).toBe("98,765,432.10");
    expect(formatCents(0n)).toBe("0.00");
    expect(formatCents(1n)).toBe("0.01");
    expect(formatCents(-123456n)).toBe("-1,234.56");
  });

  it("renders negatives in parentheses when asked", () => {
    expect(formatCents(-123456n, { parentheses: true })).toBe("(1,234.56)");
    expect(formatCents(123456n, { parentheses: true })).toBe("1,234.56");
  });

  it("adds a currency symbol when asked", () => {
    expect(formatCents(123456n, { currency: true })).toBe("$1,234.56");
    expect(formatCents(-123456n, { currency: true, parentheses: true })).toBe("($1,234.56)");
  });

  it("round-trips through the parser", () => {
    for (const value of [0n, 1n, -1n, 123456n, -987654321n, 4444555566n]) {
      expect(parseMoneyToCents(formatCents(value)).cents).toBe(value);
    }
  });
});

describe("arithmetic", () => {
  it("sums without floating point", () => {
    expect(sumCents([1n, 2n, 3n])).toBe(6n);
    expect(sumCents([])).toBe(0n);
    // 0.1 + 0.2 in cents is exact.
    expect(sumCents([10n, 20n])).toBe(30n);
  });

  it("subtracts and takes absolutes", () => {
    expect(subtractCents(100n, 30n)).toBe(70n);
    expect(subtractCents(30n, 100n)).toBe(-70n);
    expect(absCents(-70n)).toBe(70n);
  });

  it("converts to a spreadsheet number with exactly two decimals", () => {
    expect(centsToNumber(9876543210n)).toBe(98765432.10);
    expect(centsToNumber(-1n)).toBe(-0.01);
    expect(centsToNumber(0n)).toBe(0);
  });

  it("refuses to convert a value it cannot represent exactly", () => {
    expect(() => centsToNumber(BigInt(Number.MAX_SAFE_INTEGER) + 10n)).toThrow(RangeError);
  });
});
