"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// Status codes set by /api/auth/verify when it can't complete the flow:
//   missing  — no token param
//   invalid  — token not in store (already used, server restarted, etc.)
//   expired  — token existed but older than 10 min
// Success path redirects to /auth/login?verified=1 instead, so this page
// only ever renders the failure states.

function VerifyResult() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") || "invalid";

  const copy: Record<string, { title: string; body: string }> = {
    missing: {
      title: "No verification token",
      body: "The link you used doesn't contain a verification token. Please open the most recent email we sent you.",
    },
    invalid: {
      title: "This link is no longer valid",
      body: "It may have already been used, or a newer verification email was sent. Try signing in again — we'll email you a fresh link if needed.",
    },
    expired: {
      title: "This link has expired",
      body: "Verification links expire after 10 minutes for your security. Sign in again and we'll send a fresh link.",
    },
  };

  const c = copy[status] || copy.invalid;

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo.svg"
          alt="OduDoc"
          width={440}
          height={108}
          className="mx-auto mb-6 h-14 w-auto"
        />
      </div>
      <div className="rounded-2xl bg-white p-8 shadow-lg text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <svg
            className="h-7 w-7 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86l-7.54 13a1 1 0 0 0 .86 1.5h17.08a1 1 0 0 0 .86-1.5l-7.54-13a1 1 0 0 0-1.72 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{c.title}</h1>
        <p className="mt-2 text-sm text-gray-600">{c.body}</p>

        <div className="mt-6 flex flex-col gap-2">
          <Link href="/auth/login" className="btn-primary w-full">
            Back to sign in
          </Link>
          <Link
            href="/auth/register"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Create a new account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-gray-50 px-4 py-12">
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <svg
              className="h-8 w-8 animate-spin text-primary-600"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        }
      >
        <VerifyResult />
      </Suspense>
    </div>
  );
}
