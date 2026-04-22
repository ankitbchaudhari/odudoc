import HeroWithTextSlider from "@/components/hero/HeroWithTextSlider";
import WorkingProcess from "@/components/WorkingProcess";
import StatsSection from "@/components/StatsSection";
import AwardsSection from "@/components/AwardsSection";
import FAQAccordion from "@/components/FAQAccordion";
import DoctorCard from "@/components/DoctorCard";
import BannerWithCTA from "@/components/banner/BannerWithCTA";
import ServicesGrid from "@/components/home/ServicesGrid";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import Link from "next/link";
import { faqs } from "@/lib/data";
import { getPublicDoctorsFresh } from "@/lib/public-doctors";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SPECIALTIES } from "@/lib/seo/specialties";
import { CITIES } from "@/lib/seo/cities";
import { ItemListLd } from "@/components/StructuredData";

// Always read the live admin-managed doctor list — don't cache the homepage.
export const dynamic = "force-dynamic";

export default async function Home() {
  const doctors = await getPublicDoctorsFresh();
  const session = await getServerSession(authOptions);
  const isSignedIn = !!session?.user;
  return (
    <>
      <ItemListLd
        name="Medical Specialties on OduDoc"
        items={SPECIALTIES.map((s) => ({
          name: s.displayName,
          url: `/specialty/${s.slug}`,
        }))}
      />
      <ItemListLd
        name="Cities served by OduDoc"
        items={CITIES.map((c) => ({
          name: c.displayName,
          url: `/doctors-in/${c.slug}`,
        }))}
      />
      <HeroWithTextSlider />

      <ServicesGrid />

      <WorkingProcess />

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-primary-50/50 py-20">
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[70%] -translate-x-1/2 rounded-full bg-gradient-to-r from-primary-200/30 via-teal-200/30 to-emerald-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-100 to-teal-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-700">
              👨‍⚕️ Our Team
            </span>
            <h2 className="mt-4 text-3xl font-bold text-gray-900 md:text-5xl">
              Our{" "}
              <span className="bg-gradient-to-r from-primary-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
                Expert Doctors
              </span>
            </h2>
            <p className="mt-3 text-gray-500">Meet the professionals behind your care</p>
          </div>

          {isSignedIn ? (
            <>
              <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {doctors.slice(0, 8).map((doc) => (
                  <DoctorCard key={doc.id} doctor={doc} />
                ))}
              </div>
              <div className="mt-12 text-center">
                <Link
                  href="/doctors"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 via-teal-600 to-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition-all hover:scale-105 hover:shadow-xl"
                >
                  View All Doctors
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </>
          ) : (
            <div className="mx-auto mt-12 max-w-2xl overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              <div className="bg-gradient-to-br from-primary-600 via-indigo-600 to-purple-600 px-8 py-12 text-center text-white">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-4 ring-white/20">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                  </svg>
                </div>
                <h3 className="mt-5 text-2xl font-bold">Sign in to view our doctors</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-white/90">
                  Our full network of verified specialists is available exclusively to
                  registered members. Create a free account in under a minute.
                </p>
                <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href="/auth/register?callbackUrl=/doctors"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary-700 shadow-lg transition-transform hover:scale-105"
                  >
                    Create free account →
                  </Link>
                  <Link
                    href="/auth/login?callbackUrl=/doctors"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-100 bg-white text-center">
                <div className="px-2 py-4">
                  <p className="text-lg font-bold text-gray-900">{doctors.length}+</p>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Verified doctors</p>
                </div>
                <div className="px-2 py-4">
                  <p className="text-lg font-bold text-gray-900">24/7</p>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Availability</p>
                </div>
                <div className="px-2 py-4">
                  <p className="text-lg font-bold text-gray-900">Free</p>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">To sign up</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Specialty rail — drives deep indexable pages + long-tail SEO. */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
                Consult a specialist online
              </h2>
              <p className="mt-2 text-gray-600">
                Pick the right specialist for your symptoms — video consultations in minutes.
              </p>
            </div>
            <Link
              href="/specialty"
              className="text-sm font-semibold text-primary-600 hover:underline"
            >
              Browse all specialties →
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {SPECIALTIES.map((s) => (
              <Link
                key={s.slug}
                href={`/specialty/${s.slug}`}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm font-medium text-gray-700 transition-all hover:-translate-y-0.5 hover:border-primary-400 hover:text-primary-700 hover:shadow-md"
              >
                {s.displayName}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* City rail — same treatment, geo-intent. */}
      <section className="bg-gray-50 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
                Doctors in your city
              </h2>
              <p className="mt-2 text-gray-600">
                Video consultations work everywhere. Browse by city for local pricing and availability.
              </p>
            </div>
            <Link
              href="/doctors-in"
              className="text-sm font-semibold text-primary-600 hover:underline"
            >
              All cities →
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {CITIES.map((c) => (
              <Link
                key={c.slug}
                href={`/doctors-in/${c.slug}`}
                className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary-400 hover:text-primary-700"
              >
                {c.displayName}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <StatsSection />

      <TestimonialsSection />

      <AwardsSection />

      <BannerWithCTA
        title="Need Urgent Medical Care?"
        subtitle="Our emergency team is available 24/7. Do not hesitate to reach out."
        buttonText="Book Consultation"
        buttonHref="/consult"
      />

      <section className="relative overflow-hidden bg-gradient-to-br from-white via-indigo-50/40 to-primary-50/40 py-20">
        <div className="pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-200/30 to-purple-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-40 bottom-10 h-80 w-80 rounded-full bg-gradient-to-br from-teal-200/30 to-emerald-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700">
                ❓ Got Questions?
              </span>
              <h2 className="mt-4 text-3xl font-bold text-gray-900 md:text-5xl">
                Frequently Asked{" "}
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Questions
                </span>
              </h2>
              <p className="mt-4 leading-relaxed text-gray-600">
                Find answers to common questions about our services, appointments,
                insurance, and more. Still need help? Our support team is available
                around the clock.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/faq"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-105"
                >
                  View All FAQs
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-indigo-200 bg-white px-6 py-3 text-sm font-semibold text-indigo-700 transition-all hover:bg-indigo-50"
                >
                  Contact Support
                </Link>
              </div>
            </div>
            <FAQAccordion items={faqs.slice(0, 5)} />
          </div>
        </div>
      </section>
    </>
  );
}
