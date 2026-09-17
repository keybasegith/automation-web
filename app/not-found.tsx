import Link from "next/link";
export default function NotFound() {
  return <main className="mx-auto max-w-3xl px-6 py-24 text-[#0a1f33]">
    <p className="text-sm font-semibold">404</p>
    <h1 className="mt-4 text-4xl font-semibold">We couldn’t find that page.</h1>
    <p className="mt-5 text-lg">The address may have changed. Explore Keybase or find an advisor to help.</p>
    <nav aria-label="Explore Keybase" className="mt-8 flex flex-wrap gap-6 underline">
      <Link href="/">Home</Link><Link href="/wealth-building">Our services</Link>
      <Link href="/our-advisors">Find an Advisor</Link><Link href="/newsroom">Newsroom</Link>
    </nav>
  </main>;
}
