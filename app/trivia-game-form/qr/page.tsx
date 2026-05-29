import type { Metadata } from "next";
import TriviaFormQR from "@/components/trivia-game/TriviaFormQR";

export const metadata: Metadata = {
  title: "Scan to Connect — Keybase Financial Group",
  description:
    "Scan the QR code to share your details with a Keybase advisor.",
};

export default function TriviaGameFormQRPage() {
  return <TriviaFormQR />;
}
