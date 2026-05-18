import HeroWithTextSlider from "@/components/hero/HeroWithTextSlider";
import dynamicImport from "next/dynamic";
import WorkingProcess from "@/components/WorkingProcess";
import StatsSection from "@/components/StatsSection";
import AwardsSection from "@/components/AwardsSection";
import FAQAccordion from "@/components/FAQAccordion";
import BannerWithCTA from "@/components/banner/BannerWithCTA";
import ServicesGrid from "@/components/home/ServicesGrid";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import AiFeaturesShowcase from "@/components/home/AiFeaturesShowcase";
import ThreeAudiences from "@/components/home/ThreeAudiences";
import HowAiScribeWorks from "@/components/home/HowAiScribeWorks";
import DoctorsHomeSection from "@/components/home/DoctorsHomeSection";
import Link from "next/link";
import { faqs } from "@/lib/data";
import { getPublicDoctorsFresh } from "@/lib/public-doctors";
import { SPECIALTIES } from "@/lib/seo/specialties";
import { CITIES } from "@/lib/seo/cities";
import { ItemListLd } from "@/components/StructuredData";
import AppDownloadBadges from "@/components/AppDownloadBadges";

// Heavy below-the-fold interactive blocks — keep them out of the
// critical JS chunk. The symptom checker (~30 KB after gzip) and the
// demo-video player (YouTube/Mux iframe wrapper) are only meaningful
// after the visitor scrolls past the hero.
const SymptomChecker = dynamicImport(() => import("@/components/SymptomChecker"), {
  loading: () => <div className="min-h-[400px]" aria-hidden />,
});
const DemoVideoSection = dynamicImport(() => import("@/components/home/DemoVideoSection"), {
  loading: () => <div className="min-h-[300px]" aria-hidden />,
});

// ISR — re-fetch the admin doctor list at most once a minute. Cuts
// TTFB from ~950 ms (force-dynamic) to <100 ms for cache hits, while
// still picking up new admin-added doctors within ~60 s.
export const revalidate = 60;

export default async function Home() {
  // Transient Postgres outage must not kill the marketing homepage.
  const doctors = await getPublicDoctorsFresh().catch(
    () => [] as Awaited<ReturnType<typeof getPublicDoctorsFresh>>,
  );
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

      {/* Symptom checker — pre-signup triage wizard. Captures
          patients who don't yet know which specialist they need
          and routes them to the right specialty + booking flow. */}
      <SymptomChecker />

      {/* Feature catalogue teaser — single CTA strip directing
          visitors to the comprehensive /features page. Compact
          enough to sit between hero and AI showcase without
          burying the main scroll. */}
      <section className="bg-white dark:bg-slate-900 py-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <div className="flex-1 min-w-[260px]">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-700">One stack · 8 audiences</p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100 md:text-3xl">
              80+ capabilities across the entire healthcare ecosystem
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Patient app, doctor consult, hospital ops, lab + diagnostic marketplace, pharmacy fulfilment,
              pharma anti-counterfeit, insurance cashless, education partners — all on one platform.
            </p>
          </div>
          <Link
            href="/features"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-transform hover:-translate-y-0.5"
          >
            See all features
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Differentiator first — visitors land on the homepage and see
          the AI features within one scroll. Other clinic-management
          apps lead with "online appointments + digital prescriptions"
          which we also have but don't differentiate on. */}
      <AiFeaturesShowcase />

      {/* Product demo — single biggest conversion lever for AI features */}
      <DemoVideoSection />

      {/* How the scribe actually works — defuses the "is this magic?"
          objection without forcing visitors to watch the full demo. */}
      <HowAiScribeWorks />

      <ThreeAudiences />

      <ServicesGrid />

      <WorkingProcess />

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-primary-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900/50 py-20">
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[70%] -translate-x-1/2 rounded-full bg-gradient-to-r from-primary-200/30 via-teal-200/30 to-emerald-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-100 to-teal-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-700">
              👨‍⚕️ Our Team
            </span>
            <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-slate-100 md:text-5xl">
              Our{" "}
              <span className="bg-gradient-to-r from-primary-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
                Expert Doctors
              </span>
            </h2>
            <p className="mt-3 text-gray-500 dark:text-slate-400">Meet the professionals behind your care</p>
          </div>

          <DoctorsHomeSection doctors={doctors} />
        </div>
      </section>

      {/* Specialty rail — drives deep indexable pages + long-tail SEO. */}
      <section className="bg-white dark:bg-slate-900 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 md:text-3xl">
                Consult a specialist online
              </h2>
              <p className="mt-2 text-gray-600 dark:text-slate-300">
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
                className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-slate-300 transition-all hover:-translate-y-0.5 hover:border-primary-400 hover:text-primary-700 hover:shadow-md"
              >
                {s.displayName}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* City rail — same treatment, geo-intent. */}
      <section className="bg-gray-50 dark:bg-slate-900 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 md:text-3xl">
                Doctors in your city
              </h2>
              <p className="mt-2 text-gray-600 dark:text-slate-300">
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
                className="rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-slate-300 transition-colors hover:border-primary-400 hover:text-primary-700"
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

      {/* App download — patient app on iOS/Android. Universal links
          back to /p/* keep the experience continuous from web → app. */}
      <section className="bg-white dark:bg-slate-900 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AppDownloadBadges variant="patient" tone="primary" />
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-white via-indigo-50/40 to-primary-50/40 py-20">
        <div className="pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-200/30 to-purple-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-40 bottom-10 h-80 w-80 rounded-full bg-gradient-to-br from-teal-200/30 to-emerald-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700">
                ❓ Got Questions?
              </span>
              <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-slate-100 md:text-5xl">
                Frequently Asked{" "}
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Questions
                </span>
              </h2>
              <p className="mt-4 leading-relaxed text-gray-600 dark:text-slate-300">
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
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-indigo-200 bg-white dark:bg-slate-900 px-6 py-3 text-sm font-semibold text-indigo-700 transition-all hover:bg-indigo-50"
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
