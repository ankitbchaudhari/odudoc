"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") || "N/A";
  const doctorName = searchParams.get("doctor") || "Your Doctor";
  const timeSlot = searchParams.get("time") || "Scheduled";
  const amount = searchParams.get("amount") || "0";

  return (
    <div className="bg-gray-50 dark:bg-slate-900 py-16">
      <div className="mx-auto max-w-lg px-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-8 shadow-sm">
          {/* Animated Checkmark */}
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-12 w-12 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
                style={{
                  strokeDasharray: 30,
                  strokeDashoffset: 0,
                  animation: "checkmark 0.6s ease-in-out",
                }}
              />
            </svg>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              Payment Successful!
            </h1>
            <p className="mt-2 text-gray-500 dark:text-slate-400">
              Your appointment has been booked and confirmed.
            </p>
          </div>

          {/* Booking Details */}
          <div className="mt-8 rounded-lg bg-gray-50 dark:bg-slate-900 p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-slate-100">
              Booking Details
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-slate-400">Booking Reference</span>
                <span className="font-mono font-semibold text-primary-600">
                  {bookingId}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-slate-400">Doctor</span>
                <span className="font-medium text-gray-900 dark:text-slate-100">{doctorName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-slate-400">Time Slot</span>
                <span className="font-medium text-gray-900 dark:text-slate-100">{timeSlot}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-slate-800 pt-3">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-gray-900 dark:text-slate-100">Amount Paid</span>
                  <span className="text-green-600">${amount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Receipt Note */}
          <p className="mt-4 text-center text-xs text-gray-400 dark:text-slate-500">
            A receipt has been sent to your registered email address.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="/dashboard/payments"
              className="btn-primary flex-1 text-center"
            >
              View My Bookings
            </a>
            <a
              href="/"
              className="flex-1 rounded-lg border border-gray-300 dark:border-slate-700 px-6 py-2.5 text-center text-sm font-semibold text-gray-700 dark:text-slate-300 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes checkmark {
          0% {
            stroke-dashoffset: 30;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
