import type { Metadata } from "next";
import { Geist, Geist_Mono, Libre_Franklin } from "next/font/google";
import "./globals.css";
import { siteMetadataBase, siteRobots } from "@/lib/seo/metadata";
import { KEYBASE_NAME } from "@/lib/seo/keybase";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Corporate sans used across the public marketing site (matches the Goldman-style look).
const libreFranklin = Libre_Franklin({
  variable: "--font-franklin",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

/** Route metadata owns titles; deployment policy controls indexing separately from canonical identity. */
export const metadata: Metadata = {
  title: `${KEYBASE_NAME} — Independent Wealth Management in Canada`,
  description:
    "Keybase Financial Group is a Canadian independent financial services and wealth management firm serving individuals, families, and institutions.",
  applicationName: KEYBASE_NAME,
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION, other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined },
  ...siteMetadataBase(),
  ...siteRobots(),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${libreFranklin.variable} antialiased`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
