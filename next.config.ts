import type { NextConfig } from "next";
import { isIndexableDeployment, PRODUCTION_ORIGIN } from "./lib/seo/deployment";
import { SERVICE_SLUGS, LEGACY_REDIRECTS } from "./lib/seo/public-paths";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  turbopack: { root: __dirname },
  // The onboarding routes fill Keybase's blank PDF forms from public/. The
  // reads are excluded from tracing (lib/client-onboarding/finalize.ts), so
  // only these four files ship with those functions — not all of public/.
  outputFileTracingIncludes: {
    "/api/client-onboarding/**": [
      "./public/form-NAAF.pdf",
      "./public/crq-individualaccountholder.pdf",
      "./public/crq-jointaccountholders.pdf",
      "./public/crq-corporateaccounts.pdf",
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: [
      {key:"X-Content-Type-Options",value:"nosniff"},
      {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
      ...(isIndexableDeployment() ? [{key:"Strict-Transport-Security",value:"max-age=31536000"}] : []),
    ] }, ...(!isIndexableDeployment() ? [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }] : []), { source: "/:path*", has: [{ type: "host", value: ".*\\.vercel\\.app" }],
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
  async redirects() {
    // The website CMS moved from /admin to /website-admin-cms. These are
    // redirect-only: the old paths carry no auth logic, and the old API
    // routes intentionally 404 so the new path is the single entry point.
    return [
      ...Object.entries({ "/services": "/wealth-building", ...LEGACY_REDIRECTS,
        ...Object.fromEntries(SERVICE_SLUGS.map((slug) => [`/services/${slug}`, `/${slug}`]))
      }).flatMap(([source, destination]) => [source, `${source}/`].flatMap((path) => [
        ...(isIndexableDeployment() ? [{ source: path, destination: `${PRODUCTION_ORIGIN}${destination}`, statusCode: 301, has: [{ type: "host" as const, value: "keybase.com" }] }] : []),
        { source: path, destination, statusCode: 301 },
      ])),
      { source: "/admin", destination: "/website-admin-cms", permanent: true },
      { source: "/admin/login", destination: "/website-admin-cms", permanent: true },
      {
        source: "/admin/:path*",
        destination: "/website-admin-cms/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
