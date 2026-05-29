import type { Metadata, Viewport } from "next";
import TriviaGame from "@/components/trivia-game/TriviaGame";

export const metadata: Metadata = {
  title: "Finance Trivia Challenge",
  description:
    "Test your knowledge of investing, compounding, and long-term wealth.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#006d6e",
};

export default function TriviaGamePage() {
  return <TriviaGame />;
}
