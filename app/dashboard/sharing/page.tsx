"use client";

// Patient sharing dashboard.
//
// Mint time-limited share tokens for parts of the medical record,
// see active and expired shares, revoke any. Every access of a share
// (when the recipient opens the link) shows up in the access log
// below the row.

import { useCallback, useEffect, useState } from "react";

type Scope = "consultations" | "prescriptions" | "lab_reports" | "radiology" | "vitals" | "vaccinations";

interface ShareToken {
  token: string;
  consumerLabel?: string;
  consumerEmail?: string;
  scopes: Scope[];
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
  accesses: Array<{ at: string; ipFingerprint?: string; userAgent?: string }>;
}

const SCOPE_LABEL: Record<Scope, { label: string; emoji: string }> = {
  consultations: { label: "Consultations", emoji: "🩺" },
  prescriptions: { label: "Prescriptions", emoji: "💊" },
  lab_reports:   { label: "Lab reports", emoji: "🧪" },
  radiology:     { label: "Radiology", emoji: "🩻" },
  vitals:        { label: "Vitals", emoji: "❤️" },
  vaccinations:  { label: "Vaccinations", emoji: "💉" },
};

export default function SharingDashboardPage() {
  const [shares, setShares] = useState<ShareToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/share-tokens", { cache: "no-store" });
      const j = await r.json();
      setShares(j.shares || []);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const revoke = async (token: string) => {
    if (!confirm("Revoke this share? The recipient won't be able to open the link any more.")) return;
    await fetch(`/api/share-tokens/${encodeURIComponent(token)}`, { method: "DELETE" });
    refresh();
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Sharing</p>
      <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Share your record</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Generate a time-limited link to a slice of your record. Anyone with the link can view (not edit)
        what you unlock. Every visit is logged below.
      </p>

      <button
        onClick={() => setCreating(true)}
        className="mt-6 inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg"
      >
        + New share
      </button>

      <section className="mt-8 space-y-3">
        {loading && shares.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            Loading…
          </p>
        ) : shares.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            No shares yet. Use the button above to create your first time-limited link.
          </p>
        ) : (
          shares.map((s) => {
            const url = `${origin}/share/${s.token}`;
            const expired = new Date(s.expiresAt).getTime() < Date.now();
            const active = !s.revokedAt && !expired;
            return (
              <article key={s.token} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900 dark:text-slate-100">
                        {s.consumerLabel || s.consumerEmail || "Unnamed share"}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        active ? "bg-emerald-100 text-emerald-800" :
                        s.revokedAt ? "bg-rose-100 text-rose-800" :
                        "bg-slate-200 text-slate-700"
                      }`}>
                        {active ? "Active" : s.revokedAt ? "Revoked" : "Expired"}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {s.scopes.map((sc) => (
                        <span key={sc} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {SCOPE_LABEL[sc]?.emoji} {SCOPE_LABEL[sc]?.label}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      Created {new Date(s.createdAt).toLocaleString()} ·{" "}
                      {active
                        ? `Expires ${new Date(s.expiresAt).toLocaleString()}`
                        : s.revokedAt
                          ? `Revoked ${new Date(s.revokedAt).toLocaleString()}`
                          : `Expired ${new Date(s.expiresAt).toLocaleString()}`}
                      {" · "}{s.accesses.length} access{s.accesses.length === 1 ? "" : "es"}
                    </p>
                    {active && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          readOnly
                          value={url}
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        />
                        <button
                          onClick={() => { navigator.clipboard?.writeText(url); }}
                          className="rounded-md bg-slate-800 px-2 py-1 text-[11px] font-bold text-white"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                  {active && (
                    <button
                      onClick={() => revoke(s.token)}
                      className="rounded-md bg-rose-600 px-3 py-1 text-xs font-bold text-white"
                    >
                      Revoke
                    </button>
                  )}
                </div>
                {s.accesses.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-[11px] font-semibold text-slate-500">
                      Access log ({s.accesses.length})
                    </summary>
                    <ul className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                      {s.accesses.map((a, i) => (
                        <li key={i} className="rounded-lg bg-slate-50 px-2 py-1 dark:bg-slate-800">
                          {new Date(a.at).toLocaleString()}
                          {a.ipFingerprint && <> · device {a.ipFingerprint.slice(0, 8)}…</>}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </article>
            );
          })
        )}
      </section>

      {creating && <CreateModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); refresh(); }} />}
    </main>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const allScopes = Object.keys(SCOPE_LABEL) as Scope[];
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [validHours, setValidHours] = useState(168); // 7 days default
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (s: Scope) => {
    setScopes((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/share-tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scopes,
          consumerLabel: label || undefined,
          consumerEmail: email || undefined,
          validHours,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Failed"); return; }
      onCreated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">New share</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Pick what to share + how long the link should work.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Categories</p>
            <div className="grid grid-cols-2 gap-1">
              {allScopes.map((s) => (
                <label key={s} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  scopes.includes(s) ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30" : "border-slate-200 dark:border-slate-700"
                }`}>
                  <input
                    type="checkbox"
                    checked={scopes.includes(s)}
                    onChange={() => toggle(s)}
                    className="h-4 w-4"
                  />
                  <span>{SCOPE_LABEL[s].emoji} {SCOPE_LABEL[s].label}</span>
                </label>
              ))}
            </div>
          </div>

          <Field label="Recipient label (your reference)">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Dr. Sharma at Apollo"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </Field>

          <Field label="Recipient email (optional · we'll email them the link)">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="them@example.com"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </Field>

          <Field label="Valid for">
            <select value={validHours} onChange={(e) => setValidHours(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value={1}>1 hour</option>
              <option value={24}>24 hours</option>
              <option value={72}>3 days</option>
              <option value={168}>7 days</option>
              <option value={720}>30 days</option>
            </select>
          </Field>

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700">
              Cancel
            </button>
            <button onClick={submit} disabled={busy || scopes.length === 0}
              className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-bold text-white shadow disabled:opacity-60">
              {busy ? "Creating…" : "Create share"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}
