import type { Metadata } from "next";
import Link from "next/link";
import { CITIES } from "@/lib/seo/cities";
import { BreadcrumbLd } from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "Online Doctors by City — Find a Physician Near You",
  description:
    "Find verified doctors for online video consultations in New York, Los Angeles, Chicago, London, Mumbai, Dubai, and more.",
  alternates: { canonical: "/doctors-in" },
  openGraph: {
    title: "Online Doctors by City — OduDoc",
    description: "Find verified doctors for online consultations in your city.",
    url: "/doctors-in",
    type: "website",
  },
};

export default function CitiesIndexPage() {
  return (
    <>
      <BreadcrumbLd
        items={[
          { name: "Home", url: "/" },
          { name: "Cities", url: "/doctors-in" },
        ]}
      />

      <section className="bg-gradient-to-br from-indigo-50 via-white to-primary-50 py-16">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100 md:text-5xl">
            Doctors by <span className="text-primary-600">city</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-slate-300">
            Video consultations are available across every location — we list
            cities separately so it's easy to find a doctor who knows your
            healthcare landscape.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CITIES.map((c) => (
              <Link
                key={c.slug}
                href={`/doctors-in/${c.slug}`}
                className="group rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 transition-all hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-lg"
              >
                <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 group-hover:text-primary-700">
                  {c.displayName}
                  {c.state && <span className="text-sm font-normal text-gray-500 dark:text-slate-400">, {c.state}</span>}
                </h2>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  {c.country}
                </p>
                <p className="mt-3 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                  {c.tagline}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
