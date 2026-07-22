import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseDelimited } from "../parse";
import { mapFundservSheet, mapWinfundSheet } from "../mapRecords";
import { matchRecords } from "../match";
import { summarize } from "../summary";
import type { FundservRecord, WinfundRecord, MatchStatus } from "../types";

function loadRecords() {
  const dir = join(__dirname, "..", "__fixtures__");
  const fSheet = parseDelimited(readFileSync(join(dir, "fundserv-9744-cad-t1.csv"), "utf8"));
  const wSheet = parseDelimited(readFileSync(join(dir, "winfund-9744-cad-t1.csv"), "utf8"));
  const fundserv: FundservRecord[] = mapFundservSheet(fSheet, "f").records.map((r, i) => ({ ...r, id: `f${i}` }));
  const winfund: WinfundRecord[] = mapWinfundSheet(wSheet, "w").records.map((r, i) => ({ ...r, id: `w${i}` }));
  return { fundserv, winfund };
}

describe("matchRecords (T+1 CAD, dealer 9744)", () => {
  const { fundserv, winfund } = loadRecords();
  const { matches } = matchRecords(fundserv, winfund);
  const statuses = matches.map((m) => m.status);
  const count = (s: MatchStatus) => statuses.filter((x) => x === s).length;

  it("parses 6 Fundserv and 7 Winfund records", () => {
    expect(fundserv).toHaveLength(6);
    expect(winfund).toHaveLength(7);
  });
  it("finds the exact reference match", () => {
    expect(count("EXACT_MATCH")).toBe(1);
  });
  it("finds the composite match (different reference)", () => {
    expect(count("COMPOSITE_MATCH")).toBe(1);
  });
  it("flags the amount mismatch", () => {
    expect(count("AMOUNT_MISMATCH")).toBe(1);
  });
  it("flags the missing bank code", () => {
    expect(count("BANK_CODE_MISSING")).toBe(1);
  });
  it("finds the aggregate (2 Winfund -> 1 Fundserv)", () => {
    expect(count("AGGREGATE_MATCH")).toBe(1);
  });
  it("reports the unmatched records on each side", () => {
    expect(count("UNMATCHED_FUNDSERV")).toBe(1);
    expect(count("UNMATCHED_WINFUND")).toBe(1);
  });
  it("never reuses a record across matches", () => {
    const fIds = matches.flatMap((m) => m.fundservIds);
    const wIds = matches.flatMap((m) => m.winfundIds);
    expect(new Set(fIds).size).toBe(fIds.length);
    expect(new Set(wIds).size).toBe(wIds.length);
  });
  it("summarizes counts and totals", () => {
    const s = summarize(fundserv, winfund, matches);
    expect(s.fundservCount).toBe(6);
    expect(s.winfundCount).toBe(7);
    expect(s.exceptions).toBeGreaterThanOrEqual(4);
  });
});
