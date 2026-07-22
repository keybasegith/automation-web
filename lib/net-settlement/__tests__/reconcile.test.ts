import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseDelimited } from "../parse";
import { reconcile } from "../reconcile";
import { categoryOf } from "../summary";
import { recommendForMatch } from "../recommendation";

function load() {
  const dir = join(__dirname, "..", "__fixtures__");
  const f = parseDelimited(readFileSync(join(dir, "fundserv-9744-cad-t1.csv"), "utf8"));
  const w = parseDelimited(readFileSync(join(dir, "winfund-9744-cad-t1.csv"), "utf8"));
  return reconcile(f, w);
}

describe("reconcile (browser-local pipeline)", () => {
  const res = load();

  it("normalizes both files", () => {
    expect(res.fundserv).toHaveLength(6);
    expect(res.winfund).toHaveLength(7);
  });

  it("detects settlement details from the data", () => {
    expect(res.detected.dealer).toBe("9744");
    expect(res.detected.currency).toBe("CAD");
    expect(res.detected.settlementDate).toBe("2026-07-07");
  });

  it("categorizes matches", () => {
    const cats = res.matches.map((m) => categoryOf(m.status));
    expect(cats.filter((c) => c === "exact").length).toBe(3); // exact + composite + aggregate
    expect(cats.filter((c) => c === "fundserv_only").length).toBe(1);
    expect(cats.filter((c) => c === "winfund_only").length).toBe(1);
    expect(cats.filter((c) => c === "discrepancy").length).toBe(2); // amount mismatch + bank code
  });

  it("computes the amount-mismatch adjustment", () => {
    const m = res.matches.find((x) => x.status === "AMOUNT_MISMATCH")!;
    const rec = recommendForMatch(m, res.fundserv, res.winfund);
    expect(rec.adjustment).toBe("Increase Winfund amount by $50.00");
  });
});
