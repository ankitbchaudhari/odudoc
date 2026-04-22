import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSpecialtyBySlug, SPECIALTIES } from "@/lib/seo/specialties";
import { CITIES } from "@/lib/seo/cities";
import { getPublicDoctorsFresh } from "@/lib/public-doctors";
import { ServiceLd, BreadcrumbLd, FaqLd } from "@/components/StructuredData";
import Breadcrumbs from "@/components/Breadcrumbs";
import RelatedReading from "@/components/RelatedReading";
import { getRelatedPosts } from "@/lib/seo/related-posts";
import DoctorCard from "@/components/DoctorCard";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return SPECIALTIES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const s = getSpecialtyBySlug(slug);
  if (!s) return { title: "Specialty not found" };
  return {
    title: s.titleTag,
    description: s.metaDescription,
    keywords: [...s.keywords, ...s.conditions, ...s.symptoms],
    alternates: { canonical: `/specialty/${s.slug}` },
    openGraph: {
      title: s.titleTag,
      description: s.metaDescription,
      url: `/specialty/${s.slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: s.titleTag,
      description: s.metaDescription,
    },
  };
}

export default async function SpecialtyPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const s = getSpecialtyBySlug(slug);
  if (!s) notFound();

  const allDoctors = await getPublicDoctorsFresh();
  const doctors = allDoctors
    .filter((d) => d.specialty === s.canonicalName && d.available)
    .slice(0, 12);

  // Related specialties — simple: show 6 others.
  const related = SPECIALTIES.filter((x) => x.slug !== s.slug).slice(0, 6);

  // Blog posts that reference this specialty or its key conditions/keywords.
  const relatedPosts = await getRelatedPosts({
    terms: [s.canonicalName, s.displayName, ...s.keywords.slice(0, 3)],
    limit: 3,
  });

  return (
    <>
      <ServiceLd
        name={`Online ${s.displayName} Consultation`}
        description={s.metaDescription}
        url={`/specialty/${s.slug}`}
        serviceType="Telemedicine"
      />
      <BreadcrumbLd
        items={[
          { name: "Home", url: "/" },
          { name: "Specialties", url: "/specialty" },
          { name: s.displayName, url: `/specialty/${s.slug}` },
        ]}
      />
      {FaqLd(s.faqs)}

      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Specialties", href: "/specialty" },
          { name: s.displayName, href: `/specialty/${s.slug}` },
        ]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-teal-700 text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <nav className="mb-4 text-sm text-white/80">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/specialty" className="hover:text-white">Specialties</Link>
            <span className="mx-2">/</span>
            <span>{s.displayName}</span>
          </nav>
          <h1 className="text-3xl font-extrabold md:text-5xl">
            Online {s.displayName} Consultation
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-white/90">{s.tagline}</p>
          <p className="mt-5 max-w-3xl text-white/85 leading-relaxed">{s.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/consult"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary-700 shadow-lg hover:scale-105 transition-transform"
            >
              Book a consultation
            </Link>
            <Link
              href="/doctors"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
            >
              Browse doctors
            </Link>
          </div>
        </div>
      </section>

      {/* Conditions + symptoms */}
      <section className="py-14">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Conditions {s.displayName}s treat
            </h2>
            <ul className="mt-4 space-y-2 text-gray-700">
              {s.conditions.map((c) => (
                <li key={c} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary-500" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Common symptoms</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {s.symptoms.map((sym) => (
                <span
                  key={sym}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700"
                >
                  {sym}
                </span>
              ))}
            </div>
            <p className="mt-6 text-sm text-gray-500 leading-relaxed">
              Not sure if your symptom fits? Start with a{" "}
              <Link href="/specialty/general-physician" className="text-primary-600 underline">
                General Physician
              </Link>
              . They'll guide you to the right specialist if needed.
            </p>
          </div>
        </div>
      </section>

      {/* Doctors */}
      {doctors.length > 0 && (
        <section className="bg-gray-50 py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Verified {s.displayName}s on OduDoc
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {doctors.map((d) => (
                <DoctorCard key={d.id} doctor={d} />
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/consult"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:scale-105 transition-transform"
              >
                See all doctors
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">
            {s.displayName} consultation — FAQ
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

      <RelatedReading posts={relatedPosts} heading={`${s.displayName} — related reading`} />

      {/* Available in — city matrix cross-links */}
      <section className="py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">
            {s.displayName}s available in
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Video consultations work everywhere — choose your city for local pricing and licensing.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {CITIES.map((c) => (
              <Link
                key={c.slug}
                href={`/specialty/${s.slug}/in/${c.slug}`}
                className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary-400 hover:text-primary-700"
              >
                {s.displayName} in {c.displayName}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Related specialties */}
      <section className="bg-gray-50 py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">Browse other specialties</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/specialty/${r.slug}`}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm font-medium text-gray-700 transition-colors hover:border-primary-400 hover:text-primary-700"
              >
                {r.displayName}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
