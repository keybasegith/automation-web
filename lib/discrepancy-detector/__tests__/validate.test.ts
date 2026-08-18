import { describe, expect, it } from "vitest";
import {
  assessTextLayer,
  detectCrqVersion,
  isGarbledText,
  isSaneClientId,
  looksLikeCrq,
  looksLikeNaaf,
} from "../validate";
import { detectDocKind } from "../extract";

/** A run of Unicode private-use characters - what a broken subset font decodes to. */
const privateUse = (n: number): string =>
  Array.from({ length: n }, (_, i) => String.fromCharCode(0xe000 + (i % 200))).join("");

const REAL_NAAF_TEXT = `
New Account Application Form V3-NAAFE-2022
Section A - Account Holder Information
Client ID: C-10045
Surname: Tremblay First Name: Marie
Section C - Client KYC
Approximate Income: $75,000 - $99,999
Investment Plan 1 Risk Tolerance: Medium Time Horizon: 10 - 20 Years
Section M - Trusted Contact Person
`;

const REAL_CRQ_TEXT = `
Client Risk Questionnaire v2-crq25 - Individual Account Holder
Client ID: C-10045
Risk Capacity Score Total: 30
Risk Tolerance Score Total: 30
Risk Ranking: Medium
`;

describe("isGarbledText", () => {
  it("accepts ordinary form text", () => {
    expect(isGarbledText(REAL_NAAF_TEXT)).toBe(false);
    expect(isGarbledText(REAL_CRQ_TEXT)).toBe(false);
  });

  it("does not trip on the punctuation these forms are full of", () => {
    // Income bands are dense with $ , - and digits; none of that is garbling.
    expect(
      isGarbledText(
        "Approximate Income: $25,000 - $49,999 / $1 Million and Over; Net Worth $250,000.00"
      )
    ).toBe(false);
  });

  it("rejects a text layer that decoded to private-use glyphs", () => {
    // What a broken custom font encoding actually produces.
    const glyphSoup = privateUse(200);
    expect(isGarbledText(glyphSoup)).toBe(true);
  });

  it("rejects a text layer full of replacement characters", () => {
    expect(isGarbledText("\uFFFD".repeat(200))).toBe(true);
  });

  it("rejects consonant soup with no real words", () => {
    expect(isGarbledText("zxcv bnmq wrtp lkjh gfds nbvc xzlk qwrt")).toBe(true);
  });

  it("treats empty text as unusable", () => {
    expect(isGarbledText("")).toBe(true);
    expect(isGarbledText("   \n  ")).toBe(true);
  });
});

describe("document identity anchors", () => {
  it("recognises a NAAF and a CRQ", () => {
    expect(looksLikeNaaf(REAL_NAAF_TEXT)).toBe(true);
    expect(looksLikeCrq(REAL_CRQ_TEXT)).toBe(true);
  });

  it("does not mistake an unrelated document for either", () => {
    const unrelated = "Monthly account statement. Opening balance. Closing balance.";
    expect(looksLikeNaaf(unrelated)).toBe(false);
    expect(looksLikeCrq(unrelated)).toBe(false);
  });

  it("tells the two forms apart", () => {
    // Both forms say "account holder" and "risk tolerance", so the anchors must
    // not lean on shared vocabulary or a swapped upload would sail through.
    expect(looksLikeCrq(REAL_NAAF_TEXT)).toBe(false);
    expect(looksLikeNaaf(REAL_CRQ_TEXT)).toBe(false);
  });
});

describe("detectCrqVersion", () => {
  it("detects each of the three layouts from the header", () => {
    expect(detectCrqVersion("Client Risk Questionnaire - Individual Account Holder")).toBe(
      "Individual"
    );
    expect(detectCrqVersion("Client Risk Questionnaire - Joint Account Holders")).toBe(
      "Joint"
    );
    expect(detectCrqVersion("Client Risk Questionnaire - Corporate Accounts")).toBe(
      "Corporate"
    );
  });

  it("does not read the Joint layout as Individual", () => {
    // The Joint header also contains "Account Holder"; order of checks matters.
    expect(detectCrqVersion("Joint Account Holders risk questionnaire")).toBe("Joint");
  });

  it("returns null when the header says nothing", () => {
    expect(detectCrqVersion("Client Risk Questionnaire")).toBeNull();
  });
});

describe("isSaneClientId", () => {
  it("accepts realistic IDs", () => {
    expect(isSaneClientId("C-10045")).toBe(true);
    expect(isSaneClientId("100450")).toBe(true);
  });

  it("rejects junk", () => {
    expect(isSaneClientId(privateUse(6))).toBe(false);
    expect(isSaneClientId("--")).toBe(false);
    expect(isSaneClientId("")).toBe(false);
  });
});

describe("assessTextLayer", () => {
  it("passes a real NAAF text layer", () => {
    expect(assessTextLayer(REAL_NAAF_TEXT, "naaf").usable).toBe(true);
  });

  it("falls back to manual entry for a scan (no text layer)", () => {
    const verdict = assessTextLayer("", "naaf");
    expect(verdict.usable).toBe(false);
    expect(verdict.reason).toContain("no selectable text");
  });

  it("falls back to manual entry for a garbled text layer", () => {
    const verdict = assessTextLayer(privateUse(300), "naaf");
    expect(verdict.usable).toBe(false);
    expect(verdict.reason).toContain("unreadable characters");
  });

  it("catches the two documents being uploaded the wrong way round", () => {
    expect(assessTextLayer(REAL_CRQ_TEXT, "naaf").usable).toBe(false);
  });
});

describe("detectDocKind on a flattened submission", () => {
  // A flattened export keeps the printed body text but loses the header, which
  // is part of the page image. These strings are the section headings such a
  // file still carries; no client data is reproduced.
  const KYC_BODY = `
    D. Know Your Client Information ( KYC)
    Plan ID & Plan Type:
    E. Trusted Contact Person
    F. Authorization
    G. Dealer/Financial Advisor Information Dealer Code: Rep Code:
  `;
  const NAAF_BODY = `
    I. Trusted Contact Person
    L. Financial Advisor Outside Business Activities Not Applicable
    M. Account Agreement
    N. Dealer/Financial Advisor Information Dealer Code: Rep Code:
  `;

  it("recognises a KYC from its section headings alone", () => {
    expect(detectDocKind(KYC_BODY)).toBe("KYC");
  });

  it("recognises a NAAF from its section headings alone", () => {
    expect(detectDocKind(NAAF_BODY)).toBe("NAAF");
  });

  it("still prefers the printed title when it survived", () => {
    expect(detectDocKind("Know Your Client Update\n" + KYC_BODY)).toBe("KYC");
    expect(detectDocKind("New Account Application Form\n" + NAAF_BODY)).toBe("NAAF");
  });

  it("does not read an ordinary mention of a trusted contact as a section heading", () => {
    // "...allow us to contact the Trusted Contact Person" must not match the
    // KYC's "E. Trusted Contact Person".
    expect(
      detectDocKind("your Advisor to contact the Trusted Contact Person\n" + NAAF_BODY)
    ).toBe("NAAF");
  });

  it("falls back to NAAF, the stricter form, when nothing identifies it", () => {
    expect(detectDocKind("some unrelated document")).toBe("NAAF");
  });
});
