import { readDoc } from "@/lib/cms/store";
import { seedExecutives, seedGlobalSettings, seedServicePages } from "@/lib/cms/seeds";
import { resolveMediaRef } from "@/lib/cms/media/url";
import type {
  ExecutivesContent,
  GlobalSettings,
  MediaItem,
  ServicePagesContent,
} from "@/lib/cms/types";

/**
 * Find where an uploaded file is referenced across the CMS, so the Media
 * Library can warn before deleting something that's in use. Content stores
 * object-storage keys, but legacy entries may hold resolved URLs, so both
 * forms are matched. Checks draft and published copies alike.
 */
export async function findMediaUsage(item: MediaItem): Promise<string[]> {
  const refs = new Set<string>([item.fileKey]);
  const resolved = (() => {
    try {
      return resolveMediaRef(item.fileKey);
    } catch {
      return null; // No base URL configured — key matching still works.
    }
  })();
  if (resolved) refs.add(resolved);

  const used = new Set<string>();
  const matches = (value: string | null | undefined) =>
    Boolean(value && refs.has(value));

  try {
    const execs = await readDoc<ExecutivesContent>("executives", seedExecutives);
    for (const copy of [execs.draft, execs.published]) {
      copy?.people.forEach((p) => {
        if (matches(p.photoUrl)) used.add(`Key Executives — ${p.name || "a person"}`);
      });
    }
  } catch {
    // ignore
  }

  try {
    const settings = await readDoc<GlobalSettings>("global-settings", seedGlobalSettings);
    for (const copy of [settings.draft, settings.published]) {
      if (!copy) continue;
      if (matches(copy.logoUrl)) used.add("Global Settings — logo");
      if (matches(copy.defaultSocialImage)) used.add("Global Settings — social image");
    }
  } catch {
    // ignore
  }

  try {
    const services = await readDoc<ServicePagesContent>("service-pages", seedServicePages);
    for (const copy of [services.draft, services.published]) {
      copy?.pages.forEach((p) => {
        if (matches(p.heroImage)) used.add(`Service Pages — ${p.breadcrumbLabel || p.slug}`);
      });
    }
  } catch {
    // ignore
  }

  return [...used];
}
