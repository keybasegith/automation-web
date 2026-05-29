import type { Metadata, Viewport } from "next";
import TriviaForm from "@/components/trivia-game/TriviaForm";

export const metadata: Metadata = {
  title: "Stay in Touch — Keybase Financial Group",
  description:
    "Share your details and a Keybase advisor will reach out to help you plan your financial future.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#006d6e",
};

export default function TriviaGameFormPage() {
  return <TriviaForm />;
}
