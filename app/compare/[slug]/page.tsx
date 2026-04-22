import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COMPARES, getCompareBySlug } from "@/lib/seo/compares";
import { BreadcrumbLd } from "@/components/StructuredData";
import Breadcrumbs from "@/components/Breadcrumbs";

export async function generateStaticParams() {
  return COMPARES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const c = getCompareBySlug(slug);
  if (!c) return { title: "Comparison not found" };
  return {
    title: c.titleTag,
    description: c.metaDescription,
    keywords: c.keywords,
    alternates: { canonical: `/compare/${c.slug}` },
    openGraph: {
      title: c.titleTag,
      description: c.metaDescription,
      url: `/compare/${c.slug}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: c.titleTag,
      description: c.metaDescription,
    },
  };
}

export default async function ComparePage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const c = getCompareBySlug(slug);
  if (!c) notFound();

  const related = c.relatedSlugs
    .map((s) => getCompareBySlug(s))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <>
      <BreadcrumbLd
        items={[
          { name: "Home", url: "/" },
          { name: "Compare", url: "/compare" },
          { name: `${c.a} vs ${c.b}`, url: `/compare/${c.slug}` },
        ]}
      />

      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Compare", href: "/compare" },
          { name: `${c.a} vs ${c.b}`, href: `/compare/${c.slug}` },
        ]}
      />

      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-primary-700 to-teal-700 text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <nav className="mb-4 text-sm text-white/80">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/compare" className="hover:text-white">Compare</Link>
            <span className="mx-2">/</span>
            <span>{c.a} vs {c.b}</span>
          </nav>
          <h1 className="text-3xl font-extrabold md:text-5xl">
            {c.a} <span className="text-white/70">vs</span> {c.b}
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-white/90">{c.tagline}</p>
          <p className="mt-5 max-w-3xl text-white/85 leading-relaxed">{c.overview}</p>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">Side by side</h2>
          <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  <th className="px-4 py-3">Factor</th>
                  <th className="px-4 py-3">{c.a}</th>
                  <th className="px-4 py-3">{c.b}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {c.rows.map((r) => (
                  <tr key={r.label} className="align-top">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.label}</td>
                    <td className="px-4 py-3 text-gray-700">{r.a}</td>
                    <td className="px-4 py-3 text-gray-700">{r.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* When to choose */}
      <section className="bg-gray-50 py-14">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-2xl border border-primary-200 bg-white p-6">
            <h3 className="text-lg font-bold text-primary-800">
              Choose {c.a} when
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              {c.whenToChoose.a.map((x) => (
                <li key={x} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary-500" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-indigo-200 bg-white p-6">
            <h3 className="text-lg font-bold text-indigo-800">
              Choose {c.b} when
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              {c.whenToChoose.b.map((x) => (
                <li key={x} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Verdict */}
      <section className="py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">The verdict</h2>
          <p className="mt-4 text-base leading-relaxed text-gray-700">{c.verdict}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            {/* Always-on booking CTA with deep-link context so /consult can
                preselect the right flow if it wants to. */}
            <Link
              href={`/consult?from=compare&slug=${c.slug}`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:scale-105 transition-transform"
            >
              Book a video consultation →
            </Link>
            {c.internalLinks?.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-primary-200 bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
              >
                {l.label} →
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Related compares */}
      {related.length > 0 && (
        <section className="bg-gray-50 py-14">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900">Related comparisons</h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/compare/${r.slug}`}
                  className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-lg"
                >
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-700">
                    {r.a} vs {r.b}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">{r.tagline}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All compares fallback */}
      <section className="py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">Browse all comparisons</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {COMPARES.filter((x) => x.slug !== c.slug).map((x) => (
              <Link
                key={x.slug}
                href={`/compare/${x.slug}`}
                className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:border-primary-400 hover:text-primary-700"
              >
                {x.a} vs {x.b}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
