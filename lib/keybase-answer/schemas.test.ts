import { describe, expect, it } from "vitest";

import {
  ANSWER_JSON_SCHEMA,
  AnswerShapeError,
  parseGeneratedAnswer,
} from "@/lib/keybase-answer/schemas";

const VALID = {
  status: "success",
  summary: "Higher rates raise borrowing costs across the economy.",
  sections: [
    { heading: "Borrowing costs", body: "Loans get dearer.", sourceIds: ["SRC_001"] },
  ],
  sourceIds: ["SRC_001"],
  relatedSourceIds: ["SRC_002"],
  relatedQuestions: ["How do bond prices respond?"],
  insufficientEvidence: false,
  personalizedAdviceRequest: false,
};

describe("ANSWER_JSON_SCHEMA", () => {
  /**
   * Structured Outputs with strict:true rejects a schema whose objects do not
   * list every property in `required` or allow additional ones. Getting this
   * wrong fails at request time, in production, so it is checked here.
   */
  it("marks every property required on every object", () => {
    const check = (node: Record<string, unknown>) => {
      if (node.type !== "object") return;
      const properties = Object.keys(
        (node.properties ?? {}) as Record<string, unknown>,
      );
      expect(node.additionalProperties).toBe(false);
      expect([...(node.required as string[])].sort()).toEqual(properties.sort());
      for (const value of Object.values(
        (node.properties ?? {}) as Record<string, Record<string, unknown>>,
      )) {
        if (value.type === "object") check(value);
        if (value.type === "array" && value.items) {
          check(value.items as Record<string, unknown>);
        }
      }
    };
    check(ANSWER_JSON_SCHEMA as unknown as Record<string, unknown>);
  });
});

describe("parseGeneratedAnswer", () => {
  it("accepts a well-formed answer", () => {
    const parsed = parseGeneratedAnswer(VALID);
    expect(parsed.summary).toBe(VALID.summary);
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sourceIds).toEqual(["SRC_001"]);
  });

  it.each([null, undefined, "a string", 42, ["a"]])(
    "rejects %s, which is not an answer object",
    (payload) => {
      expect(() => parseGeneratedAnswer(payload)).toThrowError(AnswerShapeError);
    },
  );

  it("rejects an answer with no summary", () => {
    expect(() => parseGeneratedAnswer({ ...VALID, summary: "   " })).toThrowError(
      AnswerShapeError,
    );
  });

  it("allows an empty summary when the model declined for want of evidence", () => {
    const parsed = parseGeneratedAnswer({
      ...VALID,
      summary: "",
      insufficientEvidence: true,
    });
    expect(parsed.insufficientEvidence).toBe(true);
  });

  it("treats an insufficient_evidence status as insufficient evidence", () => {
    expect(
      parseGeneratedAnswer({ ...VALID, status: "insufficient_evidence" })
        .insufficientEvidence,
    ).toBe(true);
  });

  it("drops a section with no body rather than rendering an empty block", () => {
    const parsed = parseGeneratedAnswer({
      ...VALID,
      sections: [
        ...VALID.sections,
        { heading: "Empty", body: "   ", sourceIds: [] },
      ],
    });
    expect(parsed.sections).toHaveLength(1);
  });

  it("discards non-string entries in the id and question lists", () => {
    const parsed = parseGeneratedAnswer({
      ...VALID,
      sourceIds: ["SRC_001", 7, null, "  "],
      relatedQuestions: ["Real question?", 3],
    });
    expect(parsed.sourceIds).toEqual(["SRC_001"]);
    expect(parsed.relatedQuestions).toEqual(["Real question?"]);
  });

  it("caps sections and related questions", () => {
    const parsed = parseGeneratedAnswer({
      ...VALID,
      sections: Array.from({ length: 9 }, (_, i) => ({
        heading: `H${i}`,
        body: "Body.",
        sourceIds: [],
      })),
      relatedQuestions: ["a?", "b?", "c?", "d?", "e?"],
    });
    expect(parsed.sections).toHaveLength(5);
    expect(parsed.relatedQuestions).toHaveLength(3);
  });

  it("falls back to success rather than inventing an unknown status", () => {
    expect(parseGeneratedAnswer({ ...VALID, status: "weird" }).status).toBe("success");
  });
});
