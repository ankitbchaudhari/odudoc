import type { Metadata } from "next";
import Link from "next/link";
import { CONDITIONS } from "@/lib/seo/conditions";
import { BreadcrumbLd } from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "Conditions A–Z — Diagnosis, Treatment & Online Doctors",
  description:
    "Evidence-based guides to common medical conditions — hypertension, diabetes, migraine, PCOS, depression and more — with online doctor consultations in minutes.",
  alternates: { canonical: "/conditions" },
  openGraph: {
    title: "Medical Conditions A–Z — OduDoc",
    description: "Understand your condition and connect with the right specialist online.",
    url: "/conditions",
    type: "website",
  },
};

export default function ConditionsIndexPage() {
  return (
    <>
      <BreadcrumbLd
        items={[
          { name: "Home", url: "/" },
          { name: "Conditions", url: "/conditions" },
        ]}
      />

      <section className="bg-gradient-to-br from-primary-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 py-16">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100 md:text-5xl">
            Conditions <span className="text-primary-600">A–Z</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-slate-300">
            Clear, clinical guides to the conditions our doctors treat most —
            written to help you understand, prepare, and decide.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CONDITIONS.map((c) => (
              <Link
                key={c.slug}
                href={`/conditions/${c.slug}`}
                className="group rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 transition-all hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-lg"
              >
                <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 group-hover:text-primary-700">
                  {c.name}
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
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
