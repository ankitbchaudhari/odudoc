import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CITIES, getCityBySlug } from "@/lib/seo/cities";
import { SPECIALTIES } from "@/lib/seo/specialties";
import { getPublicDoctorsFresh } from "@/lib/public-doctors";
import { ServiceLd, BreadcrumbLd } from "@/components/StructuredData";
import Breadcrumbs from "@/components/Breadcrumbs";
import DoctorCard from "@/components/DoctorCard";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return CITIES.map((c) => ({ city: c.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ city: string }> }
): Promise<Metadata> {
  const { city } = await params;
  const c = getCityBySlug(city);
  if (!c) return { title: "City not found" };
  return {
    title: c.titleTag,
    description: c.metaDescription,
    keywords: [
      `doctors in ${c.displayName}`,
      `online consultation ${c.displayName}`,
      `video doctor ${c.displayName}`,
      `${c.displayName} telemedicine`,
    ],
    alternates: { canonical: `/doctors-in/${c.slug}` },
    openGraph: {
      title: c.titleTag,
      description: c.metaDescription,
      url: `/doctors-in/${c.slug}`,
      type: "website",
    },
  };
}

export default async function CityPage(
  { params }: { params: Promise<{ city: string }> }
) {
  const { city } = await params;
  const c = getCityBySlug(city);
  if (!c) notFound();

  const all = await getPublicDoctorsFresh();
  const cityLc = c.canonicalName.toLowerCase();
  const cityDoctors = all
    .filter(
      (d) =>
        d.available &&
        ((d.city || "").toLowerCase() === cityLc ||
          (d.location || "").toLowerCase().includes(cityLc))
    )
    .slice(0, 12);

  return (
    <>
      <ServiceLd
        name={`Online Doctor Consultation in ${c.displayName}`}
        description={c.metaDescription}
        url={`/doctors-in/${c.slug}`}
        serviceType="Telemedicine"
        areaServed={`${c.displayName}${c.state ? `, ${c.state}` : ""}, ${c.country}`}
      />
      <BreadcrumbLd
        items={[
          { name: "Home", url: "/" },
          { name: "Cities", url: "/doctors-in" },
          { name: c.displayName, url: `/doctors-in/${c.slug}` },
        ]}
      />

      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Cities", href: "/doctors-in" },
          { name: c.displayName, href: `/doctors-in/${c.slug}` },
        ]}
      />

      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-primary-700 to-teal-700 text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <nav className="mb-4 text-sm text-white/80">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/doctors-in" className="hover:text-white">Cities</Link>
            <span className="mx-2">/</span>
            <span>{c.displayName}</span>
          </nav>
          <h1 className="text-3xl font-extrabold md:text-5xl">
            Online doctor consultation in {c.displayName}
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-white/90">{c.tagline}</p>
          <p className="mt-5 max-w-3xl text-white/85 leading-relaxed">{c.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/consult"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary-700 shadow-lg hover:scale-105 transition-transform"
            >
              Book now
            </Link>
            <Link
              href="/specialty"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
            >
              Browse by specialty
            </Link>
          </div>
        </div>
      </section>

      {cityDoctors.length > 0 && (
        <section className="py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Doctors available in {c.displayName}
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {cityDoctors.map((d) => (
                <DoctorCard key={d.id} doctor={d} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-gray-50 py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Find a specialist in {c.displayName}
          </h2>
          <p className="mt-2 text-gray-600">
            Most OduDoc specialists offer video consultations nationwide, so you
            can book any of these even if no one is listed specifically in {c.displayName}.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {SPECIALTIES.map((s) => (
              <Link
                key={s.slug}
                href={`/specialty/${s.slug}/in/${c.slug}`}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-primary-400 hover:text-primary-700"
              >
                {s.displayName} in {c.displayName}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">Other cities</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {CITIES.filter((x) => x.slug !== c.slug).map((x) => (
              <Link
                key={x.slug}
                href={`/doctors-in/${x.slug}`}
                className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-700"
              >
                {x.displayName}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
