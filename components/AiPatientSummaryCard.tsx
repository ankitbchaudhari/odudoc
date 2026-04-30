"use client";

// AI summary card shown at the top of an EMR patient chart. Triggers a
// fetch on mount, then again on demand via the "Refresh" button. Designed
// to be glanceable: doctor reads it for ~5 seconds and gets the gist.

import { useCallback, useEffect, useState } from "react";

interface SourcedPoint {
  text: string;
  source?: string;
}

interface PatientSummary {
  headline: string;
  keyPoints: SourcedPoint[];
  redFlags: SourcedPoint[];
  suggestedFocus: string;
  generatedAt: string;
}

function sourceLabel(s?: string): string | null {
  if (!s) return null;
  if (s === "demographics") return "Chart header";
  if (s === "files") return "Uploaded files";
  // ISO date — shorten to "Apr 12"
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    try {
      return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return s;
    }
  }
  return s;
}

interface Props {
  patientId: string;
  /** Bumped by the parent when significant chart data changes (visit
   *  added, file uploaded, demographics edited) so the card auto-
   *  refreshes instead of showing stale insights. */
  staleKey?: string | number;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "just now";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  return `${Math.floor(hr / 24)} d ago`;
}

export default function AiPatientSummaryCard({ patientId, staleKey }: Props) {
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/emr/patients/${patientId}/summary`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSummary(data.summary);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load, staleKey]);

  return (
    <div className="mb-6 overflow-hidden rounded-3xl border border-violet-200/70 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/60 p-6 shadow-xl shadow-violet-500/10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-md shadow-violet-500/40">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17 9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">AI chart summary</h2>
            <p className="text-xs text-slate-500">
              {loading
                ? "Reading the chart…"
                : summary
                  ? `Generated ${relativeTime(summary.generatedAt)} · decision support, not diagnosis`
                  : "Decision support — never replaces clinical judgement"}
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-60"
        >
          <svg className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" />
          </svg>
          {loading ? "Refreshing" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {!error && loading && !summary && (
        <div className="space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-violet-100" />
          <div className="h-3 w-full animate-pulse rounded bg-violet-100/70" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-violet-100/70" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-violet-100/70" />
        </div>
      )}

      {summary && !error && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-900">
            {summary.headline}
          </p>

          {summary.keyPoints.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-700">
                Key points
              </p>
              <ul className="space-y-1.5">
                {summary.keyPoints.map((p, i) => {
                  const src = sourceLabel(p.source);
                  return (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                      <span className="flex-1">
                        {p.text}
                        {src && (
                          <span className="ml-1.5 inline-block rounded bg-violet-100 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-violet-700">
                            {src}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {summary.redFlags.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                ⚠ Red flags
              </p>
              <ul className="space-y-1.5">
                {summary.redFlags.map((p, i) => {
                  const src = sourceLabel(p.source);
                  return (
                    <li key={i} className="flex gap-2 text-sm text-amber-900">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      <span className="flex-1">
                        {p.text}
                        {src && (
                          <span className="ml-1.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-amber-800">
                            {src}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {summary.suggestedFocus && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                Today&rsquo;s focus
              </p>
              <p className="text-sm text-slate-700">{summary.suggestedFocus}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
