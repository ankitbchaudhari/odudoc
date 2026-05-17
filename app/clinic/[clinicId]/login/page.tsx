"use client";

// Clinic staff login. URL: /clinic/CL-1001/login
// Receptionists / assistants / managers sign in here with credentials
// the owning doctor created. Successful login sets the clinic-session
// cookie and redirects to /clinic/CL-1001/dashboard.

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ClinicLoginPage() {
  const params = useParams<{ clinicId: string }>();
  const router = useRouter();
  const clinicId = params.clinicId;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/clinic/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId, email, password }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error || "Login failed");
        return;
      }
      router.push(`/clinic/${clinicId}/dashboard`);
    } finally {
      setBusy(false);
    }
  };

  const inputBase =
    "w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 shadow-sm placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition";

  return (
    <main className="relative mx-auto flex min-h-[80vh] max-w-md items-center px-4 py-10">
      {/* Ambient gradient blob */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-[34rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-400/30 via-fuchsia-400/30 to-emerald-300/30 blur-3xl dark:from-indigo-600/30 dark:via-fuchsia-600/30 dark:to-emerald-500/20" />
      </div>

      <div className="w-full overflow-hidden rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-indigo-500/5 dark:shadow-black/40">
        {/* Hero */}
        <header className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 pt-6 pb-7 text-white">
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
              Clinic staff portal
            </p>
            <h1 className="mt-1 text-2xl font-bold">Staff sign-in</h1>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/25">
              <span>🏥</span>
              <span>Clinic</span>
              <span className="font-mono text-white/90">{clinicId}</span>
            </div>
            <p className="mt-3 text-xs text-white/75">
              Receptionists, assistants, and managers — sign in to look up bookings, save EMR, and manage invoices.
            </p>
          </div>
          {/* Decorative rings */}
          <div className="pointer-events-none absolute -right-12 -bottom-12 h-40 w-40 rounded-full border-2 border-white/10" />
          <div className="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full border border-white/5" />
        </header>

        <form onSubmit={submit} className="space-y-4 px-6 py-6">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Email</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@odudoc.com"
              className={inputBase}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputBase}
            />
          </label>

          {err && (
            <p className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
              {err}
            </p>
          )}

          <button
            disabled={busy}
            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <span className="relative z-10">{busy ? "Signing in…" : "Sign in →"}</span>
            <span className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>

          {/* Role hint chips — communicates that this single sign-in
              serves all three role tiers without giving anyone the
              impression they can self-select their permissions. */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            <span className="rounded-full bg-sky-100 dark:bg-sky-950/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-sky-700 dark:text-sky-300">
              👋 Receptionist
            </span>
            <span className="rounded-full bg-violet-100 dark:bg-violet-950/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-700 dark:text-violet-300">
              🩺 Assistant
            </span>
            <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300">
              🏷️ Manager
            </span>
          </div>
        </form>

        <p className="border-t border-gray-100 dark:border-slate-800 px-6 py-4 text-center text-xs text-gray-500 dark:text-slate-400">
          🔒 Lost access? Ask the doctor who runs this clinic to{" "}
          <Link href="/dashboard/doctor/clinic" className="text-indigo-600 dark:text-indigo-300 hover:underline">
            reset your account
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
