import { describe, expect, it } from "vitest";

import { baseGlCodeAsNumber, normalizeAccountCode } from "../accounts/normalizeAccount";

describe("normalizeAccountCode", () => {
  it("keeps the raw code and decomposes it", () => {
    const account = normalizeAccountCode("1000-K");
    expect(account).not.toBeNull();
    expect(account!.rawAccountCode).toBe("1000-K");
    expect(account!.normalizedFullCode).toBe("1000-K");
    expect(account!.baseGlCode).toBe("1000");
    expect(account!.companyCode).toBe("K");
    expect(account!.subAccount).toBe("");
  });

  it("keeps a sub-account distinct from its base account", () => {
    const sub = normalizeAccountCode("1000-K-I")!;
    expect(sub.normalizedFullCode).toBe("1000-K-I");
    expect(sub.baseGlCode).toBe("1000");
    expect(sub.subAccount).toBe("I");
    expect(sub.normalizedFullCode).not.toBe(normalizeAccountCode("1000-K")!.normalizedFullCode);
  });

  it("treats a space or underscore as the same separator as a hyphen", () => {
    for (const raw of ["1000 K", "1000_K", " 1000-K ", "1000--K"]) {
      expect(normalizeAccountCode(raw)!.normalizedFullCode).toBe("1000-K");
    }
  });

  it("upper-cases so matching is case-insensitive", () => {
    expect(normalizeAccountCode("4833-k-cig")!.normalizedFullCode).toBe("4833-K-CIG");
  });

  it("reads the real sub-account shapes in this chart of accounts", () => {
    for (const raw of ["1101-K-00008", "1101-K-0431B", "1101-K-0M610", "4833-K-TML", "3100-K-I"]) {
      expect(normalizeAccountCode(raw)!.normalizedFullCode).toBe(raw);
    }
  });

  it("rejects report furniture rather than reading it as an account", () => {
    for (const raw of ["", "   ", "Total:", "163 accounts printed", "Net Income (Loss)", "Page 1", "K-1000"]) {
      expect(normalizeAccountCode(raw)).toBeNull();
    }
  });

  it("exposes the base code as a number for range matching", () => {
    expect(baseGlCodeAsNumber(normalizeAccountCode("5420-K")!)).toBe(5420);
  });
});
