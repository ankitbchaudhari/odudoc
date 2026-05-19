"use client";

// Lab samples board for the tenant. Shows every active sample with
// the current status, custody-enforcement flag (chain-of-custody
// for paternity / drug testing / blood bank), and the full custody
// hop log.

import { useCallback, useEffect, useState } from "react";

type Status = "collected" | "received" | "processing" | "verified" | "reported";

interface CustodyHop {
  at: string;
  actor: string;
  status: Status;
  location?: string;
  signature?: string;
}

interface Sample {
  id: string;
  accession?: string;
  patientEmail: string;
  patientName: string;
  testClass: string;
  tests: string[];
  custody: CustodyHop[];
  custodyEnforced: boolean;
  status: Status;
  result?: string;
  critical?: boolean;
  reportedAt?: string;
  createdAt: string;
}

const STATUS_PALETTE: Record<Status, string> = {
  collected: "bg-sky-100 text-sky-800",
  received: "bg-indigo-100 text-indigo-800",
  processing: "bg-violet-100 text-violet-800",
  verified: "bg-amber-100 text-amber-900",
  reported: "bg-emerald-100 text-emerald-800",
};

export default function LabSamplesPage() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Sample | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/lab/samples", { cache: "no-store" });
      const j = await r.json();
      setSamples(j.samples || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <main className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Lab · Samples</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Sample tracking</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Every sample from collection through reported result. Custody-enforced samples (paternity, drug
          testing, blood bank) require signed hops at every transition.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading && samples.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">Loading…</p>
        ) : samples.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No samples yet. They appear here when the collection desk barcodes a tube.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {samples.map((s) => (
              <li
                key={s.id}
                onClick={() => setSelected(s)}
                className={`cursor-pointer p-4 hover:bg-slate-50 dark:hover:bg-slate-800 ${s.critical ? "bg-rose-50/40 dark:bg-rose-950/20" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{s.patientName}</p>
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {s.accession || s.id}
                      </code>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_PALETTE[s.status]}`}>
                        {s.status}
                      </span>
                      {s.custodyEnforced && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                          Chain of custody
                        </span>
                      )}
                      {s.critical && (
                        <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white animate-pulse">
                          CRITICAL
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">
                      {s.testClass} · {s.tests.length} test{s.tests.length === 1 ? "" : "s"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Collected {new Date(s.createdAt).toLocaleString()} · {s.custody.length} custody hop{s.custody.length === 1 ? "" : "s"}
                      {s.reportedAt && <> · Reported {new Date(s.reportedAt).toLocaleString()}</>}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50" onClick={() => setSelected(null)}>
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{selected.testClass}</p>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selected.patientName}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">{selected.tests.join(", ")}</p>
                {selected.accession && <p className="mt-1 font-mono text-xs text-slate-500">Accession: {selected.accession}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="text-2xl text-slate-400">×</button>
            </div>

            {selected.result && (
              <section className={`mt-4 rounded-xl border p-3 ${selected.critical ? "border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/30" : "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"}`}>
                <p className="text-xs font-bold uppercase tracking-wider">Result {selected.critical && <span className="text-rose-700">· CRITICAL</span>}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{selected.result}</p>
              </section>
            )}

            <section className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Custody chain</p>
              <ol className="mt-2 space-y-2">
                {selected.custody.map((h, i) => (
                  <li key={i} className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_PALETTE[h.status]}`}>
                        {h.status}
                      </span>
                      {h.signature && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">Signed</span>}
                    </div>
                    <p className="mt-1 text-slate-900 dark:text-slate-100">
                      {h.actor}{h.location && <> · {h.location}</>}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{new Date(h.at).toLocaleString()}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
