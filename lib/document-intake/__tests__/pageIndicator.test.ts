import { describe, expect, it } from "vitest";
import {
  indicatorsAreConsecutive,
  parsePageIndicator,
} from "../pageIndicator";

describe("parsePageIndicator", () => {
  it("reads the standard English stamp", () => {
    expect(parsePageIndicator("Page 1 of 3")).toEqual({ index: 1, total: 3 });
    expect(parsePageIndicator("page 2 of 3")).toEqual({ index: 2, total: 3 });
    expect(parsePageIndicator("PAGE 3 OF 3")).toEqual({ index: 3, total: 3 });
  });

  it("reads the abbreviated and slash forms", () => {
    expect(parsePageIndicator("Pg. 2 of 4")).toEqual({ index: 2, total: 4 });
    expect(parsePageIndicator("Page 1/2")).toEqual({ index: 1, total: 2 });
    expect(parsePageIndicator("Pg 3 / 5")).toEqual({ index: 3, total: 5 });
  });

  it("reads the French forms on bilingual Canadian documents", () => {
    expect(parsePageIndicator("Page 2 sur 3")).toEqual({ index: 2, total: 3 });
    expect(parsePageIndicator("Page 1 de 2")).toEqual({ index: 1, total: 2 });
  });

  it("reads a bare stamp with no keyword", () => {
    expect(parsePageIndicator("10099   2 of 2")).toEqual({
      index: 2,
      total: 2,
    });
  });

  it("prefers a keyword stamp over a bare one elsewhere in the band", () => {
    // "1 of 3" is body-ish noise; the real stamp is the keyword form.
    expect(parsePageIndicator("Select 1 of 3 options — Page 2 of 4")).toEqual({
      index: 2,
      total: 4,
    });
  });

  it("returns nothing when there is no stamp", () => {
    expect(parsePageIndicator("Know Your Client Update")).toBeUndefined();
    expect(parsePageIndicator("")).toBeUndefined();
    expect(parsePageIndicator(undefined)).toBeUndefined();
  });

  it("rejects implausible stamps", () => {
    // index > total
    expect(parsePageIndicator("Page 5 of 3")).toBeUndefined();
    // zero index
    expect(parsePageIndicator("Page 0 of 3")).toBeUndefined();
  });

  it("does not treat long digit runs as a stamp", () => {
    // Account numbers must not be read as "123 of 456".
    expect(parsePageIndicator("Account 1234 of 5678")).toBeUndefined();
  });
});

describe("indicatorsAreConsecutive", () => {
  it("accepts the next page of the same document", () => {
    expect(
      indicatorsAreConsecutive({ index: 1, total: 3 }, { index: 2, total: 3 })
    ).toBe(true);
  });

  it("rejects a restart, a skip, and a different total", () => {
    expect(
      indicatorsAreConsecutive({ index: 3, total: 3 }, { index: 1, total: 3 })
    ).toBe(false);
    expect(
      indicatorsAreConsecutive({ index: 1, total: 3 }, { index: 3, total: 3 })
    ).toBe(false);
    expect(
      indicatorsAreConsecutive({ index: 1, total: 3 }, { index: 2, total: 2 })
    ).toBe(false);
  });

  it("rejects when either side has no stamp", () => {
    expect(indicatorsAreConsecutive(undefined, { index: 2, total: 3 })).toBe(
      false
    );
    expect(indicatorsAreConsecutive({ index: 1, total: 3 }, undefined)).toBe(
      false
    );
  });
});
