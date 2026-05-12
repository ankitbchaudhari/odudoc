"use client";

// Dashboard banner pointing new doctors at the onboarding guide.
//
// Dismissible — once a doctor clicks "Got it" or opens the guide, we
// stash a flag in localStorage and never show it again. Banner stays
// up indefinitely otherwise so it's still discoverable on day 7 if
// they haven't read it.

import Link from "next/link";
import { useEffect, useState } from "react";

const DISMISS_KEY = "doctor-guide-banner-dismissed-v1";

export default function DoctorGuideBanner() {
  const [dismissed, setDismissed] = useState(true); // hide until we read storage

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore — Safari private mode can throw on setItem.
    }
    setDismissed(true);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 via-sky-50 to-indigo-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-2xl text-white shadow-md">
          👋
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
            New here? Read the 5-minute guide
          </h3>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 sm:text-sm">
            Walks you through verification, availability, prescriptions, AI features, payouts, and more — with one-click links to each feature.
          </p>
        </div>
        <div className="flex flex-none items-center gap-2">
          <Link
            href="/dashboard/doctor/guide"
            onClick={dismiss}
            className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            Open guide →
          </Link>
          <button
            onClick={dismiss}
            className="rounded-xl border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900"
            aria-label="Dismiss the welcome guide banner"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
