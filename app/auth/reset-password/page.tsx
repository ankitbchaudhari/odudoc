"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function ResetPasswordInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";

  const [validState, setValidState] = useState<
    "checking" | "valid" | "invalid"
  >("checking");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setValidState("invalid");
      return;
    }
    let cancelled = false;
    void fetch(
      `/api/auth/reset-password?token=${encodeURIComponent(token)}`
    )
      .then((r) => r.json())
      .then((d: { valid?: boolean; email?: string }) => {
        if (cancelled) return;
        if (d.valid) {
          setValidState("valid");
          setEmail(d.email || "");
        } else {
          setValidState("invalid");
        }
      })
      .catch(() => !cancelled && setValidState("invalid"));
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Reset failed.");
      } else {
        setDone(true);
        setTimeout(() => router.push("/auth/login"), 2500);
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
            🔐 New password
          </span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-slate-100">
            Set a new password
          </h1>
          {validState === "valid" && email && (
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
              For{" "}
              <span className="font-semibold text-gray-700 dark:text-slate-300">{email}</span>
            </p>
          )}
        </div>

        {validState === "checking" && (
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-slate-400">
            Checking link…
          </p>
        )}

        {validState === "invalid" && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            This reset link is invalid or has expired. Please{" "}
            <Link
              href="/auth/forgot-password"
              className="font-semibold underline"
            >
              request a new one
            </Link>
            .
          </div>
        )}

        {validState === "valid" && !done && (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                New password
              </span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-xl border-2 border-gray-200 dark:border-slate-800 p-3 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Confirm new password
              </span>
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 dark:border-slate-800 p-3 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
              />
            </label>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Update password"}
            </button>
          </form>
        )}

        {done && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Your password has been updated. Redirecting you to sign in…
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-slate-400">Loading…</p>
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
