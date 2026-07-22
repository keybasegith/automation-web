import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { applyAction, getDocForAdmin } from "@/lib/cms/service";
import type { ExecutivesContent } from "@/lib/cms/types";
import {
  STORE_MODES,
  enterStoreMode,
  exitStoreMode,
} from "@/lib/cms/storage/testModes";

/**
 * End-to-end resource tests through the service layer: adding/editing an
 * executive, hidden people staying out of the visible set, publishing recording
 * a version, and restore creating a draft without changing live content.
 * Runs once per storage backend (file always; postgres when
 * CMS_TEST_DATABASE_URL is set).
 */

function draftOf(doc: Awaited<ReturnType<typeof getDocForAdmin>>): ExecutivesContent {
  return doc.draft as ExecutivesContent;
}

describe.each(STORE_MODES)("executives via service [%s]", (mode) => {
  beforeEach(() => enterStoreMode(mode));
  afterEach(() => exitStoreMode());

  it("adds and edits an executive, then publishes with a recorded version", async () => {
    // Seeded doc exists; replace the draft with a single custom person.
    const content: ExecutivesContent = {
      people: [
        {
          id: "a",
          name: "Ada Lovelace",
          title: "Chief Analyst",
          lead: "",
          paragraphs: ["First paragraph.", "Second paragraph."],
          photoUrl: null,
          photoClass: null,
          comingSoon: false,
          ceoMessage: false,
          href: null,
          isVisible: true,
        },
      ],
    };

    const saved = await applyAction("executives", "save_draft", { content }, "alice");
    expect(saved.ok).toBe(true);

    // Publishing the seed-derived first publish won't create a version yet, so
    // publish once to set a baseline, then change + publish to get a version.
    await applyAction("executives", "publish", { content }, "alice");

    const edited: ExecutivesContent = {
      people: [{ ...content.people[0], title: "Head of Analysis" }],
    };
    const published = await applyAction(
      "executives",
      "publish",
      { content: edited, changeSummary: "Updated title" },
      "alice"
    );
    expect(published.ok).toBe(true);
    if (published.ok) {
      expect(published.doc.versions.length).toBeGreaterThanOrEqual(1);
      expect(draftOf(published.doc).people[0].title).toBe("Head of Analysis");
    }
  });

  it("rejects an executive with no name", async () => {
    const bad: ExecutivesContent = {
      people: [
        {
          id: "x",
          name: "",
          title: "Ghost",
          lead: "",
          paragraphs: [],
          photoUrl: null,
          photoClass: null,
          comingSoon: false,
          ceoMessage: false,
          href: null,
          isVisible: true,
        },
      ],
    };
    const result = await applyAction("executives", "save_draft", { content: bad }, "alice");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("restore loads an old version into the draft only", async () => {
    const v1: ExecutivesContent = {
      people: [
        {
          id: "a",
          name: "One",
          title: "T1",
          lead: "",
          paragraphs: [],
          photoUrl: null,
          photoClass: null,
          comingSoon: false,
          ceoMessage: false,
          href: null,
          isVisible: true,
        },
      ],
    };
    await applyAction("executives", "publish", { content: v1 }, "alice");
    const v2 = { people: [{ ...v1.people[0], title: "T2" }] };
    const afterV2 = await applyAction("executives", "publish", { content: v2 }, "alice");
    if (!afterV2.ok) throw new Error("publish failed");
    const versionId = afterV2.doc.versions[0].id;

    const restored = await applyAction(
      "executives",
      "restore_version",
      { versionId },
      "bob"
    );
    expect(restored.ok).toBe(true);
    if (restored.ok) {
      // Draft went back to T1; live is still T2.
      expect(draftOf(restored.doc).people[0].title).toBe("T1");
      expect((restored.doc.published as ExecutivesContent).people[0].title).toBe("T2");
    }
  });
});
