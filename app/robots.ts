import type { MetadataRoute } from "next";

import { INTERNAL_PREFIXES } from "@/lib/seo/routes";
import { isIndexableDeployment, PRODUCTION_ORIGIN } from "@/lib/seo/deployment";

export const dynamic = "force-dynamic";

/** Index public content only in an explicitly identified production deployment. */
export default function robots(): MetadataRoute.Robots {
  const base = PRODUCTION_ORIGIN;

  if (!isIndexableDeployment()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  // Robots exclusion uses path prefixes, including each section index.
  const disallow = INTERNAL_PREFIXES.map((prefix) => prefix);

  return {
    rules: [
      ...(process.env.GPTBOT_POLICY === "block" ? [{ userAgent: "GPTBot", disallow: "/" }] : []),
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
      /**
       * OAI-SearchBot is the crawler behind ChatGPT Search's citations, and is
       * separate from GPTBot, which collects training data. Keybase wants to be
       * findable in AI search, so this one is allowed explicitly rather than
       * left to the wildcard.
       *
       * GPTBot inherits the wildcard allow rule. A separate training-crawler
       * policy can be configured when Keybase chooses one.
       */
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
