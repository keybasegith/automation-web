import { describe, expect, it } from "vitest";

import {
  DEFAULT_TRANSCRIPT_OPTIONS,
  countWords,
  detectSpeaker,
  fixLineBreaks,
  formatTranscript,
  isTimestampOnlyLine,
  mergeSameSpeakerSegments,
  normalizeBlankLines,
  parseSegments,
  removeSpeakerPrefix,
  removeTimestamps,
  type TranscriptOptions,
} from "../format";

const clean = (raw: string, overrides: Partial<TranscriptOptions> = {}): string =>
  formatTranscript(raw, { ...DEFAULT_TRANSCRIPT_OPTIONS, ...overrides });

describe("timestamps", () => {
  it("drops a plain range line", () => {
    expect(clean("02:59.000  03:00.000\nJohn: Hello.")).toBe("John: Hello.");
  });

  it("drops an arrow range line", () => {
    expect(clean("00:02:59.000 --> 00:03:00.000\nJohn: Hello.")).toBe("John: Hello.");
    expect(clean("02:59 --> 03:00\nJohn: Hello.")).toBe("John: Hello.");
  });

  it("drops bare and bracketed timestamp lines", () => {
    for (const stamp of ["02:59", "00:02:59", "02:59.000", "00:02:59.000", "[02:59]", "[00:02:59]"]) {
      expect(isTimestampOnlyLine(stamp)).toBe(true);
      expect(clean(`${stamp}\nJohn: Hello.`)).toBe("John: Hello.");
    }
  });

  it("strips a timestamp that prefixes the spoken line", () => {
    expect(clean("[02:59] John: Hello.")).toBe("John: Hello.");
    expect(clean("00:02:59.000 --> 00:03:00.000 John: Hello.")).toBe("John: Hello.");
    expect(clean("02:59.000 John: Hello.")).toBe("John: Hello.");
  });

  it("leaves clocks inside a sentence alone", () => {
    const line = "John: Revenue increased from 2:59 to 3:00 on the call.";
    expect(clean(line)).toBe(line);
  });

  it("leaves a bare clock that opens an ordinary sentence", () => {
    // No milliseconds, no range, no brackets: this is prose, not metadata.
    expect(removeTimestamps("3:00 PM is the meeting time.")).toBe("3:00 PM is the meeting time.");
  });

  it("never touches money, percentages or dates", () => {
    const line = "John: The account has $25,000 and increased 12.5% since 2024-01-31.";
    expect(clean(line)).toBe(line);
  });

  it("keeps two utterances apart once the timestamp between them is gone", () => {
    // The removed line was the only boundary; it must not become one paragraph.
    expect(clean("00:01\nHello there.\n00:02\nHow are you?")).toBe("Hello there.\n\nHow are you?");
  });
});

describe("speaker detection", () => {
  it("recognises the label shapes a transcript produces", () => {
    for (const label of [
      "John",
      "Maria",
      "John Smith",
      "Keybase Argosy Wealth",
      "Advisor 1",
      "Speaker 2",
      "Compliance Team",
    ]) {
      expect(detectSpeaker(`${label}: Hello everyone.`)).toEqual({
        speaker: label,
        text: "Hello everyone.",
      });
    }
  });

  it("does not treat a URL as a speaker", () => {
    expect(detectSpeaker("https://keybase.com is the site")).toBeNull();
  });

  it("does not treat a mid-sentence colon as a speaker", () => {
    expect(detectSpeaker("So here is the thing: we need to move on it.")).toBeNull();
  });

  it("removes the prefix when asked", () => {
    expect(removeSpeakerPrefix("John Smith: Hello everyone.")).toBe("Hello everyone.");
    expect(removeSpeakerPrefix("No label on this line.")).toBe("No label on this line.");
  });
});

describe("line breaks", () => {
  it("rejoins a sentence split across lines", () => {
    const raw = "John: This sentence continues\nonto another line\nbecause of transcript wrapping.";
    expect(clean(raw)).toBe(
      "John: This sentence continues onto another line because of transcript wrapping."
    );
  });

  it("keeps different speakers apart", () => {
    expect(clean("John: Hello.\nMaria: Hi.\nJohn: How are you?")).toBe(
      "John: Hello.\n\nMaria: Hi.\n\nJohn: How are you?"
    );
  });

  it("preserves an intentional paragraph break", () => {
    expect(fixLineBreaks("John: Hello.\n\nMaria: Hi.")).toBe("John: Hello.\n\nMaria: Hi.");
  });

  it("leaves wrapped lines on their own when the option is off", () => {
    const raw = "John: One line\nand its continuation.";
    expect(clean(raw, { fixLineBreaks: false })).toBe("John: One line\n\nand its continuation.");
  });

  it("does not introduce double spaces", () => {
    expect(clean("John: One   \n   two.")).toBe("John: One two.");
  });
});

describe("merge consecutive same-speaker lines", () => {
  it("merges neighbours and stops at a different speaker", () => {
    const raw = "John: Hello.\nJohn: How are you?\nMaria: Good.\nJohn: Great.";
    expect(clean(raw, { mergeSameSpeaker: true })).toBe(
      "John: Hello. How are you?\n\nMaria: Good.\n\nJohn: Great."
    );
  });

  it("merges the three-line example into one paragraph", () => {
    const raw = "John: Hello.\n\nJohn: How are you?\n\nJohn: I wanted to follow up.";
    expect(clean(raw, { mergeSameSpeaker: true })).toBe(
      "John: Hello. How are you? I wanted to follow up."
    );
  });

  it("never merges segments with no identified speaker", () => {
    const segments = parseSegments("Hello.\n\nHow are you?", false);
    expect(mergeSameSpeakerSegments(segments)).toHaveLength(2);
  });

  it("is off by default", () => {
    expect(clean("John: Hello.\nJohn: How are you?")).toBe("John: Hello.\n\nJohn: How are you?");
  });
});

describe("speaker names off", () => {
  it("keeps only the spoken text", () => {
    expect(clean("John: Hello.\nMaria: Hi.", { keepSpeakerNames: false })).toBe("Hello.\n\nHi.");
  });

  it("still merges by speaker before the labels are dropped", () => {
    const raw = "John: Hello.\nJohn: How are you?\nMaria: Good.";
    expect(clean(raw, { keepSpeakerNames: false, mergeSameSpeaker: true })).toBe(
      "Hello. How are you?\n\nGood."
    );
  });
});

describe("blank lines", () => {
  it("collapses a long run to one blank line", () => {
    expect(clean("John: Hello.\n\n\n\n\n\nMaria: Hi.")).toBe("John: Hello.\n\nMaria: Hi.");
    expect(normalizeBlankLines("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("reproduces the source spacing when the option is off", () => {
    expect(clean("John: Hello.\n\n\nMaria: Hi.", { removeDuplicateBlankLines: false })).toBe(
      "John: Hello.\n\n\nMaria: Hi."
    );
  });
});

describe("whole transcript", () => {
  it("cleans the reference transcript with the default options", () => {
    const raw = [
      "02:59.000  03:00.000",
      "Keybase Argosy Wealth: Trying to figure out what to do.",
      "",
      "03:01.000  03:03.000",
      "Keybase Argosy Wealth: Are you calling in?",
      "",
      "03:03.000  03:10.000",
      "Keybase Argosy Wealth: No, he hasn't. He's supposed",
      "to be on the call. I texted him this morning and he",
      "said everything was fine.",
      "",
      "03:10.000  03:12.000",
      "Keybase Argosy Wealth: He'll be here.",
    ].join("\n");

    expect(clean(raw)).toBe(
      [
        "Keybase Argosy Wealth: Trying to figure out what to do.",
        "",
        "Keybase Argosy Wealth: Are you calling in?",
        "",
        "Keybase Argosy Wealth: No, he hasn't. He's supposed to be on the call. I texted him this morning and he said everything was fine.",
        "",
        "Keybase Argosy Wealth: He'll be here.",
      ].join("\n")
    );
  });

  it("returns an empty string for empty input", () => {
    expect(clean("")).toBe("");
    expect(clean("   \n\n  ")).toBe("");
  });

  it("counts words", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("  John: Hello there.  ")).toBe(3);
  });
});
