import { describe, expect, it } from "vitest";
import { parseAdvisors, resolveAdvisor } from "../advisors";
import type { Advisor } from "../types";

const ADVISORS: Advisor[] = [
  { rep_code: "1234", advisor_name: "Jane Doe", email: "jdoe@firm.example" },
  { rep_code: "5678", advisor_name: "John Smith", email: "jsmith@firm.example" },
];

describe("parseAdvisors", () => {
  it("reads the documented JSON shape", () => {
    expect(parseAdvisors(ADVISORS)).toHaveLength(2);
  });

  it("discards entries missing a name or an email rather than throwing", () => {
    // A non-developer edits this file by hand; a typo must not crash the tool.
    const raw = [
      { rep_code: "1", advisor_name: "No Email" },
      { rep_code: "2", email: "noname@firm.example" },
      { rep_code: "3", advisor_name: "Good One", email: "good@firm.example" },
    ];
    expect(parseAdvisors(raw).map((a) => a.advisor_name)).toEqual(["Good One"]);
  });

  it("survives a malformed file", () => {
    expect(parseAdvisors(null)).toEqual([]);
    expect(parseAdvisors({})).toEqual([]);
    expect(parseAdvisors(["nonsense"])).toEqual([]);
  });
});

describe("resolveAdvisor", () => {
  it("matches on rep code first", () => {
    const m = resolveAdvisor(ADVISORS, "1234", "");
    expect(m.confident).toBe(true);
    expect(m.basis).toBe("rep_code");
    expect(m.advisor?.email).toBe("jdoe@firm.example");
  });

  it("prefers the rep code over a conflicting advisor name", () => {
    // A code is more reliable than a handwritten or mistyped name.
    const m = resolveAdvisor(ADVISORS, "1234", "John Smith");
    expect(m.advisor?.advisor_name).toBe("Jane Doe");
    expect(m.basis).toBe("rep_code");
  });

  it("falls back to the name when the rep code is absent", () => {
    const m = resolveAdvisor(ADVISORS, "", "John Smith");
    expect(m.confident).toBe(true);
    expect(m.basis).toBe("name");
    expect(m.advisor?.email).toBe("jsmith@firm.example");
  });

  it("falls back to the name when the rep code is unknown, and says so", () => {
    const m = resolveAdvisor(ADVISORS, "9999", "Jane Doe");
    expect(m.advisor?.email).toBe("jdoe@firm.example");
    expect(m.reason).toContain("not in the contact file");
  });

  it("never auto-selects when a name is ambiguous", () => {
    // Sending KYC details to the wrong advisor is a privacy incident.
    const dupes: Advisor[] = [
      { rep_code: "1", advisor_name: "Jane Doe", email: "jane1@firm.example" },
      { rep_code: "2", advisor_name: "Jane Doe", email: "jane2@firm.example" },
    ];
    const m = resolveAdvisor(dupes, "", "Jane Doe");
    expect(m.confident).toBe(false);
    expect(m.advisor).toBeNull();
  });

  it("never auto-selects when a rep code is duplicated", () => {
    const dupes: Advisor[] = [
      { rep_code: "1234", advisor_name: "A", email: "a@firm.example" },
      { rep_code: "1234", advisor_name: "B", email: "b@firm.example" },
    ];
    const m = resolveAdvisor(dupes, "1234", "");
    expect(m.confident).toBe(false);
    expect(m.advisor).toBeNull();
  });

  it("reports no match when nothing resolves", () => {
    const m = resolveAdvisor(ADVISORS, "0000", "Nobody Here");
    expect(m.confident).toBe(false);
    expect(m.advisor).toBeNull();
    expect(m.basis).toBe("none");
  });

  it("reports no match when the NAAF gives nothing to match on", () => {
    const m = resolveAdvisor(ADVISORS, "", "");
    expect(m.confident).toBe(false);
    expect(m.reason).toContain("no rep code or advisor name");
  });

  it("ignores case and whitespace noise in the rep code", () => {
    expect(resolveAdvisor(ADVISORS, " 1234 ", "").advisor?.email).toBe(
      "jdoe@firm.example"
    );
  });
});
