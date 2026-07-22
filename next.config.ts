import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  async redirects() {
    // The website CMS moved from /admin to /website-admin-cms. These are
    // redirect-only: the old paths carry no auth logic, and the old API
    // routes intentionally 404 so the new path is the single entry point.
    return [
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
