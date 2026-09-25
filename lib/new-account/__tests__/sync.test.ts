import { describe, expect, it } from "vitest";

import { blankNaaf } from "@/lib/naaf/blank";
import type { NaafState } from "@/lib/naaf/types";
import { blankQuestionnaire } from "@/lib/risk-questionnaire/blank";
import type { QuestionnaireState } from "@/lib/risk-questionnaire/types";

import {
  ageFromDob,
  crqNetWorthOption,
  linkNotes,
  propagateFromCrq,
  propagateFromNaaf,
  relinkForVariant,
  splitName,
} from "../sync";

const TODAY = new Date(2026, 8, 25); // 25 Sep 2026

/** Applies one NAAF edit and returns the CRQ it produces. */
const naafEdit = (
  edit: (n: NaafState) => void,
  variant: "individual" | "joint" | "corporate" = "individual",
  base: NaafState = blankNaaf(),
  crq: QuestionnaireState = blankQuestionnaire(),
) => {
  const next = structuredClone(base);
  edit(next);
  return propagateFromNaaf(base, next, crq, variant, TODAY);
};

/** Applies one CRQ edit and returns the NAAF it produces. */
const crqEdit = (
  edit: (c: QuestionnaireState) => void,
  variant: "individual" | "joint" | "corporate" = "individual",
  base: QuestionnaireState = blankQuestionnaire(),
  naaf: NaafState = blankNaaf(),
) => {
  const next = structuredClone(base);
  edit(next);
  return propagateFromCrq(base, next, naaf, variant);
};

describe("NAAF -> CRQ", () => {
  it("copies the Client ID, the advisor's name and the account holder's name", () => {
    const crq = naafEdit((n) => {
      n.clientId = "KB123";
      n.advisor.name = "Advisor Example";
      n.clientA.firstName = "Alex";
      n.clientA.surname = "Sample";
    });
    expect(crq).toMatchObject({ clientId: "KB123", advisorName: "Advisor Example", accountHolderName: "Alex Sample" });
  });

  it("names the entity on a corporate CRQ, from the NAAF Surname (Corporation) box", () => {
    const crq = naafEdit((n) => {
      n.clientA.surname = "Example Holdings Inc.";
    }, "corporate");
    expect(crq.accountHolderName).toBe("Example Holdings Inc.");
  });

  it("fills the joint holder's name only on the joint CRQ", () => {
    const edit = (n: NaafState) => {
      n.clientB.firstName = "Sam";
      n.clientB.surname = "Sample";
    };
    expect(naafEdit(edit, "joint").jointHolderName).toBe("Sam Sample");
    expect(naafEdit(edit, "individual").jointHolderName).toBe("");
  });

  it("answers income, net worth and age group from Sections A and C", () => {
    const crq = naafEdit((n) => {
      n.kyc.A.income = "$75,000 - $99,999";
      n.kyc.A.netWorth = { liquidAssets: "60000", fixedAssets: "500000", liabilities: "300000" };
      n.clientA.dob = "03/15/80";
    });
    expect(crq.answers).toEqual({ q3: "q3_d", q5: "q5_d", q1: "q1_b" });
  });

  it("leaves the joint CRQ's income, net worth and age to be answered by hand", () => {
    const crq = naafEdit((n) => {
      n.kyc.A.income = "$75,000 - $99,999";
      n.clientA.dob = "03/15/80";
    }, "joint");
    expect(crq.answers).toEqual({});
  });

  it("does not derive an age group on the corporate CRQ, whose Question 1 is years in operation", () => {
    const crq = naafEdit((n) => {
      n.clientA.dob = "03/15/80";
    }, "corporate");
    expect(crq.answers.q1).toBeUndefined();
  });

  it("does not overwrite a CRQ answer when an unrelated NAAF box changes", () => {
    const base = blankNaaf();
    base.kyc.A.income = "$75,000 - $99,999";
    const crq = { ...blankQuestionnaire(), answers: { q3: "q3_a" } }; // advisor chose differently
    const after = naafEdit((n) => {
      n.clientA.city = "Toronto";
    }, "individual", base, crq);
    expect(after.answers.q3).toBe("q3_a");
  });

  it("clears the CRQ income when the NAAF income it filled is unticked", () => {
    const base = blankNaaf();
    base.kyc.A.income = "$75,000 - $99,999";
    const crq = { ...blankQuestionnaire(), answers: { q3: "q3_d" } };
    const after = naafEdit((n) => {
      n.kyc.A.income = null;
    }, "individual", base, crq);
    expect(after.answers.q3).toBeUndefined();
  });
});

describe("CRQ -> NAAF", () => {
  it("splits the account holder's name into first name and surname", () => {
    const naaf = crqEdit((c) => {
      c.accountHolderName = "Mary Ann Sample";
    });
    expect(naaf.clientA).toMatchObject({ firstName: "Mary Ann", surname: "Sample" });
  });

  it("puts a corporate CRQ's entity name in the NAAF Surname (Corporation) box", () => {
    const naaf = crqEdit((c) => {
      c.accountHolderName = "Example Holdings Inc.";
    }, "corporate");
    expect(naaf.clientA).toMatchObject({ surname: "Example Holdings Inc.", firstName: "" });
  });

  it("naming a joint holder turns on the NAAF's Section B", () => {
    const naaf = crqEdit((c) => {
      c.jointHolderName = "Sam Sample";
    }, "joint");
    expect(naaf.hasJointHolder).toBe(true);
    expect(naaf.clientB).toMatchObject({ firstName: "Sam", surname: "Sample" });
  });

  it("copies the Client ID, the advisor's name and the income band back", () => {
    const naaf = crqEdit((c) => {
      c.clientId = "KB123";
      c.advisorName = "Advisor Example";
      c.answers = { q3: "q3_h" };
    });
    expect(naaf.clientId).toBe("KB123");
    expect(naaf.advisor.name).toBe("Advisor Example");
    expect(naaf.kyc.A.income).toBe("$1 Million and Over");
  });

  it("never copies signatures or signing dates", () => {
    const naaf = crqEdit((c) => {
      c.accountHolderSignature = "data:image/png;base64,AAAA";
      c.accountHolderDate = "2026-09-25";
    });
    expect(naaf.clientSignatures).toEqual(blankNaaf().clientSignatures);
  });
});

describe("edition switch", () => {
  it("drops the age answer moving to the corporate edition and renames to the entity", () => {
    const naaf = blankNaaf();
    naaf.clientA.firstName = "Alex";
    naaf.clientA.surname = "Example Holdings";
    const crq = { ...blankQuestionnaire(), accountHolderName: "Alex Example Holdings", answers: { q1: "q1_b", q2: "q2_c" } };
    const out = relinkForVariant(naaf, crq, "individual", "corporate", TODAY);
    expect(out.answers).toEqual({ q2: "q2_c" });
    expect(out.accountHolderName).toBe("Example Holdings");
  });

  it("fills blank questions the NAAF answers, and keeps answers already given", () => {
    const naaf = blankNaaf();
    naaf.kyc.A.income = "Under $25,000";
    naaf.clientA.dob = "01/01/2000";
    const crq = { ...blankQuestionnaire(), answers: { q3: "q3_c" } };
    const out = relinkForVariant(naaf, crq, "joint", "individual", TODAY);
    expect(out.answers).toEqual({ q3: "q3_c", q1: "q1_a" });
  });
});

describe("link notes", () => {
  it("marks an answer that agrees with the NAAF, and flags one that does not", () => {
    const naaf = blankNaaf();
    naaf.kyc.A.income = "$75,000 - $99,999";
    naaf.kyc.A.netWorth = { liquidAssets: "10000", fixedAssets: "0", liabilities: "0" };
    const crq = { ...blankQuestionnaire(), answers: { q3: "q3_d", q5: "q5_f" } };
    const notes = linkNotes(naaf, crq, "individual", TODAY);
    expect(notes.q3?.tone).toBe("linked");
    expect(notes.q5).toMatchObject({ tone: "differs" });
    expect(notes.q5?.text).toContain("Less than $50,000");
  });
});

describe("helpers", () => {
  it("splits names", () => {
    expect(splitName("  Alex  ")).toEqual({ firstName: "Alex", surname: "" });
    expect(splitName("")).toEqual({ firstName: "", surname: "" });
  });

  it("reads the NAAF's mm/dd/yy date of birth", () => {
    expect(ageFromDob("09/25/80", TODAY)).toBe(46);
    expect(ageFromDob("09/26/80", TODAY)).toBe(45); // birthday tomorrow
    expect(ageFromDob("01/01/05", TODAY)).toBe(21); // two-digit year in this century
    expect(ageFromDob("1990-06-30", TODAY)).toBe(36);
    expect(ageFromDob("02/30/90", TODAY)).toBeNull(); // no such date
    expect(ageFromDob("Consulting", TODAY)).toBeNull(); // a corporation's nature of business
  });

  it("bands net worth, including a negative one", () => {
    expect(crqNetWorthOption(-5000)).toBe("q5_a");
    expect(crqNetWorthOption(99_999.99)).toBe("q5_b");
    expect(crqNetWorthOption(1_000_000)).toBe("q5_f");
    expect(crqNetWorthOption(null)).toBeNull();
  });
});
