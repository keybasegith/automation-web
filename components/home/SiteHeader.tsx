import {
  getPublishedNavigation,
  getPublishedGlobalSettings,
} from "@/lib/cms/public";
import SiteHeaderClient from "./SiteHeaderClient";

/**
 * Server wrapper for the site header. Reads the published navigation and global
 * settings from the CMS (falling back to the seeded defaults) and hands them to
 * the interactive client header. Keeps all interactivity client-side while the
 * content stays server-rendered and editable.
 */
export default async function SiteHeader() {
  const [nav, settings] = await Promise.all([
    getPublishedNavigation(),
    getPublishedGlobalSettings(),
  ]);

  return (
    <SiteHeaderClient
      nav={nav}
      settings={{
        logoUrl: settings.logoUrl,
        logoAlt: settings.logoAlt,
        announcement: settings.headerAnnouncement,
        announcementUrl: settings.headerAnnouncementUrl,
        ctaLabel: settings.primaryCtaLabel,
        ctaUrl: settings.primaryCtaUrl,
      }}
    />
  );
}
