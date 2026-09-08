import { describe, expect, it } from "vitest";

import { KeybaseAnswerError } from "@/lib/keybase-answer/errors";
import {
  containsSensitiveData,
  readQuestionFromBody,
  redactForLogs,
  validateQuestion,
} from "@/lib/keybase-answer/guardrails";

describe("validateQuestion", () => {
  it("accepts and tidies an ordinary question", () => {
    expect(validateQuestion("  How are interest rates affecting markets? ").question).toBe(
      "How are interest rates affecting markets?",
    );
  });

  it("rejects a blank question", () => {
    expect(() => validateQuestion("   ")).toThrowError(
      expect.objectContaining({ code: "question_empty" }),
    );
  });

  it("rejects a question that is not a string", () => {
    for (const value of [null, undefined, 42, [], {}]) {
      expect(() => validateQuestion(value)).toThrowError(
        expect.objectContaining({ code: "invalid_request" }),
      );
    }
  });

  it("rejects a question past the configured length", () => {
    expect(() => validateQuestion("a".repeat(5000))).toThrowError(
      expect.objectContaining({ code: "question_too_long" }),
    );
  });

  it("never puts an internal detail in the visitor-facing message", () => {
    try {
      validateQuestion(42);
      throw new Error("expected a rejection");
    } catch (err) {
      const error = err as KeybaseAnswerError;
      expect(error.publicMessage).not.toContain("number");
      expect(error.message).toContain("number");
    }
  });
});

describe("readQuestionFromBody", () => {
  it("rejects anything that is not a JSON object", () => {
    for (const body of ["a string", 7, null, ["question"]]) {
      expect(() => readQuestionFromBody(body)).toThrowError(
        expect.objectContaining({ code: "invalid_request" }),
      );
    }
  });

  it("reads the question out of a well-formed body", () => {
    expect(readQuestionFromBody({ question: "What is a TFSA?" }).question).toBe(
      "What is a TFSA?",
    );
  });
});

describe("sensitive data", () => {
  it.each([
    "My account number is 4111 1111 1111 1111, what should I do?",
    "My SIN is 123 456 789",
    "Email me at someone@example.com",
    "Account number: 88213-4",
  ])("recognises %s", (question) => {
    expect(containsSensitiveData(question)).toBe(true);
  });

  it("does not flag ordinary figures in a financial question", () => {
    expect(
      containsSensitiveData("What does a 25 basis point cut mean for markets?"),
    ).toBe(false);
  });

  it("drops the whole question from logs rather than trying to mask it", () => {
    expect(redactForLogs("My SIN is 123 456 789")).toBe(
      "[redacted: possible personal data]",
    );
  });

  it("truncates a long but ordinary question for logging", () => {
    const long = `Why do bond prices move ${"a".repeat(400)}`;
    const redacted = redactForLogs(long);
    expect(redacted.length).toBeLessThanOrEqual(180);
    expect(redacted.endsWith("...")).toBe(true);
  });
});
