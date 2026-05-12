"use client";

// BAA / DPA re-acceptance prompt.
//
// Mounts at the top of the doctor dashboard. Renders nothing if the
// doctor's most recent acceptance matches the current published
// version for their jurisdiction. When wording changes (we bump
// CURRENT_VERSIONS in lib/doctor-baa-store.ts), this surfaces a
// prominent prompt with the new summary and a typed-name signature
// input — clicking through writes a fresh row to the audit log so we
// always have a defensible artefact tied to the current text.

import { useEffect, useState } from "react";

interface BaaState {
  framework: "HIPAA_BAA" | "GDPR_DPA" | "GENERIC_DPA";
  currentVersion: string;
  needsAcceptance: boolean;
  title: string;
  summary: string;
}

export default function BaaReacceptancePrompt() {
  const [state, setState] = useState<BaaState | null>(null);
  const [signature, setSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/doctors/me/baa", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled) return;
        if (j && j.needsAcceptance) setState(j as BaaState);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!state || done) return null;

  const submit = async () => {
    if (signature.trim().length < 2) {
      setError("Type your full name to continue");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/doctors/me/baa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || `Failed (${r.status})`);
        return;
      }
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="overflow-hidden rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 shadow-sm"
      role="alert"
      aria-live="polite"
    >
      <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
      <div className="p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-800">
            ⚠ Action required
          </span>
          <span className="text-xs text-gray-500 dark:text-slate-400">
            Updated {state.currentVersion}
          </span>
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
          New version of the {state.title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-slate-300">{state.summary}</p>
        <div className="mt-4">
          <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-slate-300">
            Type your full name to accept the updated agreement *
          </label>
          <input
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Dr. Your Name"
            className="w-full max-w-sm rounded-xl border-2 border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
          />
        </div>
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        <div className="mt-3">
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-lg bg-gradient-to-r from-primary-600 via-teal-600 to-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
          >
            {busy ? "Recording…" : "Accept updated agreement"}
          </button>
        </div>
      </div>
    </section>
  );
}
