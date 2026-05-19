"use client";

// Patient view of their lab samples (the ones tracked by the new
// lab-samples-store — separate from the legacy lab-reports vault).

import { useEffect, useState } from "react";

type Status = "collected" | "received" | "processing" | "verified" | "reported";

interface Sample {
  id: string;
  accession?: string;
  testClass: string;
  tests: string[];
  status: Status;
  result?: string;
  critical?: boolean;
  custody: Array<{ at: string; status: Status; location?: string }>;
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

export default function LabSamplesPatientPage() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/patient/lab-samples", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setSamples(j.samples || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Your lab samples</p>
      <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Lab samples in progress</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Every sample collected from you, with its current status and custody chain. PDF reports for completed
        results land in your <a className="text-violet-600 hover:underline" href="/dashboard/laboratory">laboratory vault</a>.
      </p>

      <section className="mt-6 space-y-3">
        {loading && samples.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            Loading…
          </p>
        ) : samples.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            No samples yet. When a lab collects a sample from you it appears here.
          </p>
        ) : (
          samples.map((s) => (
            <article key={s.id} className={`rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 ${s.critical ? "border-rose-300 dark:border-rose-700" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900 dark:text-slate-100">{s.testClass.replace(/_/g, " ")}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_PALETTE[s.status]}`}>
                      {s.status}
                    </span>
                    {s.critical && (
                      <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Critical · doctor notified
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{s.tests.join(", ")}</p>
                  {s.accession && <p className="mt-0.5 font-mono text-[11px] text-slate-500">Accession: {s.accession}</p>}
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Collected {new Date(s.createdAt).toLocaleString()}
                    {s.reportedAt && <> · Reported {new Date(s.reportedAt).toLocaleString()}</>}
                  </p>
                </div>
              </div>

              {s.result && (
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Result</p>
                  <p className="mt-1 whitespace-pre-wrap">{s.result}</p>
                </div>
              )}

              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-slate-500">
                  Custody chain ({s.custody.length} hop{s.custody.length === 1 ? "" : "s"})
                </summary>
                <ol className="mt-2 space-y-1">
                  {s.custody.map((h, i) => (
                    <li key={i} className="rounded-md bg-slate-50 px-3 py-1.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <strong>{h.status}</strong>{h.location && <> · {h.location}</>} · {new Date(h.at).toLocaleString()}
                    </li>
                  ))}
                </ol>
              </details>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
