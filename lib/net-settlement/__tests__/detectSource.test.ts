import { describe, it, expect } from "vitest";
import { detectSource } from "../detectSource";

describe("detectSource", () => {
  it("detects Fundserv from headers", () => {
    const d = detectSource(["Order ID", "Dealer Account ID", "Settlement Amt", "Fund ID", "Tx Type"]);
    expect(d.source).toBe("fundserv");
    expect(d.confidence).toBe("high");
  });
  it("detects Winfund from headers", () => {
    const d = detectSource(["Trust Settled Date", "Wire Order #", "Plan ID", "Bank Code", "Settlement Status"]);
    expect(d.source).toBe("winfund");
    expect(d.confidence).toBe("high");
  });
  it("returns unknown for unrelated headers", () => {
    const d = detectSource(["Foo", "Bar", "Baz"]);
    expect(d.source).toBe("unknown");
  });
  it("uses filename as a tie-breaker", () => {
    const d = detectSource(["Amount", "Date"], "fundserv_export.csv");
    expect(d.source).toBe("fundserv");
  });
});
