import {
  seedCareers,
  seedContentPages,
  seedExecutives,
  seedFooter,
  seedGlobalSettings,
  seedNavigation,
  seedNewsroom,
  seedServicePages,
} from "@/lib/cms/seeds";
import {
  normalizeCareers,
  normalizeContentPages,
  normalizeExecutives,
  normalizeFooter,
  normalizeGlobalSettings,
  normalizeNavigation,
  normalizeNewsroom,
  normalizeServicePages,
  type NormalizeResult,
} from "@/lib/cms/normalize";
import type { CmsResource } from "@/lib/cms/types";

/**
 * Central registry mapping each editable resource to its seed factory, its
 * server-side normalizer, and a friendly label. The generic admin API route
 * (app/api/admin/cms/[resource]) uses this so every resource shares one
 * audited draft/publish/restore code path.
 */

export interface ResourceConfig {
  label: string;
  seed: () => unknown;
  normalize: (raw: unknown) => NormalizeResult<unknown>;
}

const REGISTRY: Record<CmsResource, ResourceConfig> = {
  "global-settings": {
    label: "Global Settings",
    seed: seedGlobalSettings,
    normalize: normalizeGlobalSettings,
  },
  footer: {
    label: "Footer",
    seed: seedFooter,
    normalize: normalizeFooter,
  },
  navigation: {
    label: "Navigation",
    seed: seedNavigation,
    normalize: normalizeNavigation,
  },
  executives: {
    label: "Key Executives",
    seed: seedExecutives,
    normalize: normalizeExecutives,
  },
  "service-pages": {
    label: "Service Pages",
    seed: seedServicePages,
    normalize: normalizeServicePages,
  },
  careers: {
    label: "Careers",
    seed: seedCareers,
    normalize: normalizeCareers,
  },
  newsroom: {
    label: "Newsroom",
    seed: seedNewsroom,
    normalize: normalizeNewsroom,
  },
  "content-pages": {
    label: "Company Pages",
    seed: seedContentPages,
    normalize: normalizeContentPages,
  },
};

export function isCmsResource(value: string): value is CmsResource {
  return Object.prototype.hasOwnProperty.call(REGISTRY, value);
}

export function getResourceConfig(resource: CmsResource): ResourceConfig {
  return REGISTRY[resource];
}

export const ALL_RESOURCES = Object.keys(REGISTRY) as CmsResource[];
