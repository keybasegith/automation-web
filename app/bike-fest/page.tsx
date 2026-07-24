import type { Metadata } from "next";
import PdfViewer from "./PdfViewer";

export const metadata: Metadata = {
  title: "Bike Fest",
  description: "Bike Fest event flyer",
};

export default function BikeFestPage() {
  return <PdfViewer src="/bike-feast.pdf" />;
}
