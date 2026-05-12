import type { Metadata } from "next";
import Link from "next/link";
import { GLOSSARY } from "@/lib/seo/glossary";
import {
  BreadcrumbLd,
  DefinedTermSetLd,
} from "@/components/StructuredData";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Medical Glossary — Plain-English Definitions | OduDoc",
  description:
    "Short, clear definitions for common medical terms — HbA1c, BMI, MRI, SSRIs, and more. Written for patients, linked to related specialists and conditions.",
  alternates: { canonical: "/glossary" },
  openGraph: {
    title: "OduDoc Medical Glossary",
    description:
      "Plain-English definitions for common medical terms, with links to specialists and conditions.",
    url: "/glossary",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OduDoc Medical Glossary",
    description: "Plain-English definitions for common medical terms.",
  },
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function GlossaryIndexPage() {
  const sorted = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));
  const grouped: Record<string, typeof sorted> = {};
  for (const t of sorted) {
    const letter = (t.term[0] || "#").toUpperCase();
    (grouped[letter] ||= []).push(t);
  }
  const activeLetters = LETTERS.filter((l) => grouped[l]?.length);

  return (
    <>
      <BreadcrumbLd
        items={[
          { name: "Home", url: "/" },
          { name: "Glossary", url: "/glossary" },
        ]}
      />
      <DefinedTermSetLd
        terms={sorted.map((t) => ({
          slug: t.slug,
          term: t.term,
          short: t.short,
        }))}
      />

      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Glossary", href: "/glossary" },
        ]}
      />

      <section className="bg-gradient-to-br from-primary-50 via-white to-teal-50 py-14">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100 md:text-5xl">
            Medical <span className="text-primary-600">Glossary</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-slate-300">
            {sorted.length} plain-English definitions for the medical terms
            you&apos;ll hear from doctors, lab reports, and discharge notes.
          </p>
        </div>
      </section>

      <section className="sticky top-0 z-10 border-y border-gray-100 bg-white/90 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-1 px-4 sm:px-6 lg:px-8">
          {LETTERS.map((l) =>
            activeLetters.includes(l) ? (
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
            )
          )}
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {activeLetters.map((letter) => (
            <div
              key={letter}
              id={`letter-${letter}`}
              className="mb-10 scroll-mt-20"
            >
              <h2 className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">
                {letter}
              </h2>
              <ul className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
                {grouped[letter].map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/glossary/${t.slug}`}
                      className="group block border-b border-gray-100 py-3"
                    >
                      <span className="font-semibold text-gray-900 dark:text-slate-100 group-hover:text-primary-700">
                        {t.term}
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-slate-400">
                        {t.short}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 dark:bg-slate-900 py-10">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Glossary entries are general reference, not medical advice for any
            specific person.{" "}
            <Link href="/consult" className="font-semibold text-primary-700">
              Book a consultation →
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
