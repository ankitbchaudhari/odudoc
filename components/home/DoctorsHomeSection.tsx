"use client";

// Signed-in vs signed-out doctor section on the homepage. Lives in a
// tiny client component so the surrounding page can stay statically
// cached (ISR) — calling getServerSession() in the server page would
// opt every request out of the cache.

import Link from "next/link";
import { useSession } from "next-auth/react";
import DoctorCard from "@/components/DoctorCard";
import type { Doctor as PublicDoctor } from "@/lib/data";

export default function DoctorsHomeSection({ doctors }: { doctors: PublicDoctor[] }) {
  const { status } = useSession();
  const isSignedIn = status === "authenticated";

  // While the session resolves on first paint, show the signed-out
  // variant. It's the safer default — it still renders the doctor
  // count + CTA, just without the full grid.
  if (isSignedIn) {
    return (
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
    );
  }

  return (
    <div className="mx-auto mt-12 max-w-2xl overflow-hidden rounded-3xl border border-gray-100 bg-white dark:bg-slate-900 shadow-sm">
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
            className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-6 py-3 text-sm font-semibold text-primary-700 shadow-lg transition-transform hover:scale-105"
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
      <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-center">
        <div className="px-2 py-4">
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{doctors.length}+</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">Verified doctors</p>
        </div>
        <div className="px-2 py-4">
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">24/7</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">Availability</p>
        </div>
        <div className="px-2 py-4">
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">Free</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">To sign up</p>
        </div>
      </div>
    </div>
  );
}
