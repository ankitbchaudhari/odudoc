"use client";

// Tamper-evident audit chain integrity check.
// Surfaces the chain head + a green/red verify badge. Manual
// "Run verification" button kicks off a full walk; production
// uses a monthly cron.

import { useEffect, useState } from "react";

interface ChainHead {
  seq: number;
  hash: string;
  length: number;
}

type Verification =
  | { ok: true }
  | { ok: false; failedAtSeq: number; expected: string; actual: string };

export default function AuditChainPage() {
  const [head, setHead] = useState<ChainHead | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/audit-chain", { cache: "no-store" });
      const j = await r.json();
      setHead(j.head);
      setVerification(j.verification);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh(); }, []);

  const reverify = async () => {
    setBusy(true);
    try { await refresh(); } finally { setBusy(false); }
  };

  return (
    <main className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Compliance · Audit chain</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Tamper-evident audit envelope</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Append-only SHA-256 chain over every PHI access. If any historical entry has been tampered with,
          every subsequent hash diverges from the recomputed chain — surfaced here as a red banner.
        </p>
      </header>

      {loading && !head ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
          Loading…
        </p>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <Stat label="Chain length" value={head ? `${head.length.toLocaleString()}` : "0"} sub="envelopes sealed" />
            <Stat label="Latest seq" value={head ? `#${head.seq}` : "—"} sub="most recent envelope" />
            <Stat label="Head hash" value={head ? `${head.hash.slice(0, 12)}…` : "—"} sub="SHA-256 (truncated)" mono />
          </section>

          <section className={`rounded-3xl border-2 p-6 ${verification?.ok ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30" : "border-rose-400 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/30"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-3xl">{verification?.ok ? "✅" : "🚨"}</p>
                <h2 className={`mt-2 text-xl font-bold ${verification?.ok ? "text-emerald-900 dark:text-emerald-100" : "text-rose-900 dark:text-rose-100"}`}>
                  {verification?.ok ? "Chain integrity OK" : `Tamper detected at envelope #${(verification as { failedAtSeq: number } | null)?.failedAtSeq}`}
                </h2>
                <p className={`mt-1 text-sm ${verification?.ok ? "text-emerald-800 dark:text-emerald-200" : "text-rose-800 dark:text-rose-200"}`}>
                  {verification?.ok
                    ? "Every envelope hash matches what we'd compute from its predecessor + entry bytes. No historical entries have been modified."
                    : "One or more envelopes' hashes disagree with the recomputed chain. This means a row was edited after seal. Quarantine writes + investigate immediately."}
                </p>
                {verification && !verification.ok && (
                  <div className="mt-3 space-y-1 font-mono text-[11px] text-rose-900 dark:text-rose-200">
                    <p>Expected: {(verification as { expected: string }).expected.slice(0, 32)}…</p>
                    <p>Actual:   {(verification as { actual: string }).actual.slice(0, 32)}…</p>
                  </div>
                )}
              </div>
              <button
                onClick={reverify}
                disabled={busy}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow disabled:opacity-60"
              >
                {busy ? "Verifying…" : "Re-verify chain"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <p className="font-semibold text-slate-700 dark:text-slate-200">How this works</p>
            <p className="mt-1">
              Every envelope sequences itself with <code>seq</code>, includes the previous envelope&apos;s hash,
              and binds to the canonical-JSON of the entry. Walking the chain recomputes each hash; any
              difference means a row was edited post-seal. Public anchoring (daily root hash posted to a
              regulator&apos;s endpoint) is a separate add-on.
            </p>
          </section>
        </>
      )}
    </main>
  );
}

function Stat({ label, value, sub, mono }: { label: string; value: string; sub: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100 ${mono ? "font-mono" : ""}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{sub}</p>
    </div>
  );
}
