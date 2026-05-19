"use client";

// Patient medical-tourism dashboard. Lists corridors + your active
// quote requests + lets you start a new quote.

import { useCallback, useEffect, useState } from "react";

interface Corridor {
  id: string;
  origin: string;
  destination: string;
  label: string;
  blurb: string;
  savingsPercent: number;
  procedureSlugs: string[];
  visaContact?: string;
  active: boolean;
}

type QuoteStatus = "requested" | "consult_scheduled" | "quoted" | "accepted" | "declined" | "expired";

interface Quote {
  id: string;
  procedureSlug: string;
  corridorId: string;
  hospitalId: string;
  status: QuoteStatus;
  quotedUsd?: number;
  scheduledFor?: string;
  createdAt: string;
}

const STATUS_PALETTE: Record<QuoteStatus, string> = {
  requested: "bg-sky-100 text-sky-800",
  consult_scheduled: "bg-indigo-100 text-indigo-800",
  quoted: "bg-emerald-100 text-emerald-800",
  accepted: "bg-emerald-200 text-emerald-900",
  declined: "bg-rose-100 text-rose-800",
  expired: "bg-slate-200 text-slate-700",
};

export default function MedicalTourismDashPage() {
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<Corridor | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Corridors aren't exposed via a list endpoint yet — the public
      // /medical-tourism page hardcodes them; here we just fetch the
      // patient's quotes. If corridors API ships later we'd plug it in.
      const r = await fetch("/api/medical-tourism/quotes", { cache: "no-store" });
      const j = await r.json();
      setQuotes(j.quotes || []);
      // Seed the same three corridors the public page documents.
      setCorridors([
        { id: "tc-in-th", origin: "IN", destination: "TH", label: "India → Thailand", blurb: "JCI-accredited Bangkok hospitals.", savingsPercent: 50, procedureSlugs: ["knee-replacement", "cardiac-bypass", "cosmetic-rhinoplasty"], active: true },
        { id: "tc-us-in", origin: "US", destination: "IN", label: "US → India", blurb: "NABH / JCI hospitals across Mumbai, Delhi, Chennai.", savingsPercent: 87, procedureSlugs: ["cardiac-bypass", "knee-replacement", "hip-replacement", "ivf", "dental-implants"], active: true },
        { id: "tc-ae-in", origin: "AE", destination: "IN", label: "UAE → India", blurb: "Direct flights, NRI surgeon network.", savingsPercent: 70, procedureSlugs: ["liver-transplant", "kidney-transplant", "oncology-pkg"], active: true },
      ]);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-600">Medical tourism</p>
      <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Surgery abroad — managed</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Request a quote for a procedure in any of the corridors below. Escrow + pre-flight video consult are wired
        once the destination hospital sends a locked quote.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Your quote requests</h2>
        <div className="mt-3 space-y-2">
          {loading && quotes.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              Loading…
            </p>
          ) : quotes.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              No active quote requests. Tap a corridor below to start one.
            </p>
          ) : (
            quotes.map((q) => {
              const corridor = corridors.find((c) => c.id === q.corridorId);
              return (
                <div key={q.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{q.procedureSlug.replace(/-/g, " ")}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_PALETTE[q.status]}`}>
                        {q.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {corridor?.label || q.corridorId}
                      {q.quotedUsd && <> · Quoted ${q.quotedUsd.toLocaleString()}</>}
                      {q.scheduledFor && <> · Consult {new Date(q.scheduledFor).toLocaleDateString()}</>}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Available corridors</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {corridors.map((c) => (
            <article key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-600">{c.label}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{c.blurb}</p>
              <p className="mt-2 text-2xl font-extrabold text-emerald-600">~{c.savingsPercent}% savings</p>
              <p className="mt-2 text-[11px] text-slate-500">
                Procedures: {c.procedureSlugs.slice(0, 3).join(", ")}{c.procedureSlugs.length > 3 ? "…" : ""}
              </p>
              <button
                onClick={() => setRequesting(c)}
                className="mt-3 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-2 text-sm font-bold text-white"
              >
                Request a quote
              </button>
            </article>
          ))}
        </div>
      </section>

      {requesting && (
        <RequestModal corridor={requesting} onClose={() => setRequesting(null)} onDone={() => { setRequesting(null); refresh(); }} />
      )}
    </main>
  );
}

function RequestModal({ corridor, onClose, onDone }: { corridor: Corridor; onClose: () => void; onDone: () => void }) {
  const [procedure, setProcedure] = useState(corridor.procedureSlugs[0] || "");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/medical-tourism/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          procedureSlug: procedure,
          corridorId: corridor.id,
          notes: notes || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Failed"); return; }
      onDone();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-bold uppercase tracking-wider text-cyan-600">{corridor.label}</p>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Request a quote</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          A destination hospital will review your case and send a locked quote within 48 hours.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Procedure</span>
            <select value={procedure} onChange={(e) => setProcedure(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              {corridor.procedureSlugs.map((p) => <option key={p} value={p}>{p.replace(/-/g, " ")}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Notes (optional)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              placeholder="Brief history, prior records, urgency…" />
          </label>
          {error && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700">
              Cancel
            </button>
            <button onClick={submit} disabled={busy}
              className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-bold text-white shadow disabled:opacity-60">
              {busy ? "Sending…" : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
