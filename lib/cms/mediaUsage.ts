import { readDoc } from "@/lib/cms/store";
import { seedExecutives, seedGlobalSettings } from "@/lib/cms/seeds";
import type { ExecutivesContent, GlobalSettings } from "@/lib/cms/types";

/**
 * Find where an uploaded image is referenced across the CMS, so the Media
 * Library can warn before deleting something that's in use. Checks both the
 * draft and published copies of the places images can appear.
 */
export async function findMediaUsage(fileUrl: string): Promise<string[]> {
  if (!fileUrl) return [];
  const used = new Set<string>();

  try {
    const execs = await readDoc<ExecutivesContent>("executives", seedExecutives);
    for (const copy of [execs.draft, execs.published]) {
      copy?.people.forEach((p) => {
        if (p.photoUrl === fileUrl) used.add(`Key Executives — ${p.name || "a person"}`);
      });
    }
  } catch {
    // ignore
  }

  try {
    const settings = await readDoc<GlobalSettings>("global-settings", seedGlobalSettings);
    for (const copy of [settings.draft, settings.published]) {
      if (!copy) continue;
      if (copy.logoUrl === fileUrl) used.add("Global Settings — logo");
      if (copy.defaultSocialImage === fileUrl) used.add("Global Settings — social image");
    }
  } catch {
    // ignore
  }

  return [...used];
}
