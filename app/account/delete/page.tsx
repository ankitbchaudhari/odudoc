// /account/delete
//
// Web fallback for users who can't open the app (uninstalled, lost
// phone, etc). Apple still expects an in-app delete flow but having
// a public URL satisfies Play Store's separate "account-deletion URL"
// field on every healthcare app listing.
//
// Behaviour mirrors the mobile flow: type password, type "DELETE",
// hit submit, account is tombstoned via /api/account/delete.

"use client";

import { useState } from "react";
import Link from "next/link";

export default function DeleteAccountPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (confirm.trim().toUpperCase() !== "DELETE") {
      setError('Please type DELETE in the confirmation box (all capitals).');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password, confirm }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(
          j.error === "invalid_password"
            ? "That password didn't match. Try again."
            : j.error === "unauthenticated"
            ? "You need to sign in first to delete your account."
            : j.error === "user_not_found"
            ? "We couldn't find your account — it may already be deleted."
            : "Something went wrong. Email privacy@odudoc.com and we'll handle it manually."
        );
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Account deleted</h1>
        <p className="mb-6 text-sm text-gray-600">
          Your OduDoc account has been removed. Clinical records may be retained
          for the period required by healthcare law (typically 7 years) in
          pseudonymised form, per our{" "}
          <Link className="text-primary-600 underline" href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
        <Link href="/" className="btn-primary !text-sm">
          Return to homepage
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Delete your account</h1>
      <p className="mb-6 text-sm text-gray-600">
        This permanently removes your OduDoc login. You won&apos;t be able to recover
        it. Read what happens to your data on our{" "}
        <Link className="text-primary-600 underline" href="/privacy#retention">
          retention page
        </Link>
        .
      </p>

      <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <strong className="block mb-1">Before you delete:</strong>
        <ul className="list-disc pl-5 space-y-1 text-xs">
          <li>Cancel any active subscriptions in the app (delete here doesn&apos;t cancel store billing).</li>
          <li>Download your medical records — they&apos;ll become inaccessible to you.</li>
          <li>If you&apos;re a doctor with open consultations, complete or reassign them first.</li>
        </ul>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
            Current password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
            Type <span className="font-mono text-red-600">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            placeholder="DELETE"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? "Deleting…" : "Permanently delete my account"}
        </button>
        <Link
          href="/"
          className="block text-center text-xs text-gray-500 hover:text-gray-700"
        >
          Never mind, take me back
        </Link>
      </form>
    </div>
  );
}
