import type { Metadata } from "next";
import { AuthProvider } from "@/lib/world-cup/auth";
import { Navbar } from "@/components/world-cup/Navbar";
import { Footer } from "@/components/world-cup/Footer";
import { EVENT } from "@/lib/world-cup/config";

export const metadata: Metadata = {
  title: {
    default: EVENT.title,
    template: `%s · ${EVENT.shortTitle}`,
  },
  description: `${EVENT.tagline}. An internal FIFA World Cup 2026 prediction challenge, ${EVENT.startDate}–${EVENT.endDate}.`,
};

export default function WorldCupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col bg-[#F4F5F7]">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
