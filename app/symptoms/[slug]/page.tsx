import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSymptomBySlug, SYMPTOMS } from "@/lib/seo/symptoms";
import { getSpecialtyBySlug } from "@/lib/seo/specialties";
import { BreadcrumbLd, FaqLd } from "@/components/StructuredData";
import Breadcrumbs from "@/components/Breadcrumbs";
import RelatedReading from "@/components/RelatedReading";
import { getRelatedPosts } from "@/lib/seo/related-posts";

export async function generateStaticParams() {
  return SYMPTOMS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const s = getSymptomBySlug(slug);
  if (!s) return { title: "Symptom not found" };
  return {
    title: s.titleTag,
    description: s.metaDescription,
    keywords: s.keywords,
    alternates: { canonical: `/symptoms/${s.slug}` },
    openGraph: {
      title: s.titleTag,
      description: s.metaDescription,
      url: `/symptoms/${s.slug}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: s.titleTag,
      description: s.metaDescription,
    },
  };
}

export default async function SymptomPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const s = getSymptomBySlug(slug);
  if (!s) notFound();

  const relatedSpecialties = s.relatedSpecialtySlugs
    .map((sl) => getSpecialtyBySlug(sl))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const relatedPosts = await getRelatedPosts({
    terms: [s.name, ...s.keywords.slice(0, 3)],
    limit: 3,
  });

  return (
    <>
      <BreadcrumbLd
        items={[
          { name: "Home", url: "/" },
          { name: "Symptoms", url: "/symptoms" },
          { name: s.name, url: `/symptoms/${s.slug}` },
        ]}
      />
      {FaqLd(s.faqs)}

      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Symptoms", href: "/symptoms" },
          { name: s.name, href: `/symptoms/${s.slug}` },
        ]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-teal-700 to-emerald-700 text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <nav className="mb-4 text-sm text-white/80">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/symptoms" className="hover:text-white">Symptoms</Link>
            <span className="mx-2">/</span>
            <span>{s.name}</span>
          </nav>
          <h1 className="text-3xl font-extrabold md:text-5xl">{s.name}</h1>
          <p className="mt-3 max-w-2xl text-lg text-white/90">{s.tagline}</p>
          <p className="mt-5 max-w-3xl text-white/85 leading-relaxed">{s.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/consult"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary-700 shadow-lg hover:scale-105 transition-transform"
            >
              Book a consultation
            </Link>
            {relatedSpecialties[0] && (
              <Link
                href={`/specialty/${relatedSpecialties[0].slug}`}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
              >
                See a {relatedSpecialties[0].displayName}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Red flags + self-care */}
      <section className="py-14">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="text-xl font-bold text-red-900">When to worry</h2>
            <p className="mt-1 text-sm text-red-800/80">
              Seek urgent medical care for any of the following:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-red-900">
              {s.whenToWorry.map((w) => (
                <li key={w} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <h2 className="text-xl font-bold text-emerald-900">Safe self-care</h2>
            <p className="mt-1 text-sm text-emerald-800/80">
              Reasonable first steps while you wait for or decide on a consultation:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-emerald-900">
              {s.selfCare.map((c) => (
                <li key={c} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Related specialties */}
      {relatedSpecialties.length > 0 && (
        <section className="bg-gray-50 py-14">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Which specialist treats {s.name.toLowerCase()}?
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {relatedSpecialties.map((sp) => (
                <Link
                  key={sp.slug}
                  href={`/specialty/${sp.slug}`}
                  className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-lg"
                >
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-700">
                    {sp.displayName}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                    {sp.tagline}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <RelatedReading posts={relatedPosts} heading={`${s.name} — related reading`} />

      {/* FAQ */}
      <section className="py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">
            {s.name} — FAQ
          </h2>
          <div className="mt-6 space-y-4">
            {s.faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-gray-200 bg-white p-5 open:bg-primary-50/30"
              >
                <summary className="cursor-pointer list-none text-base font-semibold text-gray-900">
                  {f.q}
                </summary>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Other symptoms */}
      <section className="bg-gray-50 py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">Other symptoms</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {SYMPTOMS.filter((x) => x.slug !== s.slug).map((x) => (
              <Link
                key={x.slug}
                href={`/symptoms/${x.slug}`}
                className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:border-primary-400 hover:text-primary-700"
              >
                {x.name}
              </Link>
            ))}
          </div>
          <p className="mt-8 text-xs text-gray-500 leading-relaxed">
            This page is general information, not medical advice for any specific
            person. If in doubt, book a consultation or seek emergency care.
          </p>
        </div>
      </section>
    </>
  );
}
