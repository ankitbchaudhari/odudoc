import type { Metadata } from "next";
import Link from "next/link";
import { SPECIALTIES } from "@/lib/seo/specialties";
import { BreadcrumbLd } from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "Medical Specialties — Find the Right Doctor for Your Symptoms",
  description:
    "Browse OduDoc's medical specialties. Find dermatologists, pediatricians, cardiologists, psychiatrists, and more for online video consultations.",
  keywords: [
    "medical specialties",
    "find doctor by specialty",
    "online specialist consultation",
    "types of doctors",
  ],
  alternates: { canonical: "/specialty" },
  openGraph: {
    title: "Medical Specialties — OduDoc",
    description:
      "Find the right specialist for your symptoms. Video consultations with verified doctors.",
    url: "/specialty",
    type: "website",
  },
};

export default function SpecialtyIndexPage() {
  return (
    <>
      <BreadcrumbLd
        items={[
          { name: "Home", url: "/" },
          { name: "Specialties", url: "/specialty" },
        ]}
      />

      <section className="bg-gradient-to-br from-primary-50 via-white to-teal-50 py-16">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100 md:text-5xl">
            Medical <span className="text-primary-600">Specialties</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-slate-300">
            Find the right specialist for your symptoms. Every OduDoc doctor is
            verified, and most consultations are available over video — book in
            under a minute.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SPECIALTIES.map((s) => (
              <Link
                key={s.slug}
                href={`/specialty/${s.slug}`}
                className="group rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 transition-all hover:-translate-y-1 hover:border-primary-400 hover:shadow-lg"
              >
                <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 group-hover:text-primary-700">
                  {s.displayName}
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                  {s.tagline}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {s.symptoms.slice(0, 4).map((sym) => (
                    <span
                      key={sym}
                      className="rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs text-gray-600 dark:text-slate-300"
                    >
                      {sym}
                    </span>
                  ))}
                </div>
                <div className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary-600">
                  Learn more
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
