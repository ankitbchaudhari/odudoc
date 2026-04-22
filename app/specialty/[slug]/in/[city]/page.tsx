// Specialty × city matrix — one landing page per (specialty, city) pair.
//
// 12 specialties × 12 cities = 144 indexable pages. This is the highest-
// leverage long-tail SEO pattern in healthcare marketplaces: users search
// "online dermatologist in Mumbai", "cardiologist consultation in New York",
// and a dedicated page for that exact query outperforms generic listings.
//
// Each page combines the specialty's clinical copy with city-specific
// context, lists doctors filtered by specialty (with city filtering as a
// bonus), and cross-links to the parent specialty, parent city, and peer
// cities for the same specialty.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSpecialtyBySlug, SPECIALTIES } from "@/lib/seo/specialties";
import { getCityBySlug, CITIES } from "@/lib/seo/cities";
import { getPublicDoctorsFresh } from "@/lib/public-doctors";
import { ServiceLd, BreadcrumbLd, FaqLd } from "@/components/StructuredData";
import Breadcrumbs from "@/components/Breadcrumbs";
import DoctorCard from "@/components/DoctorCard";

export const dynamic = "force-dynamic";

// Pre-render all combinations at build time.
export async function generateStaticParams() {
  const out: Array<{ slug: string; city: string }> = [];
  for (const s of SPECIALTIES) {
    for (const c of CITIES) {
      out.push({ slug: s.slug, city: c.slug });
    }
  }
  return out;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string; city: string }> }
): Promise<Metadata> {
  const { slug, city } = await params;
  const s = getSpecialtyBySlug(slug);
  const c = getCityBySlug(city);
  if (!s || !c) return { title: "Not found" };

  const title = `Online ${s.displayName} in ${c.displayName} — Book Video Consultation`;
  const description = `Consult a ${s.displayName.toLowerCase()} online in ${c.displayName}. ${s.tagline} Same-day video visits, digital prescriptions.`;

  return {
    title,
    description,
    keywords: [
      `${s.displayName} ${c.displayName}`,
      `online ${s.displayName.toLowerCase()} ${c.displayName}`,
      `${s.displayName.toLowerCase()} consultation ${c.displayName}`,
      `${s.displayName.toLowerCase()} video call ${c.displayName}`,
      ...s.keywords,
    ],
    alternates: { canonical: `/specialty/${s.slug}/in/${c.slug}` },
    openGraph: {
      title,
      description,
      url: `/specialty/${s.slug}/in/${c.slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SpecialtyInCityPage(
  { params }: { params: Promise<{ slug: string; city: string }> }
) {
  const { slug, city } = await params;
  const s = getSpecialtyBySlug(slug);
  const c = getCityBySlug(city);
  if (!s || !c) notFound();

  const all = await getPublicDoctorsFresh();
  const cityLc = c.canonicalName.toLowerCase();

  const specialists = all.filter(
    (d) => d.available && d.specialty === s.canonicalName
  );
  const inCitySpecialists = specialists.filter(
    (d) =>
      (d.city || "").toLowerCase() === cityLc ||
      (d.location || "").toLowerCase().includes(cityLc)
  );

  // Prefer city-local doctors, but fall back to all specialists — video
  // consults don't care about geography. Show up to 12.
  const doctorsToShow =
    inCitySpecialists.length >= 4
      ? inCitySpecialists.slice(0, 12)
      : [...inCitySpecialists, ...specialists.filter((d) => !inCitySpecialists.includes(d))].slice(0, 12);

  // City-specific FAQs — augment the specialty FAQs with one local one.
  const faqs = [
    {
      q: `Is this ${s.displayName.toLowerCase()} licensed to practise in ${c.displayName}?`,
      a: `Every OduDoc doctor is verified against their licensing authority before going live. For patients in ${c.displayName}, ${c.country}, you'll only see doctors cleared to practise in your jurisdiction for prescription purposes.`,
    },
    {
      q: `How quickly can I get a video appointment in ${c.displayName}?`,
      a: `Most ${s.displayName.toLowerCase()}s on OduDoc offer same-day slots. The first available time appears on each doctor's card.`,
    },
    ...s.faqs,
  ];

  // Peer cities for the same specialty (internal linking).
  const peerCities = CITIES.filter((x) => x.slug !== c.slug);

  // Other specialties available in the same city (internal linking).
  const otherSpecialties = SPECIALTIES.filter((x) => x.slug !== s.slug);

  return (
    <>
      <ServiceLd
        name={`Online ${s.displayName} Consultation in ${c.displayName}`}
        description={`Video consultation with a verified ${s.displayName.toLowerCase()} for patients in ${c.displayName}.`}
        url={`/specialty/${s.slug}/in/${c.slug}`}
        serviceType="Telemedicine"
        areaServed={`${c.displayName}${c.state ? `, ${c.state}` : ""}, ${c.country}`}
      />
      <BreadcrumbLd
        items={[
          { name: "Home", url: "/" },
          { name: "Specialties", url: "/specialty" },
          { name: s.displayName, url: `/specialty/${s.slug}` },
          { name: c.displayName, url: `/specialty/${s.slug}/in/${c.slug}` },
        ]}
      />
      {FaqLd(faqs.slice(0, 6))}

      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Specialties", href: "/specialty" },
          { name: s.displayName, href: `/specialty/${s.slug}` },
          { name: c.displayName, href: `/specialty/${s.slug}/in/${c.slug}` },
        ]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-primary-700 to-teal-700 text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
          <nav className="mb-4 text-sm text-white/80">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/specialty" className="hover:text-white">Specialties</Link>
            <span className="mx-2">/</span>
            <Link href={`/specialty/${s.slug}`} className="hover:text-white">{s.displayName}</Link>
            <span className="mx-2">/</span>
            <span>{c.displayName}</span>
          </nav>
          <h1 className="text-3xl font-extrabold md:text-5xl">
            Online {s.displayName} Consultation in {c.displayName}
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-white/90">
            {s.tagline} Video consultations from anywhere in {c.displayName}.
          </p>
          <p className="mt-5 max-w-3xl text-white/85 leading-relaxed">
            {c.intro} Book a verified {s.displayName.toLowerCase()} in under a minute — no waiting room, no commute.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/consult"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary-700 shadow-lg hover:scale-105 transition-transform"
            >
              Book a consultation
            </Link>
            <Link
              href={`/doctors-in/${c.slug}`}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
            >
              All doctors in {c.displayName}
            </Link>
          </div>
        </div>
      </section>

      {/* Why an online {specialty} from {city} */}
      <section className="py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Why {c.displayName} patients use OduDoc for {s.displayName.toLowerCase()} visits
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: "⏱",
                title: "Same-day slots",
                desc: `Most ${s.displayName.toLowerCase()}s on OduDoc open video slots within hours.`,
              },
              {
                icon: "🩺",
                title: "Verified specialists",
                desc: `Every ${s.displayName.toLowerCase()} is licence-verified before going live.`,
              },
              {
                icon: "💊",
                title: "Digital prescriptions",
                desc: `Prescriptions are delivered to your OduDoc account — share with any ${c.displayName} pharmacy.`,
              },
            ].map((b) => (
              <div
                key={b.title}
                className="rounded-2xl border border-gray-200 bg-white p-6"
              >
                <div className="text-3xl">{b.icon}</div>
                <h3 className="mt-3 text-base font-bold text-gray-900">{b.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Conditions */}
      <section className="bg-gray-50 py-12">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              What {s.displayName}s on OduDoc treat
            </h2>
            <ul className="mt-4 space-y-2 text-gray-700">
              {s.conditions.map((cond) => (
                <li key={cond} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary-500" />
                  {cond}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Common search terms in {c.displayName}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {s.symptoms.map((sym) => (
                <span
                  key={sym}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700"
                >
                  {sym}
                </span>
              ))}
            </div>
            <p className="mt-6 text-sm text-gray-500 leading-relaxed">
              Every {s.displayName.toLowerCase()} listed here consults over video — the physical location of the doctor rarely matters for telemedicine, but we surface doctors with {c.displayName} context first.
            </p>
          </div>
        </div>
      </section>

      {/* Doctors */}
      {doctorsToShow.length > 0 && (
        <section className="py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {inCitySpecialists.length > 0
                ? `${s.displayName}s for ${c.displayName} patients`
                : `${s.displayName}s available online`}
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {doctorsToShow.map((d) => (
                <DoctorCard key={d.id} doctor={d} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="bg-gray-50 py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">
            {s.displayName} consultation in {c.displayName} — FAQ
          </h2>
          <div className="mt-6 space-y-4">
            {faqs.slice(0, 6).map((f) => (
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

      {/* Cross-link: same specialty, other cities */}
      <section className="py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">
            {s.displayName} consultations in other cities
          </h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {peerCities.map((x) => (
              <Link
                key={x.slug}
                href={`/specialty/${s.slug}/in/${x.slug}`}
                className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-700"
              >
                {s.displayName} in {x.displayName}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-link: other specialties, same city */}
      <section className="bg-gray-50 py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Other specialists in {c.displayName}
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {otherSpecialties.map((x) => (
              <Link
                key={x.slug}
                href={`/specialty/${x.slug}/in/${c.slug}`}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-primary-400 hover:text-primary-700"
              >
                {x.displayName} in {c.displayName}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
