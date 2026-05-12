import type { Metadata } from "next";
import Link from "next/link";
import GuideRenderer from "@/components/doctor-guide/GuideRenderer";

// Public preview of the doctor onboarding guide. Same sections and
// videos as the signed-in version, but CTAs point at /for-doctors so
// prospects can read the whole walk-through before deciding to sign
// up. Indexable on purpose — long-form content with strong feature
// signals is good organic traffic for queries like "best telemedicine
// platform for doctors", "online doctor consultation app for doctors",
// "telemedicine EMR free", etc.

export const metadata: Metadata = {
  title: "Doctor's guide to OduDoc — every feature, in order",
  description:
    "A 5-minute walkthrough of OduDoc for doctors: verification, instant consultations, AI prescriptions, voice dictation, free EMR, payouts, and more. Everything you can do on the platform, with the order you'll need it in.",
  alternates: { canonical: "/for-doctors/guide" },
  openGraph: {
    title: "Doctor's guide to OduDoc",
    description:
      "Walkthrough video + written guide of every OduDoc feature for doctors — telemedicine, AI prescriptions, voice dictation, free EMR, weekly payouts.",
    url: "/for-doctors/guide",
    type: "article",
  },
  robots: { index: true, follow: true },
};

export default function ForDoctorsGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-600">
            For doctors · Public preview
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100 sm:text-4xl">
            How OduDoc works — a doctor&apos;s guide
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-300">
            A complete walkthrough of every feature you&apos;ll use as a doctor
            on OduDoc — telemedicine consultations, AI prescriptions, free EMR,
            payouts, and more. Read the whole thing in 5 minutes, or jump to a
            section using the sidebar.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/for-doctors"
              className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
            >
              Apply to join — it&apos;s free →
            </Link>
            <Link
              href="/auth/login"
              className="rounded-xl border border-slate-300 bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900"
            >
              Already a doctor? Sign in
            </Link>
          </div>
        </header>

        <GuideRenderer audience="public" />

        <div className="mt-12 rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-sky-50 p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Ready to start consulting on OduDoc?
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Free profile, 70% commission, weekly payouts, no monthly subscription.
            Verification takes 48 hours.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link
              href="/for-doctors"
              className="rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
            >
              Apply now
            </Link>
            <Link
              href="/contact"
              className="rounded-xl border border-slate-300 bg-white dark:bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900"
            >
              Talk to our team
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
