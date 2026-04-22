import type { Metadata } from "next";
import Link from "next/link";
import { SPECIALTIES } from "@/lib/seo/specialties";
import { CITIES } from "@/lib/seo/cities";

// Global 404 page. Next.js renders this whenever a route doesn't match.
//
// SEO-conscious design: instead of a dead-end "page not found" screen, we
// surface links to the most valuable landing pages (specialties, cities,
// core product pages). A user who hits a stale link has somewhere to go,
// and crawlers that stumble onto the 404 still receive internal-link
// equity for the rest of the site.

export const metadata: Metadata = {
  title: "Page not found",
  description:
    "We couldn't find that page on OduDoc. Browse doctors, book a consultation, or explore our health library.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="min-h-[70vh] bg-gradient-to-br from-primary-50 via-white to-teal-50">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-600">
            Error 404
          </p>
          <h1 className="mt-3 text-4xl font-extrabold text-gray-900 sm:text-5xl">
            We couldn&apos;t find that page
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-gray-600">
            The link may be broken, or the page may have moved. Here are some
            places to try instead.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary-700"
            >
              ← Back to home
            </Link>
            <Link
              href="/consult"
              className="inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 hover:border-primary-400"
            >
              Book a consultation
            </Link>
            <Link
              href="/doctors"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-primary-400 hover:text-primary-700"
            >
              Find a doctor
            </Link>
          </div>
        </div>

        {/* Cross-link rails */}
        <div className="mt-14 grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600">
              Browse by specialty
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {SPECIALTIES.slice(0, 10).map((s) => (
                <Link
                  key={s.slug}
                  href={`/specialty/${s.slug}`}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 hover:border-primary-400 hover:text-primary-700"
                >
                  {s.displayName}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600">
              Browse by city
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {CITIES.slice(0, 10).map((c) => (
                <Link
                  key={c.slug}
                  href={`/doctors-in/${c.slug}`}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 hover:border-primary-400 hover:text-primary-700"
                >
                  {c.displayName}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600">
            Popular destinations
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {[
              { label: "Symptoms A–Z", href: "/symptoms" },
              { label: "Conditions A–Z", href: "/conditions" },
              { label: "Medical glossary", href: "/glossary" },
              { label: "Doctors A–Z", href: "/doctors-az" },
              { label: "Compare options", href: "/compare" },
              { label: "Health blog", href: "/blog" },
              { label: "Lab tests", href: "/tests" },
              { label: "Contact us", href: "/contact" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
