import Image from "next/image";
import Link from "next/link";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "What We Do",
    links: [
      { label: "Wealth Management", href: "#what-we-do" },
      { label: "Investment Advisory", href: "#what-we-do" },
      { label: "Retirement & Estate", href: "#what-we-do" },
      { label: "Insurance Solutions", href: "#what-we-do" },
    ],
  },
  {
    heading: "Our Firm",
    links: [
      { label: "About Keybase", href: "#our-firm" },
      { label: "Our Approach", href: "#our-firm" },
      { label: "Leadership", href: "#our-firm" },
      { label: "Insights", href: "#insights" },
    ],
  },
  {
    heading: "Connect",
    links: [
      { label: "Contact Us", href: "/contact" },
      { label: "Careers", href: "#careers" },
      { label: "Book a Meeting", href: "/contact" },
      { label: "Insights", href: "#insights" },
    ],
  },
];

function Social({ label, href, path }: { label: string; href: string; path: React.ReactNode }) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-9 w-9 items-center justify-center rounded-full text-[#1a2433] transition-colors hover:bg-[#006d6e] hover:text-white"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]">
        {path}
      </svg>
    </a>
  );
}

export default function SiteFooter() {
  return (
    <footer id="contact" className="border-t border-black/10 bg-white">
      <div className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8">
        {/* Top: brand + social */}
        <div className="flex flex-col gap-8 border-b border-black/10 pb-10 md:flex-row md:items-center md:justify-between">
          <Image
            src="/keybase-logo-nobg.png"
            alt="Keybase Financial Group"
            width={553}
            height={126}
            className="h-10 w-auto"
          />
          <div className="flex items-center gap-3">
            <span className="mr-1 text-sm font-semibold tracking-wide text-[#5b6573]">
              FOLLOW US
            </span>
            <Social
              label="LinkedIn"
              href="https://www.linkedin.com/company/keybase"
              path={
                <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
              }
            />
            <Social
              label="X"
              href="https://x.com"
              path={
                <path d="M18.24 2.25h3.31l-7.23 8.26L23.12 21.75h-6.65l-5.21-6.81-5.96 6.81H1.99l7.73-8.84L1.25 2.25h6.82l4.71 6.23 5.46-6.23zm-1.16 17.52h1.83L7.02 4.13H5.05l12.03 15.64z" />
              }
            />
            <Social
              label="Instagram"
              href="https://instagram.com"
              path={
                <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.68a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z" />
              }
            />
            <Social
              label="YouTube"
              href="https://youtube.com"
              path={
                <path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2C0 8.08 0 12 0 12s0 3.92.5 5.8a3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.8zM9.6 15.6V8.4l6.27 3.6-6.27 3.6z" />
              }
            />
          </div>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 gap-8 py-10 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-[#1a2433]">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[15px] text-[#5b6573] transition-colors hover:text-[#006d6e]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Legal */}
        <div className="space-y-4 border-t border-black/10 pt-8 text-[13px] leading-relaxed text-[#7a828d]">
          <p>
            Keybase Financial Group provides wealth management, investment advisory,
            and financial planning services. Investments are subject to market risk,
            including the possible loss of principal. Past performance is not a
            guarantee of future results. This website is for informational purposes
            only and does not constitute an offer or solicitation in any jurisdiction.
          </p>
          <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Keybase Financial Group. All rights reserved.</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Link href="#" className="font-semibold text-[#1a2433] hover:text-[#006d6e]">
                Privacy Policy
              </Link>
              <Link href="#" className="font-semibold text-[#1a2433] hover:text-[#006d6e]">
                Terms of Use
              </Link>
              <Link href="#" className="font-semibold text-[#1a2433] hover:text-[#006d6e]">
                Disclosures
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
