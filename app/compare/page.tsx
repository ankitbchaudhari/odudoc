import type { Metadata } from "next";
import Link from "next/link";
import { COMPARES } from "@/lib/seo/compares";
import { BreadcrumbLd } from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "Healthcare Comparisons — Side-by-Side Guides",
  description:
    "Telemedicine vs in-person, EHR vs EMR, MRI vs CT, therapist vs psychiatrist — structured, evidence-based comparisons to help you decide.",
  alternates: { canonical: "/compare" },
  openGraph: {
    title: "Healthcare Comparisons — OduDoc",
    description: "Side-by-side guides for the decisions patients and clinics actually have to make.",
    url: "/compare",
    type: "website",
  },
};

export default function ComparesIndexPage() {
  return (
    <>
      <BreadcrumbLd
        items={[
          { name: "Home", url: "/" },
          { name: "Compare", url: "/compare" },
        ]}
      />

      <section className="bg-gradient-to-br from-indigo-50 via-white to-primary-50 py-16">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold text-gray-900 md:text-5xl">
            Healthcare <span className="text-primary-600">comparisons</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Structured side-by-sides for the decisions patients and clinics
            actually have to make — without the fluff.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COMPARES.map((c) => (
              <Link
                key={c.slug}
                href={`/compare/${c.slug}`}
                className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-lg"
              >
                <h2 className="text-xl font-bold text-gray-900 group-hover:text-primary-700">
                  {c.a} vs {c.b}
                </h2>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
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
