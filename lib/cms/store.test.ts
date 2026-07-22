import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  readDoc,
  readPublished,
  saveDraft,
  publishDraft,
  discardDraft,
  restoreVersion,
  hasUnpublishedChanges,
} from "@/lib/cms/store";
import {
  STORE_MODES,
  enterStoreMode,
  exitStoreMode,
} from "@/lib/cms/storage/testModes";

/**
 * Verifies the core draft/publish/version guarantees the whole CMS relies on:
 * drafts stay private, publishing archives the prior live copy, restoring only
 * touches the draft, and discard reverts. The suite runs once per storage
 * backend (file always; postgres when CMS_TEST_DATABASE_URL is set).
 */

const seed = () => ({ title: "seed" });

describe.each(STORE_MODES)("cms store [%s]", (mode) => {
  beforeEach(() => enterStoreMode(mode));
  afterEach(() => exitStoreMode());

  it("seeds draft and published equal on first read", async () => {
    const doc = await readDoc("footer", seed);
    expect(doc.draft).toEqual({ title: "seed" });
    expect(doc.published).toEqual({ title: "seed" });
    expect(hasUnpublishedChanges(doc)).toBe(false);
  });

  it("editing a draft does NOT change published content", async () => {
    await saveDraft("footer", seed, { title: "edited" }, "alice");
    const published = await readPublished("footer", seed);
    expect(published).toEqual({ title: "seed" }); // still the live copy
    const doc = await readDoc("footer", seed);
    expect(doc.draft).toEqual({ title: "edited" });
    expect(hasUnpublishedChanges(doc)).toBe(true);
  });

  it("publishing promotes the draft and archives the previous published copy", async () => {
    await saveDraft("footer", seed, { title: "v2" }, "alice");
    const doc = await publishDraft("footer", seed, "alice", "second version");
    expect(doc.published).toEqual({ title: "v2" });
    expect(doc.publishedBy).toBe("alice");
    expect(doc.versions).toHaveLength(1);
    expect(doc.versions[0].snapshot).toEqual({ title: "seed" }); // old live copy kept
    expect(await readPublished("footer", seed)).toEqual({ title: "v2" });
  });

  it("restoring a version loads it into the draft WITHOUT changing the live site", async () => {
    await saveDraft("footer", seed, { title: "v2" }, "alice");
    const afterPublish = await publishDraft("footer", seed, "alice", "v2");
    const versionId = afterPublish.versions[0].id;

    // Move draft forward again so restore is observable.
    await saveDraft("footer", seed, { title: "v3" }, "alice");
    const restored = await restoreVersion("footer", seed, versionId, "bob");

    expect(restored.draft).toEqual({ title: "seed" }); // draft = old version
    expect(restored.published).toEqual({ title: "v2" }); // live site untouched
    expect(await readPublished("footer", seed)).toEqual({ title: "v2" });
  });

  it("discarding a draft reverts it to the published copy", async () => {
    await saveDraft("footer", seed, { title: "wip" }, "alice");
    const doc = await discardDraft("footer", seed, "alice");
    expect(doc.draft).toEqual({ title: "seed" });
    expect(hasUnpublishedChanges(doc)).toBe(false);
  });

  it("round-trips a document through the backend without losing fields", async () => {
    await saveDraft("footer", seed, { title: "v2" }, "alice");
    await publishDraft("footer", seed, "alice", "publish v2");
    const doc = await readDoc("footer", seed);

    expect(doc.resource).toBe("footer");
    expect(doc.draftUpdatedBy).toBe("alice");
    expect(doc.publishedBy).toBe("alice");
    expect(doc.versions[0]).toMatchObject({
      versionNumber: 1,
      changeSummary: "publish v2",
      isPublishedVersion: true,
    });
    // Timestamps survive as parseable ISO strings.
    expect(Number.isNaN(Date.parse(doc.draftUpdatedAt))).toBe(false);
    expect(Number.isNaN(Date.parse(doc.versions[0].createdAt))).toBe(false);
  });
});
