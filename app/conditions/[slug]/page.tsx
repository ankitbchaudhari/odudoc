import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getConditionBySlug, CONDITIONS } from "@/lib/seo/conditions";
import { getSpecialtyBySlug } from "@/lib/seo/specialties";
import { getSymptomBySlug } from "@/lib/seo/symptoms";
import { BreadcrumbLd, FaqLd } from "@/components/StructuredData";
import Breadcrumbs from "@/components/Breadcrumbs";
import DoctorCard from "@/components/DoctorCard";
import { getPublicDoctorsFresh } from "@/lib/public-doctors";
import RelatedReading from "@/components/RelatedReading";
import { getRelatedPosts } from "@/lib/seo/related-posts";

// Doctor filtering reads live admin data, so this page can't be fully static.
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return CONDITIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const c = getConditionBySlug(slug);
  if (!c) return { title: "Condition not found" };
  return {
    title: c.titleTag,
    description: c.metaDescription,
    keywords: c.keywords,
    alternates: { canonical: `/conditions/${c.slug}` },
    openGraph: {
      title: c.titleTag,
      description: c.metaDescription,
      url: `/conditions/${c.slug}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: c.titleTag,
      description: c.metaDescription,
    },
  };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.odudoc.com";

function MedicalConditionLd({ c }: { c: ReturnType<typeof getConditionBySlug> }) {
  if (!c) return null;
  const data = {
    "@context": "https://schema.org",
    "@type": "MedicalCondition",
    name: c.name,
    description: c.overview,
    url: `${SITE_URL}/conditions/${c.slug}`,
    signOrSymptom: c.symptoms.map((s) => ({ "@type": "MedicalSignOrSymptom", name: s })),
    possibleTreatment: c.treatments.map((t) => ({ "@type": "MedicalTherapy", name: t })),
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function ConditionPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const c = getConditionBySlug(slug);
  if (!c) notFound();

  const relatedSpecialties = c.relatedSpecialtySlugs
    .map((s) => getSpecialtyBySlug(s))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const relatedSymptoms = (c.relatedSymptomSlugs || [])
    .map((s) => getSymptomBySlug(s))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  // Doctors whose specialty matches any of the condition's related
  // specialties. Cap at 8 so the page stays tight.
  const canonicalSpecialtyNames = relatedSpecialties.map((sp) => sp.canonicalName);
  const allDoctors = await getPublicDoctorsFresh();
  const conditionDoctors = allDoctors
    .filter(
      (d) =>
        d.available && canonicalSpecialtyNames.includes(d.specialty)
    )
    .slice(0, 8);

  const relatedPosts = await getRelatedPosts({
    terms: [c.name.replace(/\s*\(.*?\)\s*$/, "").trim(), ...c.keywords.slice(0, 3)],
    limit: 3,
  });

  return (
    <>
      <MedicalConditionLd c={c} />
      <BreadcrumbLd
        items={[
          { name: "Home", url: "/" },
          { name: "Conditions", url: "/conditions" },
          { name: c.name, url: `/conditions/${c.slug}` },
        ]}
      />
      {FaqLd(c.faqs)}

      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Conditions", href: "/conditions" },
          { name: c.name, href: `/conditions/${c.slug}` },
        ]}
      />

      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-teal-700 to-emerald-700 text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <nav className="mb-4 text-sm text-white/80">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/conditions" className="hover:text-white">Conditions</Link>
            <span className="mx-2">/</span>
            <span>{c.name}</span>
          </nav>
          <h1 className="text-3xl font-extrabold md:text-5xl">{c.name}</h1>
          <p className="mt-3 max-w-2xl text-lg text-white/90">{c.tagline}</p>
          <p className="mt-5 max-w-3xl text-white/85 leading-relaxed">{c.overview}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/consult"
              className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-6 py-3 text-sm font-semibold text-primary-700 shadow-lg hover:scale-105 transition-transform"
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

      {/* Causes + symptoms */}
      <section className="py-14">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Causes &amp; risk factors</h2>
            <ul className="mt-4 space-y-2 text-gray-700 dark:text-slate-300">
              {c.causes.map((x) => (
                <li key={x} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary-500" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Symptoms</h2>
            <ul className="mt-4 space-y-2 text-gray-700 dark:text-slate-300">
              {c.symptoms.map((x) => (
                <li key={x} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-teal-500" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Diagnosis + treatment */}
      <section className="bg-gray-50 dark:bg-slate-900 py-14">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">How it's diagnosed</h2>
            <ul className="mt-4 space-y-2 text-gray-700 dark:text-slate-300">
              {c.diagnosis.map((x) => (
                <li key={x} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Evidence-based treatment</h2>
            <ul className="mt-4 space-y-2 text-gray-700 dark:text-slate-300">
              {c.treatments.map((x) => (
                <li key={x} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Prevention (optional) */}
      {c.prevention && c.prevention.length > 0 && (
        <section className="py-14">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Prevention</h2>
            <ul className="mt-4 space-y-2 text-gray-700 dark:text-slate-300">
              {c.prevention.map((x) => (
                <li key={x} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary-500" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Doctors who treat this condition */}
      {conditionDoctors.length > 0 && (
        <section className="py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  Doctors who treat {c.name.replace(/\s*\(.*?\)\s*$/, "")}
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  Verified specialists available for video consultations today.
                </p>
              </div>
              <Link
                href="/consult"
                className="text-sm font-semibold text-primary-600 hover:underline"
              >
                Browse all doctors →
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {conditionDoctors.map((d) => (
                <DoctorCard key={d.id} doctor={d} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related specialties */}
      {relatedSpecialties.length > 0 && (
        <section className="bg-gray-50 dark:bg-slate-900 py-14">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Who treats this?</h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {relatedSpecialties.map((sp) => (
                <Link
                  key={sp.slug}
                  href={`/specialty/${sp.slug}`}
                  className="group rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 transition-all hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-lg"
                >
                  <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 group-hover:text-primary-700">
                    {sp.displayName}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">{sp.tagline}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related symptoms */}
      {relatedSymptoms.length > 0 && (
        <section className="py-14">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Related symptoms</h2>
            <div className="mt-6 flex flex-wrap gap-2">
              {relatedSymptoms.map((sy) => (
                <Link
                  key={sy.slug}
                  href={`/symptoms/${sy.slug}`}
                  className="rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-slate-300 hover:border-primary-400 hover:text-primary-700"
                >
                  {sy.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <RelatedReading posts={relatedPosts} heading={`${c.name.replace(/\s*\(.*?\)\s*$/, "")} — related reading`} />

      {/* FAQ */}
      <section className="bg-gray-50 dark:bg-slate-900 py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{c.name} — FAQ</h2>
          <div className="mt-6 space-y-4">
            {c.faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 open:bg-primary-50/30"
              >
                <summary className="cursor-pointer list-none text-base font-semibold text-gray-900 dark:text-slate-100">
                  {f.q}
                </summary>
                <p className="mt-3 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Other conditions */}
      <section className="py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Other conditions</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {CONDITIONS.filter((x) => x.slug !== c.slug).map((x) => (
              <Link
                key={x.slug}
                href={`/conditions/${x.slug}`}
                className="rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-slate-300 hover:border-primary-400 hover:text-primary-700"
              >
                {x.name}
              </Link>
            ))}
          </div>
          <p className="mt-8 text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
            This page is general information, not medical advice for any
            specific person. For diagnosis and treatment, book a consultation.
          </p>
        </div>
      </section>
    </>
  );
}
