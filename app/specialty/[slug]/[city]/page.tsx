// /specialty/[slug]/[city] — reverse-lookup SEO landing page.
//
// Captures the highest-volume healthcare queries on Google: "cardiologist
// in mumbai", "dermatologist in los angeles", "pediatrician in delhi".
// Each combination of 12 specialties × 18 cities = 216 indexable pages
// with proper metadata, JSON-LD, and a filtered doctor list.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSpecialtyBySlug, SPECIALTIES } from "@/lib/seo/specialties";
import { CITIES } from "@/lib/seo/cities";
import { getPublicDoctorsFresh } from "@/lib/public-doctors";
import { ServiceLd, BreadcrumbLd, FaqLd } from "@/components/StructuredData";
import Breadcrumbs from "@/components/Breadcrumbs";
import DoctorCard from "@/components/DoctorCard";

export const dynamic = "force-dynamic";

// 12 specialties × 18 cities = 216 statically-buildable pages. Next
// will pre-render them all at build time without hammering the DB.
export async function generateStaticParams() {
  const params: Array<{ slug: string; city: string }> = [];
  for (const s of SPECIALTIES) {
    for (const c of CITIES) {
      params.push({ slug: s.slug, city: c.slug });
    }
  }
  return params;
}

function getCityBySlug(slug: string) {
  return CITIES.find((c) => c.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; city: string }>;
}): Promise<Metadata> {
  const { slug, city } = await params;
  const s = getSpecialtyBySlug(slug);
  const c = getCityBySlug(city);
  if (!s || !c) return { title: "Page not found" };
  const title = `Best ${s.displayName} in ${c.displayName} — Online & In-Clinic Consultations`;
  const description = `Book the best ${s.displayName.toLowerCase()} in ${c.displayName} on OduDoc. Verified doctors, video consultations, home lab tests, e-prescriptions. ${s.tagline}`;
  return {
    title,
    description,
    keywords: [
      `${s.displayName.toLowerCase()} in ${c.displayName.toLowerCase()}`,
      `${s.displayName.toLowerCase()} ${c.displayName.toLowerCase()}`,
      `best ${s.displayName.toLowerCase()} ${c.displayName.toLowerCase()}`,
      `online ${s.displayName.toLowerCase()} ${c.displayName.toLowerCase()}`,
      `top ${s.displayName.toLowerCase()} ${c.displayName.toLowerCase()}`,
      ...s.conditions.map((cond) => `${cond.toLowerCase()} ${c.displayName.toLowerCase()}`),
      ...s.keywords,
    ],
    alternates: { canonical: `/specialty/${s.slug}/${c.slug}` },
    openGraph: {
      title,
      description,
      url: `/specialty/${s.slug}/${c.slug}`,
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SpecialtyCityPage({
  params,
}: {
  params: Promise<{ slug: string; city: string }>;
}) {
  const { slug, city } = await params;
  const s = getSpecialtyBySlug(slug);
  const c = getCityBySlug(city);
  if (!s || !c) notFound();

  const allDoctors = await getPublicDoctorsFresh();
  const doctors = allDoctors
    .filter((d) => d.specialty === s.canonicalName && d.available)
    .filter((d) => !d.city || d.city.toLowerCase() === c.canonicalName.toLowerCase())
    .slice(0, 12);

  // City-scoped FAQ: same shape as the parent specialty FAQs, with
  // the city name injected so the answers feel specific to the user
  // and Google's snippet ranking has fresh anchor text.
  const cityFaqs = s.faqs.map((f) => ({
    q: f.q.replace(/online/gi, `${c.displayName} online`).replace(s.displayName, `${s.displayName} in ${c.displayName}`),
    a: `${f.a} OduDoc serves patients in ${c.displayName}, ${c.country} via verified video consults and at-home lab collection.`,
  }));
  cityFaqs.unshift({
    q: `How do I find the best ${s.displayName.toLowerCase()} in ${c.displayName}?`,
    a: `Browse the list below — every ${s.displayName.toLowerCase()} on OduDoc is council-verified, with public ratings and patient reviews. Filter by online availability for instant consults, or by in-clinic visits if you'd rather see them in person.`,
  });
  cityFaqs.push({
    q: `Are video consultations valid in ${c.displayName}?`,
    a: `Yes. Telemedicine prescriptions issued by an OduDoc ${s.displayName.toLowerCase()} are valid in ${c.displayName}, ${c.country}. The prescription you receive is a legally-recognised digital document signed by a licensed physician.`,
  });

  const otherSpecialties = SPECIALTIES.filter((x) => x.slug !== s.slug).slice(0, 6);
  const otherCities = CITIES.filter((x) => x.slug !== c.slug).slice(0, 6);

  return (
    <>
      <ServiceLd
        name={`${s.displayName} in ${c.displayName}`}
        description={`Online ${s.displayName.toLowerCase()} consultations and in-clinic visits in ${c.displayName}.`}
        url={`/specialty/${s.slug}/${c.slug}`}
        serviceType="MedicalSpecialty"
      />
      <BreadcrumbLd
        items={[
          { name: "Home", url: "/" },
          { name: "Specialties", url: "/specialty" },
          { name: s.displayName, url: `/specialty/${s.slug}` },
          { name: c.displayName, url: `/specialty/${s.slug}/${c.slug}` },
        ]}
      />
      {FaqLd(cityFaqs)}

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Specialties", href: "/specialty" },
            { name: s.displayName, href: `/specialty/${s.slug}` },
            { name: c.displayName, href: `/specialty/${s.slug}/${c.slug}` },
          ]}
        />

        {/* Hero */}
        <header className="mt-4 overflow-hidden rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg">
          <div className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-8 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
              {c.displayName}, {c.country}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">
              Best {s.displayName} in {c.displayName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">
              {s.tagline} Verified doctors, video consultations, in-clinic visits, home lab tests — all in {c.displayName}.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/consult-now"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-indigo-700 shadow-md hover:bg-white/90"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Consult Now
              </Link>
              <Link href={`/specialty/${s.slug}`} className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 backdrop-blur px-4 py-2 text-sm font-bold text-white ring-1 ring-white/30 hover:bg-white/25">
                All {s.displayName}s →
              </Link>
            </div>
          </div>
        </header>

        {/* Intro paragraph — SEO body */}
        <section className="mt-6 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
            About {s.displayName} consultations in {c.displayName}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-slate-300">{s.intro}</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-slate-300">
            OduDoc connects {c.displayName} patients with council-verified {s.displayName.toLowerCase()}s for online video consults
            and in-clinic visits. Most appointments are available the same day; severe symptoms route to our
            <Link href="/consult-now" className="text-indigo-600 dark:text-indigo-300 hover:underline"> Consult Now </Link>
            flow for an instant connection.
          </p>
        </section>

        {/* Conditions treated */}
        <section className="mt-6 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
            Conditions a {s.displayName.toLowerCase()} treats
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {s.conditions.map((cond) => (
              <li key={cond} className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300">
                <span className="mt-1 text-emerald-500">✓</span>
                <span>{cond}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Doctor list */}
        <section className="mt-6">
          <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-slate-100">
            {doctors.length > 0 ? `${doctors.length} verified ${s.displayName.toLowerCase()}s` : `Verified ${s.displayName.toLowerCase()}s`} in {c.displayName}
          </h2>
          {doctors.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {doctors.map((d) => (
                <DoctorCard key={d.id} doctor={d} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-900/40 p-8 text-center">
              <p className="text-sm text-gray-700 dark:text-slate-300">
                No {s.displayName.toLowerCase()}s in {c.displayName} on OduDoc yet — but{" "}
                <Link href={`/specialty/${s.slug}`} className="text-indigo-600 dark:text-indigo-300 hover:underline">
                  see {s.displayName.toLowerCase()}s in other cities
                </Link>
                {" "}or{" "}
                <Link href="/consult-now" className="text-indigo-600 dark:text-indigo-300 hover:underline">
                  consult online instantly
                </Link>.
              </p>
            </div>
          )}
        </section>

        {/* FAQs */}
        <section className="mt-8 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-slate-100">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {cityFaqs.map((f, i) => (
              <details key={i} className="group rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-950/40 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Internal linking — other specialties in this city */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              Other specialists in {c.displayName}
            </h3>
            <ul className="mt-3 space-y-1.5">
              {otherSpecialties.map((os) => (
                <li key={os.slug}>
                  <Link href={`/specialty/${os.slug}/${c.slug}`} className="text-sm text-indigo-600 dark:text-indigo-300 hover:underline">
                    {os.displayName} in {c.displayName} →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              {s.displayName} in other cities
            </h3>
            <ul className="mt-3 space-y-1.5">
              {otherCities.map((oc) => (
                <li key={oc.slug}>
                  <Link href={`/specialty/${s.slug}/${oc.slug}`} className="text-sm text-indigo-600 dark:text-indigo-300 hover:underline">
                    {s.displayName} in {oc.displayName} →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </>
  );
}
