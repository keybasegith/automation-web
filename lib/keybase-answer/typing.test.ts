import { describe, expect, it } from "vitest";

import {
  MAX_DURATION_MS,
  MIN_DURATION_MS,
  revealText,
  typingDurationMs,
} from "@/lib/keybase-answer/typing";

describe("typingDurationMs", () => {
  it("gives a short answer a readable pace rather than a flash", () => {
    expect(typingDurationMs(20)).toBe(MIN_DURATION_MS);
  });

  it("caps a long answer so the reader is never made to wait on its length", () => {
    expect(typingDurationMs(50_000)).toBe(MAX_DURATION_MS);
  });

  it("scales with length in between", () => {
    const short = typingDurationMs(400);
    const long = typingDurationMs(900);
    expect(long).toBeGreaterThan(short);
    expect(short).toBeGreaterThanOrEqual(MIN_DURATION_MS);
    expect(long).toBeLessThanOrEqual(MAX_DURATION_MS);
  });

  it("takes no time at all for nothing", () => {
    expect(typingDurationMs(0)).toBe(0);
    expect(typingDurationMs(-5)).toBe(0);
  });
});

describe("revealText", () => {
  const text = "Rates rose [1] last quarter, and bonds fell [12] in response.";

  it("returns the whole string once everything is typed", () => {
    expect(revealText(text, text.length)).toBe(text);
    expect(revealText(text, text.length + 50)).toBe(text);
    expect(revealText(text, undefined)).toBe(text);
  });

  it("reveals only the leading characters", () => {
    expect(revealText(text, 10)).toBe("Rates rose");
  });

  it("holds back a marker that is only half written", () => {
    const upToMarker = "Rates rose [1] last quarter, and bonds fell ";
    expect(upToMarker).toHaveLength(44);
    // These cuts land on "[", "[1", and "[12" of the two-digit marker.
    expect(revealText(text, 45)).toBe(upToMarker);
    expect(revealText(text, 46)).toBe(upToMarker);
    expect(revealText(text, 47)).toBe(upToMarker);
    // ...and it is released whole.
    expect(revealText(text, 48)).toBe(`${upToMarker}[12]`);
  });

  it("never leaves a bare bracket or digit on screen", () => {
    for (let i = 0; i <= text.length; i += 1) {
      const shown = revealText(text, i);
      expect(shown).not.toMatch(/\[\d*$/);
    }
  });

  it("only ever grows as more is typed", () => {
    let previous = "";
    for (let i = 0; i <= text.length; i += 1) {
      const shown = revealText(text, i);
      // A cut that released a held-back marker is longer than the one before
      // it; nothing may ever disappear once written.
      expect(shown.length).toBeGreaterThanOrEqual(previous.length);
      expect(text.startsWith(shown)).toBe(true);
      previous = shown;
    }
    expect(previous).toBe(text);
  });

  it("handles an empty reveal", () => {
    expect(revealText(text, 0)).toBe("");
    expect(revealText(text, -3)).toBe("");
  });
});
