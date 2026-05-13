"use client";

// Doctor onboarding & feature guide (signed-in view).
//
// Lives under /dashboard/doctor so the verification gate enforces
// that only signed-in doctors see it. CTAs deep-link into the actual
// dashboard features so the guide doubles as a launcher.
//
// All section content + the sidebar + the per-section video slots
// live in components/doctor-guide/* — shared with the public preview
// at /for-doctors/guide so a copy edit lands on both pages.

import Link from "next/link";
import GuideRenderer from "@/components/doctor-guide/GuideRenderer";

export default function DoctorGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-600">
            Doctor onboarding
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100 sm:text-4xl">
            Welcome to OduDoc
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-300">
            Everything you can do on OduDoc, in the order you&apos;ll usually
            need it. Each section has a one-click link to the actual feature so
            you can try it as you read.
          </p>
        </header>

        <GuideRenderer audience="doctor" />

        <div className="mt-12 rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-sky-50 dark:from-slate-900 dark:to-slate-900 p-6 text-center">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Stuck on something?
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Our support team replies within one business day. Most doctors get
            onboarded in under 30 minutes.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href="/contact"
              className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
            >
              Contact support
            </Link>
            <Link
              href="/dashboard/doctor"
              className="rounded-xl border border-slate-300 bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
