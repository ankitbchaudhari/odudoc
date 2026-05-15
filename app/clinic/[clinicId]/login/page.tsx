"use client";

// Clinic staff login. URL: /clinic/CL-1001/login
// Receptionists / assistants / managers sign in here with credentials
// the owning doctor created. Successful login sets the clinic-session
// cookie and redirects to /c/CL-1001/reception.

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

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

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md items-center px-4 py-10">
      <div className="w-full rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">Clinic reception sign-in</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Clinic <span className="font-mono">{clinicId}</span>
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Email</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
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
              className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </label>

          {err && <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{err}</p>}

          <button disabled={busy} className="btn-primary w-full disabled:opacity-60">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400 dark:text-slate-500">
          Lost access? Ask the doctor who runs this clinic to reset your account.
        </p>
      </div>
    </main>
  );
}
