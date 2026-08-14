import type { Metadata, Viewport } from "next";
import { TRIP } from "@/lib/mexico-trip/config";

const title = `Save the Date — ${TRIP.title}, ${TRIP.dateLabel}`;
const description = `${TRIP.tagline} Join us at ${TRIP.resort} for ${TRIP.dateLabel}. ${TRIP.promise}`;

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  // Internal save-the-date, not something we want indexed.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B2237",
};

export default function MexicoTripLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
