import type { Metadata } from "next";
import { isIndexableDeployment, PRODUCTION_ORIGIN } from "./deployment";
import { canonicalPublicPath } from "./public-paths";

export function canonical(path: string): Pick<Metadata, "alternates"> {
  const preferred = canonicalPublicPath(path);
  return { alternates: { canonical: new URL(preferred, PRODUCTION_ORIGIN).toString() } };
}

export function siteRobots(): Pick<Metadata, "robots"> {
  const index = isIndexableDeployment();
  return { robots: { index, follow: index, googleBot: { index, follow: index } } };
}

export function siteMetadataBase(): Pick<Metadata, "metadataBase"> {
  return { metadataBase: new URL(PRODUCTION_ORIGIN) };
}

export const NOINDEX: Pick<Metadata, "robots"> = {
  robots: { index: false, follow: false },
};

/** Each route supplies its own copy; social fields cannot inherit the home URL. */
export function pageMetadata(path: string, title: string, description: string,
  image?: string, type: "website" | "article" = "website"): Metadata {
  const url = new URL(canonicalPublicPath(path), PRODUCTION_ORIGIN).toString();
  const socialImage = new URL(image || `/api/og?title=${encodeURIComponent(title)}`, PRODUCTION_ORIGIN).toString();
  return {
    title, description, ...canonical(path), ...siteRobots(),
    openGraph: { type, title, description, url, siteName: "Keybase Financial Group",
      locale: "en_CA", images: [{ url: socialImage }] },
    twitter: { card: "summary_large_image", title, description, images: [socialImage] },
  };
}
