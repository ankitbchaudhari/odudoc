import type { Metadata } from "next";
import Link from "next/link";
import { getPublicDoctorsFresh } from "@/lib/public-doctors";
import { BreadcrumbLd } from "@/components/StructuredData";
import Breadcrumbs from "@/components/Breadcrumbs";
import { SPECIALTIES } from "@/lib/seo/specialties";
import { CITIES } from "@/lib/seo/cities";

// Server-rendered A–Z directory of every verified doctor on OduDoc.
// Crawlers hit one URL and find every doctor-profile link — the cleanest way
// to distribute link equity across the doctor catalogue.

// ISR: directory page is fully public and changes at most when admin
// adds/removes a doctor. Revalidating every 10 min keeps it fresh enough
// while saving a full doctors-store read on every crawl.
export const revalidate = 600;

export const metadata: Metadata = {
  title: "All Doctors A–Z — OduDoc Verified Specialists",
  description:
    "Browse every verified doctor on OduDoc, alphabetically. Filter by specialty or city, or jump to a letter to find a specific physician.",
  alternates: { canonical: "/doctors-az" },
  openGraph: {
    title: "All Doctors A–Z — OduDoc",
    description: "The full, indexable OduDoc doctor directory.",
    url: "/doctors-az",
    type: "website",
  },
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function firstLetter(name: string): string {
  const c = (name || "").trim().replace(/^(dr\.?\s+)/i, "").charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
}

export default async function DoctorsAZPage() {
  const all = await getPublicDoctorsFresh();
  const available = all.filter((d) => d.available);

  // Group doctors by first letter of surname-less display name.
  const grouped: Record<string, typeof available> = {};
  for (const d of available) {
    const letter = firstLetter(d.name);
    (grouped[letter] ||= []).push(d);
  }
  // Sort each bucket alphabetically.
  for (const k of Object.keys(grouped)) {
    grouped[k].sort((a, b) => a.name.localeCompare(b.name));
  }

  const activeLetters = LETTERS.filter((l) => grouped[l]?.length > 0);

  return (
    <>
      <BreadcrumbLd
        items={[
          { name: "Home", url: "/" },
          { name: "Doctors A–Z", url: "/doctors-az" },
        ]}
      />
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Doctors A–Z", href: "/doctors-az" },
        ]}
      />

      <section className="bg-gradient-to-br from-primary-50 via-white to-teal-50 py-14">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100 md:text-5xl">
            All Doctors <span className="text-primary-600">A–Z</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-slate-300">
            {available.length} verified specialists available for video
            consultations. Jump to a letter, or browse by specialty or city.
          </p>
        </div>
      </section>

      {/* Letter jump */}
      <section className="sticky top-0 z-10 border-y border-gray-100 bg-white/90 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-1 px-4 sm:px-6 lg:px-8">
          {LETTERS.map((l) => {
            const has = activeLetters.includes(l);
            return has ? (
              <a
                key={l}
                href={`#letter-${l}`}
                className="rounded-md px-2 py-1 text-sm font-semibold text-primary-600 hover:bg-primary-50"
              >
                {l}
              </a>
            ) : (
              <span
                key={l}
                className="rounded-md px-2 py-1 text-sm text-gray-300"
                aria-hidden="true"
              >
                {l}
              </span>
            );
          })}
        </div>
      </section>

      {/* Letter groups */}
      <section className="py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {activeLetters.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 p-10 text-center text-gray-500 dark:text-slate-400">
              No doctors listed yet. Check back soon.
            </div>
          ) : (
            activeLetters.map((letter) => (
              <div key={letter} id={`letter-${letter}`} className="mb-12 scroll-mt-20">
                <h2 className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">
                  {letter}
                </h2>
                <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped[letter].map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/doctors/${d.id}`}
                        className="group block border-b border-gray-100 py-3"
                      >
                        <span className="font-medium text-gray-900 dark:text-slate-100 group-hover:text-primary-700">
                          {d.name}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-slate-400">
                          {d.specialty}
                          {d.city ? ` · ${d.city}` : ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Cross-links */}
      <section className="bg-gray-50 dark:bg-slate-900 py-12">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-300">
              Browse by specialty
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => (
                <Link
                  key={s.slug}
                  href={`/specialty/${s.slug}`}
                  className="rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 text-xs text-gray-700 dark:text-slate-300 hover:border-primary-400 hover:text-primary-700"
                >
                  {s.displayName}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-300">
              Browse by city
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {CITIES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/doctors-in/${c.slug}`}
                  className="rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 text-xs text-gray-700 dark:text-slate-300 hover:border-primary-400 hover:text-primary-700"
                >
                  {c.displayName}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
