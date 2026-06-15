import Link from "next/link";
import { BASE, EVENT, NAV_LINKS } from "@/lib/world-cup/config";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-[#0B1F3A] text-gray-300">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2 text-white">
              <span className="text-xl">🍁</span>
              <span className="font-bold">{EVENT.shortTitle}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              {EVENT.tagline}. An internal engagement challenge celebrating Team
              Canada and the FIFA World Cup, {EVENT.startDate} – {EVENT.endDate}.
            </p>
          </div>

          <div className="flex gap-12">
            <div>
              <h4 className="text-sm font-semibold text-white">Explore</h4>
              <ul className="mt-3 space-y-2 text-sm">
                {NAV_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-gray-400 hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Participate</h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href={`${BASE}/register`} className="text-gray-400 hover:text-white">
                    Register
                  </Link>
                </li>
                <li>
                  <Link href={`${BASE}/login`} className="text-gray-400 hover:text-white">
                    Log in
                  </Link>
                </li>
                <li>
                  <Link href={`${BASE}/predictions`} className="text-gray-400 hover:text-white">
                    My Predictions
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 text-xs leading-relaxed text-gray-500">
          <p>
            Internal engagement use only. The entry fee, pool, prize structure,
            and eligibility are subject to internal and legal review and approval
            before launch. This platform does not process payments or issue
            payouts. Not affiliated with FIFA. © 2026 Argosy / Keybase.
          </p>
        </div>
      </div>
    </footer>
  );
}
