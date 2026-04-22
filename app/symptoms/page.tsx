import type { Metadata } from "next";
import Link from "next/link";
import { SYMPTOMS } from "@/lib/seo/symptoms";
import { BreadcrumbLd } from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "Symptoms A–Z — When to See a Doctor Online",
  description:
    "Browse common symptoms, learn the red flags, and book an online doctor consultation for fever, headache, cough, chest pain, acne, back pain, anxiety and more.",
  alternates: { canonical: "/symptoms" },
  openGraph: {
    title: "Symptoms A–Z — OduDoc",
    description: "Understand your symptoms and connect with the right specialist online.",
    url: "/symptoms",
    type: "website",
  },
};

export default function SymptomsIndexPage() {
  return (
    <>
      <BreadcrumbLd
        items={[
          { name: "Home", url: "/" },
          { name: "Symptoms", url: "/symptoms" },
        ]}
      />

      <section className="bg-gradient-to-br from-primary-50 via-white to-teal-50 py-16">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold text-gray-900 md:text-5xl">
            Symptoms <span className="text-primary-600">A–Z</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Quick, evidence-based guides for the most common reasons people book
            a doctor — with red flags, self-care, and one-tap booking.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SYMPTOMS.map((s) => (
              <Link
                key={s.slug}
                href={`/symptoms/${s.slug}`}
                className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-lg"
              >
                <h2 className="text-xl font-bold text-gray-900 group-hover:text-primary-700">
                  {s.name}
                </h2>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {s.tagline}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
