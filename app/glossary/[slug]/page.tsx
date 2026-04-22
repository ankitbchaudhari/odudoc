import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GLOSSARY, getGlossaryBySlug } from "@/lib/seo/glossary";
import {
  BreadcrumbLd,
  DefinedTermLd,
} from "@/components/StructuredData";
import Breadcrumbs from "@/components/Breadcrumbs";

export async function generateStaticParams() {
  return GLOSSARY.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const t = getGlossaryBySlug(slug);
  if (!t) return { title: "Term not found" };
  const title = `${t.term} — Meaning & Definition | OduDoc Glossary`;
  const description = `${t.short} ${t.definition}`.slice(0, 155);
  return {
    title,
    description,
    keywords: t.keywords,
    alternates: { canonical: `/glossary/${t.slug}` },
    openGraph: {
      title,
      description,
      url: `/glossary/${t.slug}`,
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function GlossaryTermPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const t = getGlossaryBySlug(slug);
  if (!t) notFound();

  // Surface 6 sibling terms for internal linking.
  const siblings = GLOSSARY.filter((g) => g.slug !== t.slug).slice(0, 6);

  return (
    <>
      <BreadcrumbLd
        items={[
          { name: "Home", url: "/" },
          { name: "Glossary", url: "/glossary" },
          { name: t.term, url: `/glossary/${t.slug}` },
        ]}
      />
      <DefinedTermLd
        slug={t.slug}
        term={t.term}
        definition={t.definition}
        keywords={t.keywords}
      />

      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Glossary", href: "/glossary" },
          { name: t.term, href: `/glossary/${t.slug}` },
        ]}
      />

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">
            Medical glossary
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-gray-900 md:text-4xl">
            {t.term}
          </h1>
          <p className="mt-3 text-lg text-gray-600">{t.short}</p>
        </header>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-gray-900">Definition</h2>
          <p className="mt-3 text-base leading-relaxed text-gray-700">
            {t.definition}
          </p>
        </section>

        {t.context && (
          <section className="mt-8 rounded-2xl border border-primary-100 bg-primary-50/50 p-6">
            <h2 className="text-base font-bold text-primary-900">
              Clinical context
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-primary-900/80">
              {t.context}
            </p>
          </section>
        )}

        {t.seeAlso && t.seeAlso.length > 0 && (
          <section className="mt-8">
            <h2 className="text-base font-semibold uppercase tracking-wider text-gray-600">
              See also
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {t.seeAlso.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:border-primary-400 hover:text-primary-700"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-bold text-gray-900">
            Need this explained by a doctor?
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Book a short video consultation and ask anything — reports, results,
            medication concerns.
          </p>
          <Link
            href="/consult"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Book a consultation →
          </Link>
        </section>

        <section className="mt-12">
          <h2 className="text-base font-semibold uppercase tracking-wider text-gray-600">
            More glossary terms
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
            {siblings.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/glossary/${s.slug}`}
                  className="block border-b border-gray-100 py-2 text-sm font-medium text-gray-800 hover:text-primary-700"
                >
                  {s.term}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-gray-500">
            Glossary entries are general reference, not medical advice for any
            specific person.
          </p>
        </section>
      </article>
    </>
  );
}
