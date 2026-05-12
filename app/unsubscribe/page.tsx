// Public unsubscribe landing page. Two modes:
//   1. Linked from a newsletter email — `?email=foo@bar.com&ok=1` lands here
//      after the API has already flipped the active flag. We just confirm.
//   2. Self-serve — visitor types their email into the form, we POST to the
//      unsubscribe endpoint and confirm.
//
// Kept deliberately tiny. No auth, no design system pieces beyond Tailwind —
// the email program just needs the link to resolve to something polite.

"use client";

import { useEffect, useState } from "react";

export default function UnsubscribePage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState<null | "ok" | "error">(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("ok") === "1") setDone("ok");
    const e = url.searchParams.get("email");
    if (e) setEmail(e);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDone(null);
    try {
      const res = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("failed");
      setDone("ok");
    } catch {
      setDone("error");
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Unsubscribe from OduDoc emails</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
        We&rsquo;ll stop sending blog updates and product announcements to your inbox. Account-related
        emails (verification, appointment confirmations, password resets) will still go through.
      </p>

      {done === "ok" ? (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          You&rsquo;ve been unsubscribed. We&rsquo;re sorry to see you go.
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            Email address
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            Unsubscribe
          </button>
          {done === "error" && (
            <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
          )}
        </form>
      )}

      <p className="mt-8 text-center text-xs text-gray-400 dark:text-slate-500">
        <a href="/" className="hover:text-gray-600 dark:text-slate-300">&larr; Back to OduDoc</a>
      </p>
    </main>
  );
}
