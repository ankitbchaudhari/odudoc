"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

function SuccessContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-gray-50 px-4 py-16">
      <div className="w-full max-w-lg text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-12 w-12 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Logo */}
        <div className="mb-6">
          <Image
            src="/images/logo.svg"
            alt="OduDoc"
            width={440}
            height={108}
            className="mx-auto h-10 w-auto"
          />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-gray-900">
          Application Submitted!
        </h1>
        <p className="mt-3 text-lg text-gray-600">
          Thank you for applying to join OduDoc as a doctor.
        </p>

        {/* Application ID */}
        {id && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Your Application ID</p>
            <p className="mt-1 font-mono text-base font-semibold text-primary-700">
              {id}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Save this ID to track your application status.
            </p>
          </div>
        )}

        {/* What happens next */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-left">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            What happens next?
          </h2>
          <ol className="space-y-3">
            {[
              {
                step: "1",
                title: "Document Verification",
                desc: "Our team will review your submitted documents within 2–3 business days.",
              },
              {
                step: "2",
                title: "Background Check",
                desc: "We verify your medical license and credentials with the relevant authorities.",
              },
              {
                step: "3",
                title: "Approval & Onboarding",
                desc: "Once approved, you'll receive an email with login credentials and onboarding instructions.",
              },
            ].map((item) => (
              <li key={item.step} className="flex gap-4">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                  {item.step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {item.title}
                  </p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Info box */}
        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-800">
          <p>
            📧 A confirmation email will be sent to the email address you
            provided. Please check your inbox (and spam folder).
          </p>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Go to Homepage
          </Link>
          <Link
            href="/for-doctors"
            className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Learn More for Doctors
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DoctorRegisterSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
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
      <SuccessContent />
    </Suspense>
  );
}
