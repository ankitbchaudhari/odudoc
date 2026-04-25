"use client";

// Branded 500 / runtime-error boundary.
//
// Next.js renders this for any uncaught error in a route segment. We
// forward the error to Sentry (dynamic import — no cost when SENTRY_DSN
// isn't set) and surface a calm, on-brand recovery screen with two
// clear next steps: retry the segment or go home. The Sentry digest is
// shown in small text so support can tie a user-reported "what happened"
// back to the exact event in the dashboard.

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    import("@/lib/sentry")
      .then((s) => s.captureException(error, { digest: error.digest }))
      .catch(() => {
        /* sentry import failed — already logged via console fallback */
      });
  }, [error]);

  return (
    <main className="relative flex min-h-[80vh] items-center justify-center overflow-hidden bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50 px-4 py-16">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-rose-200/40 to-pink-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-amber-200/40 to-orange-200/40 blur-3xl" />

      <div className="relative w-full max-w-xl text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 text-3xl text-white shadow-lg shadow-rose-500/30 ring-4 ring-white">
          ⚠️
        </div>

        <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-100 to-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-700">
          Something went wrong
        </span>

        <h1 className="mt-4 text-3xl font-bold text-gray-900 md:text-4xl">
          We hit{" "}
          <span className="bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 bg-clip-text text-transparent">
            an unexpected snag
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-gray-600">
          Our team has been notified and will look into it shortly. You can
          retry the action, or head back to the home page.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 via-teal-600 to-emerald-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition-all hover:scale-105"
          >
            ↻ Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-7 py-3 text-sm font-semibold text-gray-700 transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
          >
            Go to home
          </Link>
        </div>

        {error.digest && (
          <p className="mt-8 text-xs text-gray-400">
            Ref: <span className="font-mono">{error.digest}</span>
          </p>
        )}
      </div>
    </main>
  );
}
