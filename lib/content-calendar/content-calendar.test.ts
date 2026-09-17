import { describe, expect, it } from "vitest";
import {
  CALENDAR_STATUSES,
  canTransition,
  isSendBack,
  nextStatus,
  transitionRejection,
  type CalendarStatus,
} from "@/lib/content-calendar/workflow";
import {
  buildMonthGrid,
  describeSchedule,
  monthGridRange,
  shiftMonth,
  todayIso,
} from "@/lib/content-calendar/dates";
import { validateAttachment } from "@/lib/content-calendar/attachmentPolicy";
import {
  InvalidLinkError,
  isBlockedAddress,
  normalizeLinkUrl,
} from "@/lib/content-calendar/linkPreview";

describe("workflow", () => {
  it("runs idea → published one stage at a time", () => {
    let status: CalendarStatus = CALENDAR_STATUSES[0];
    const walked: CalendarStatus[] = [status];
    for (;;) {
      const next = nextStatus(status);
      if (!next) break;
      expect(canTransition(status, next)).toBe(true);
      status = next;
      walked.push(status);
    }
    expect(walked).toEqual([...CALENDAR_STATUSES]);
    expect(nextStatus("published")).toBeNull();
  });

  it("refuses to skip a stage", () => {
    expect(canTransition("idea", "approved")).toBe(false);
    expect(canTransition("in_production", "ready_to_post")).toBe(false);
    expect(
      transitionRejection("in_production", "published", "")
    ).toMatch(/one stage at a time/);
  });

  it("allows a send-back to any earlier stage, with a note", () => {
    expect(canTransition("compliance_review", "in_production")).toBe(true);
    expect(canTransition("ready_to_post", "idea")).toBe(true);
    expect(isSendBack("compliance_review", "in_production")).toBe(true);

    expect(transitionRejection("compliance_review", "in_production", "  ")).toMatch(
      /needs a note/
    );
    expect(
      transitionRejection("compliance_review", "in_production", "Drop the projection.")
    ).toBeNull();
  });

  it("treats a move to the current stage as a no-op, not a move", () => {
    expect(canTransition("approved", "approved")).toBe(false);
    expect(transitionRejection("approved", "approved", "")).toMatch(/already at/);
  });

  it("needs no note to move forward", () => {
    expect(transitionRejection("idea", "pending_approval", "")).toBeNull();
  });
});

describe("month grid", () => {
  it("always renders six whole weeks", () => {
    for (let month = 0; month < 12; month += 1) {
      expect(buildMonthGrid(2026, month)).toHaveLength(42);
    }
  });

  it("starts on the Sunday on or before the 1st", () => {
    // 1 Sep 2026 is a Tuesday, so the grid opens on Sunday 30 Aug.
    const grid = buildMonthGrid(2026, 8);
    expect(grid[0].date).toBe("2026-08-30");
    expect(grid[0].inMonth).toBe(false);
    expect(grid[2].date).toBe("2026-09-01");
    expect(grid[2].inMonth).toBe(true);
  });

  it("covers February in a leap year without dropping the 29th", () => {
    const dates = buildMonthGrid(2028, 1).map((d) => d.date);
    expect(dates).toContain("2028-02-29");
  });

  it("asks the API for exactly the range it draws", () => {
    const range = monthGridRange(2026, 8);
    const grid = buildMonthGrid(2026, 8);
    expect(range.from).toBe(grid[0].date);
    expect(range.to).toBe(grid[41].date);
  });

  it("rolls the year over in both directions", () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });

  it("reads a date in the viewer's own zone", () => {
    // A local-time date late in the evening must not roll to the next day.
    expect(todayIso(new Date(2026, 8, 4, 23, 30))).toBe("2026-09-04");
  });

  it("describes a schedule relative to today", () => {
    expect(describeSchedule("2026-09-04", "2026-09-04")).toBe("today");
    expect(describeSchedule("2026-09-05", "2026-09-04")).toBe("tomorrow");
    expect(describeSchedule("2026-09-11", "2026-09-04")).toBe("in 7 days");
    expect(describeSchedule("2026-09-01", "2026-09-04")).toBe("3 days ago");
  });
});

describe("attachment policy", () => {
  it("accepts the working files a marketing team actually shares", () => {
    expect(
      validateAttachment({ fileName: "brief.pdf", fileType: "application/pdf", fileSize: 2048 })
    ).toBeNull();
    expect(
      validateAttachment({
        fileName: "deck.pptx",
        fileType:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        fileSize: 5_000_000,
      })
    ).toBeNull();
  });

  it("refuses an executable and an empty file", () => {
    expect(
      validateAttachment({ fileName: "run.sh", fileType: "application/x-sh", fileSize: 10 })
    ).toMatch(/can't be attached/);
    expect(
      validateAttachment({ fileName: "empty.png", fileType: "image/png", fileSize: 0 })
    ).toMatch(/empty/);
  });

  it("gives video a bigger allowance than a document", () => {
    const eighty = 80 * 1024 * 1024;
    expect(
      validateAttachment({ fileName: "cut.mp4", fileType: "video/mp4", fileSize: eighty })
    ).toBeNull();
    expect(
      validateAttachment({ fileName: "scan.pdf", fileType: "application/pdf", fileSize: eighty })
    ).toMatch(/the limit is 50 MB/);
  });
});

describe("link normalization", () => {
  it("adds https to a bare domain", () => {
    expect(normalizeLinkUrl("keybasefinancial.com/blog").href).toBe(
      "https://keybasefinancial.com/blog"
    );
  });

  it("keeps an explicit http link as-is", () => {
    expect(normalizeLinkUrl("http://example.com/a").protocol).toBe("http:");
  });

  it("refuses anything that is not http(s)", () => {
    expect(() => normalizeLinkUrl("javascript:alert(1)")).toThrow(InvalidLinkError);
    expect(() => normalizeLinkUrl("file:///etc/passwd")).toThrow(InvalidLinkError);
    expect(() => normalizeLinkUrl("   ")).toThrow(InvalidLinkError);
  });
});

describe("link fetch address guard", () => {
  it("blocks loopback, private, and link-local addresses", () => {
    for (const address of [
      "127.0.0.1",
      "10.0.0.5",
      "172.16.4.1",
      "172.31.255.255",
      "192.168.1.10",
      "169.254.169.254", // cloud instance metadata
      "100.64.0.1",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:10.1.2.3",
    ]) {
      expect(isBlockedAddress(address), address).toBe(true);
    }
  });

  it("allows ordinary public addresses", () => {
    for (const address of ["93.184.216.34", "8.8.8.8", "172.32.0.1", "2606:2800::1"]) {
      expect(isBlockedAddress(address), address).toBe(false);
    }
  });

  it("blocks anything that is not an IP address at all", () => {
    expect(isBlockedAddress("not-an-ip")).toBe(true);
  });
});
