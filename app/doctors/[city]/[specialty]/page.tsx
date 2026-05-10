// Programmatic SEO landing page: /doctors/[city]/[specialty]
//
// Resolves city + specialty against the doctor catalogue, renders a
// listing keyed for search ("Best Cardiologists in Hyderabad on
// OduDoc"). Falls through to a friendly empty-state when the
// combination has no doctors yet so the page still ranks for the
// keyword.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

interface RouteParams { city: string; specialty: string }

const SPECIALTY_DICTIONARY: Record<string, string> = {
  cardiology: "Cardiology",
  cardiologist: "Cardiology",
  neurology: "Neurology",
  neurologist: "Neurology",
  dermatology: "Dermatology",
  dermatologist: "Dermatology",
  paediatrics: "Paediatrics",
  paediatrician: "Paediatrics",
  pediatrics: "Paediatrics",
  pediatrician: "Paediatrics",
  orthopaedics: "Orthopaedics",
  orthopedics: "Orthopaedics",
  orthopedic: "Orthopaedics",
  gynaecology: "Gynaecology",
  gynecology: "Gynaecology",
  gynecologist: "Gynaecology",
  obstetrics: "Gynaecology",
  ent: "ENT",
  psychiatry: "Psychiatry",
  psychiatrist: "Psychiatry",
  pulmonology: "Pulmonology",
  pulmonologist: "Pulmonology",
  endocrinology: "Endocrinology",
  endocrinologist: "Endocrinology",
  diabetes: "Endocrinology",
  urology: "Urology",
  urologist: "Urology",
  nephrology: "Nephrology",
  nephrologist: "Nephrology",
  oncology: "Oncology",
  oncologist: "Oncology",
  ophthalmology: "Ophthalmology",
  ophthalmologist: "Ophthalmology",
  eye: "Ophthalmology",
  general: "General Medicine",
  "general-medicine": "General Medicine",
  "family-medicine": "General Medicine",
  gp: "General Medicine",
  dental: "Dentistry",
  dentist: "Dentistry",
  dentistry: "Dentistry",
};

const CITY_DICTIONARY: Record<string, { display: string; aka?: string[] }> = {
  hyderabad: { display: "Hyderabad", aka: ["Cyberabad", "HYD"] },
  bengaluru: { display: "Bengaluru", aka: ["Bangalore", "BLR"] },
  bangalore: { display: "Bengaluru" },
  mumbai: { display: "Mumbai", aka: ["Bombay"] },
  delhi: { display: "Delhi", aka: ["New Delhi", "NCR"] },
  "new-delhi": { display: "New Delhi" },
  chennai: { display: "Chennai", aka: ["Madras"] },
  pune: { display: "Pune" },
  kolkata: { display: "Kolkata", aka: ["Calcutta"] },
  ahmedabad: { display: "Ahmedabad" },
  jaipur: { display: "Jaipur" },
  lucknow: { display: "Lucknow" },
  chandigarh: { display: "Chandigarh" },
  kochi: { display: "Kochi", aka: ["Cochin"] },
  thiruvananthapuram: { display: "Thiruvananthapuram", aka: ["Trivandrum"] },
  bhopal: { display: "Bhopal" },
  indore: { display: "Indore" },
  nagpur: { display: "Nagpur" },
  vizag: { display: "Visakhapatnam", aka: ["Vizag"] },
  visakhapatnam: { display: "Visakhapatnam" },
  guwahati: { display: "Guwahati" },
};

interface PublicDoctor {
  id: string; name: string; specialty: string;
  city?: string; rating?: number; reviewCount?: number;
  experience?: number; fee?: number;
}

interface PageProps { params: Promise<RouteParams> }

function resolveCity(slug: string): { display: string; aka?: string[] } | null {
  const k = slug.toLowerCase();
  if (CITY_DICTIONARY[k]) return CITY_DICTIONARY[k];
  return null;
}
function resolveSpecialty(slug: string): string | null {
  const k = slug.toLowerCase();
  if (SPECIALTY_DICTIONARY[k]) return SPECIALTY_DICTIONARY[k];
  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city, specialty } = await params;
  const c = resolveCity(city);
  const s = resolveSpecialty(specialty);
  if (!c || !s) return { title: "Doctors — OduDoc", robots: { index: false } };
  const title = `Best ${s} doctors in ${c.display} — OduDoc`;
  const description = `Verified ${s.toLowerCase()} doctors in ${c.display}. Book online, see ratings, fees, and slot availability. Telemedicine + clinic visits.`;
  return {
    title, description,
    alternates: { canonical: `/doctors/${city.toLowerCase()}/${specialty.toLowerCase()}` },
    openGraph: { title, description, url: `/doctors/${city.toLowerCase()}/${specialty.toLowerCase()}`, type: "website" },
  };
}

async function getDoctors(): Promise<PublicDoctor[]> {
  try {
    const mod = await import("@/lib/public-doctors");
    if (typeof (mod as { getPublicDoctorsFresh?: unknown }).getPublicDoctorsFresh === "function") {
      const list = await (mod as unknown as { getPublicDoctorsFresh: () => Promise<PublicDoctor[]> }).getPublicDoctorsFresh();
      return Array.isArray(list) ? list : [];
    }
    if (typeof (mod as { getPublicDoctors?: unknown }).getPublicDoctors === "function") {
      const list = (mod as unknown as { getPublicDoctors: () => PublicDoctor[] }).getPublicDoctors();
      return Array.isArray(list) ? list : [];
    }
  } catch { /* ignore */ }
  return [];
}

export default async function CitySpecialtyPage({ params }: PageProps) {
  const { city, specialty } = await params;
  const c = resolveCity(city);
  const s = resolveSpecialty(specialty);
  if (!c || !s) notFound();

  const all = await getDoctors();
  const filtered = all.filter((d) => {
    const cityMatch = (d.city || "").toLowerCase().includes(c.display.toLowerCase());
    const specMatch = d.specialty.toLowerCase().includes(s.toLowerCase());
    return cityMatch && specMatch;
  }).sort((a, b) => (b.rating || 0) - (a.rating || 0));

  // JSON-LD ItemList for SEO.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Best ${s} doctors in ${c.display}`,
    itemListElement: filtered.slice(0, 20).map((d, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Physician",
        name: d.name,
        medicalSpecialty: d.specialty,
        aggregateRating: d.rating ? { "@type": "AggregateRating", ratingValue: d.rating, reviewCount: d.reviewCount || 0 } : undefined,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {/* Breadcrumbs */}
        <nav className="mb-4 text-xs text-slate-500">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-1">›</span>
          <Link href="/doctors" className="hover:underline">Find doctors</Link>
          <span className="mx-1">›</span>
          <Link href={`/doctors/${city.toLowerCase()}`} className="hover:underline">{c.display}</Link>
          <span className="mx-1">›</span>
          <span className="text-slate-700">{s}</span>
        </nav>

        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-700 p-8 text-white shadow-xl">
          <p className="text-xs font-bold uppercase tracking-wider opacity-80">Verified specialists in {c.display}</p>
          <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">{s} doctors in {c.display}</h1>
          <p className="mt-3 max-w-2xl text-white/90">
            Book {s.toLowerCase()} appointments online. Verified credentials, real patient ratings, telemedicine + in-person consults from ₹500. Average response time under 4 hours.
          </p>
        </div>

        {/* Listing */}
        <div className="mt-8">
          <p className="mb-3 text-sm text-slate-500">{filtered.length} doctor{filtered.length === 1 ? "" : "s"} found</p>
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-2xl">🩺</p>
              <p className="mt-2 text-base font-bold text-slate-700">We&apos;re onboarding {s.toLowerCase()} specialists in {c.display}</p>
              <p className="mt-1 text-sm text-slate-500">Browse all our verified doctors below, or come back soon.</p>
              <Link href="/doctors" className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white">Browse all doctors</Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((d, i) => (
                <li key={d.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold text-slate-900">{d.name}</p>
                        {i < 3 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">Top {i + 1}</span>}
                      </div>
                      <p className="text-xs text-slate-500">{d.specialty}{d.experience ? ` · ${d.experience} yrs experience` : ""}{d.city ? ` · ${d.city}` : ""}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {d.rating && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-800">★ {d.rating.toFixed(1)} ({d.reviewCount || 0})</span>}
                        {d.fee && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">₹{d.fee.toLocaleString("en-IN")}</span>}
                      </div>
                    </div>
                    <Link href={`/doctors/${d.id}`} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Book</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* SEO content footer */}
        <article className="mt-12 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">About {s.toLowerCase()} care in {c.display}</h2>
          <p className="mt-2 text-sm text-slate-700">
            {c.display} is home to some of India&apos;s most established hospitals and {s.toLowerCase()} clinics. On OduDoc you can compare verified doctors by rating, fees, experience, and slot availability — and book in one click.
          </p>
          <p className="mt-2 text-sm text-slate-700">
            Most {s.toLowerCase()} consultations on the platform start at ₹500-₹1,500 depending on the specialist&apos;s seniority. Telemedicine is available for follow-ups; in-person visits for first consults that need physical examination.
          </p>
          <h3 className="mt-4 text-sm font-bold text-slate-900">Why book through OduDoc</h3>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-700 space-y-1">
            <li>Every doctor verified — registration number checked against {c.display.includes("Hyderabad") ? "TGMC" : "the state medical council"}.</li>
            <li>Instant cashless if your hospital is empanelled with your insurer.</li>
            <li>End-to-end care: book → consult → e-prescription → pharmacy delivery → lab tests → follow-up — without leaving the app.</li>
            <li>Family accounts: manage your kids&apos; / parents&apos; care from one login.</li>
          </ul>
          {c.aka && c.aka.length > 0 && (
            <p className="mt-4 text-[10px] text-slate-400">Also known as: {c.aka.join(", ")}.</p>
          )}
        </article>

        <div className="mt-8 text-center">
          <Link href="/doctors" className="text-sm font-semibold text-indigo-600 hover:underline">← Back to all doctors</Link>
        </div>
      </div>
    </main>
  );
}
