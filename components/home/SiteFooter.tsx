import Image from "next/image";
import Link from "next/link";
import ComplaintHandlingProcess from "./ComplaintHandlingProcess";
import PrivacyPolicy from "./PrivacyPolicy";
import {
  getPublishedFooter,
  getPublishedGlobalSettings,
} from "@/lib/cms/public";
import type { SocialLink } from "@/lib/cms/types";

/**
 * The website footer. Content (link columns, social links, description,
 * copyright, legal links, logo) is read from the published CMS settings, with
 * the CMS seed falling back to the original hardcoded values — so the footer
 * looks identical until an admin edits it. Markup and styling are unchanged.
 */

// SVG glyphs keyed by platform so social icons stay pixel-identical to before.
const SOCIAL_ICON: Record<SocialLink["platform"], React.ReactNode> = {
  linkedin: (
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
  ),
  x: (
    <path d="M18.24 2.25h3.31l-7.23 8.26L23.12 21.75h-6.65l-5.21-6.81-5.96 6.81H1.99l7.73-8.84L1.25 2.25h6.82l4.71 6.23 5.46-6.23zm-1.16 17.52h1.83L7.02 4.13H5.05l12.03 15.64z" />
  ),
  instagram: (
    <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.68a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z" />
  ),
  youtube: (
    <path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2C0 8.08 0 12 0 12s0 3.92.5 5.8a3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.8zM9.6 15.6V8.4l6.27 3.6-6.27 3.6z" />
  ),
  facebook: (
    <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
  ),
  other: (
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.93 6h-2.95a15.7 15.7 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.93 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14a7.96 7.96 0 0 1 0-4h3.38a16.5 16.5 0 0 0 0 4H4.26zm.81 2h2.95c.32 1.25.79 2.45 1.38 3.56A8.03 8.03 0 0 1 5.07 16zm2.95-8H5.07a8.03 8.03 0 0 1 4.33-3.56A15.7 15.7 0 0 0 8.02 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66a14.7 14.7 0 0 1 0-4h4.68a14.7 14.7 0 0 1 0 4zm.24 5.56c.59-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56zM16.36 14a16.5 16.5 0 0 0 0-4h3.38a7.96 7.96 0 0 1 0 4h-3.38z" />
  ),
};

function Social({
  label,
  href,
  path,
}: {
  label: string;
  href: string;
  path: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-9 w-9 items-center justify-center rounded-full text-[#1a2433] transition-colors hover:bg-[#006d6e] hover:text-white"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]">
        {path}
      </svg>
    </a>
  );
}

export default async function SiteFooter() {
  const [footer, settings] = await Promise.all([
    getPublishedFooter(),
    getPublishedGlobalSettings(),
  ]);

  const copyright = settings.copyrightText.replace(
    "{year}",
    String(new Date().getFullYear())
  );

  return (
    <footer id="contact" className="border-t border-black/10 bg-white">
      <div className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8">
        {/* Top: brand + social */}
        <div className="flex flex-col gap-8 border-b border-black/10 pb-10 md:flex-row md:items-center md:justify-between">
          <Image
            src={settings.logoUrl}
            alt={settings.logoAlt}
            width={553}
            height={126}
            className="h-10 w-auto"
          />
          <div className="flex items-center gap-3">
            <span className="mr-1 text-sm font-semibold tracking-wide text-[#5b6573]">
              FOLLOW US
            </span>
            {settings.socialLinks.map((s) => (
              <Social
                key={`${s.platform}-${s.url}`}
                label={s.label}
                href={s.url}
                path={SOCIAL_ICON[s.platform] ?? SOCIAL_ICON.other}
              />
            ))}
          </div>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 gap-8 py-10 md:grid-cols-3">
          {footer.columns.map((col) => (
            <div key={col.heading}>
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-[#1a2433]">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={`${link.label}-${link.url}`}>
                    <Link
                      href={link.url}
                      target={link.openInNewTab ? "_blank" : undefined}
                      rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                      className="text-[15px] text-[#5b6573] transition-colors hover:text-[#006d6e]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Legal */}
        <div className="space-y-4 border-t border-black/10 pt-8 text-[13px] leading-relaxed text-[#7a828d]">
          <p>{settings.footerDescription}</p>
          <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p>{copyright}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <ComplaintHandlingProcess />
              <PrivacyPolicy />
              {footer.legalLinks.map((link) => (
                <Link
                  key={`${link.label}-${link.url}`}
                  href={link.url}
                  target={link.openInNewTab ? "_blank" : undefined}
                  rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                  className="font-semibold text-[#1a2433] hover:text-[#006d6e]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Image
              src="/CIRO_Logo.jpg"
              alt="Canadian Investment Regulatory Organization (CIRO)"
              width={320}
              height={120}
              className="h-12 w-auto"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
