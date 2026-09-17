import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import { Mail, Phone, MapPin } from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import ContactForm from "@/components/home/ContactForm";
import { getPerson } from "@/lib/people/people";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata("/contact", "Contact Us — Keybase Financial Group", "Request an inquiry with Keybase Financial Group. Speak with an advisor about wealth management, investment advisory, retirement, estate, and insurance solutions.");

const DETAILS = [
  {
    icon: Phone,
    label: "Call us",
    value: "905-709-7911",
    href: "tel:+19057097911",
  },
  {
    icon: Mail,
    label: "Email us",
    value: "info@keybase.com",
    href: "mailto:info@keybase.com",
  },
  {
    icon: MapPin,
    label: "Visit us",
    value: ["1725 16th Avenue Suite 101", "Richmond Hill, ON L4B 0B3"],
  },
];

/**
 * `?advisor=<slug>` addresses the inquiry to one advisor.
 *
 * The slug is resolved against the people registry rather than trusted: an
 * unknown or tampered value simply yields the ordinary contact form, so nothing
 * a visitor puts in the URL can be reflected onto the page.
 */
export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ advisor?: string }>;
}) {
  const { advisor } = await searchParams;
  const requested = advisor ? getPerson(advisor) : undefined;

  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />
      <BreadcrumbSchema items={[{ name: "Contact Us", path: "/contact" }]} />

      <main className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-20">
          {/* Left: intro + contact details */}
          <div className="lg:pt-2">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Contact Us
            </p>
            <h1 className="mt-4 font-serif text-[40px] font-normal leading-[1.08] tracking-tight text-[#0a1f33] sm:text-[52px]">
              Let&apos;s start the conversation.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
              Whether you&apos;re planning for retirement, protecting your family,
              or building a long-term strategy, a Keybase advisor is ready to
              help. Tell us a little about your goals and we&apos;ll be in touch
              within one business day.
            </p>

            <dl className="mt-12 space-y-8">
              {DETAILS.map((d) => {
                const Icon = d.icon;
                return (
                  <div key={d.label} className="flex items-start gap-4">
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[#eaeef2] text-[#0a1f33]">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <div>
                      <dt className="text-[13px] font-semibold uppercase tracking-wide text-[#7a828d]">
                        {d.label}
                      </dt>
                      <dd className="mt-1 text-lg text-[#0a1f33]">
                        {d.href ? (
                          <a href={d.href} className="hover:underline">
                            {d.value}
                          </a>
                        ) : Array.isArray(d.value) ? (
                          d.value.map((line) => <div key={line}>{line}</div>)
                        ) : (
                          d.value
                        )}
                      </dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          </div>

          {/* Right: form */}
          <ContactForm advisorName={requested?.name} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
