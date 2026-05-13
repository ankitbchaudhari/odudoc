"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setResult(
          data.message ||
            "If an account exists for that email, we've sent a reset link."
        );
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-xl ring-1 ring-gray-100">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-700">
            🔒 Reset password
          </span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-slate-100">
            Forgot your password?
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            Enter your email and we&apos;ll send you a link to set a new one.
            The link expires in 30 minutes.
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Email address
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border-2 border-gray-200 dark:border-slate-800 p-3 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </div>
          )}
          {result && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {result}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-slate-400">
          Remembered it?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-primary-600 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
