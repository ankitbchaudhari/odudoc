"use client";

// Drop-in safety panel.
//
// Wrap any Rx form: pass the new drugs + patient context, get back a
// styled warning panel that updates as the doctor types. The panel
// returns whether it's "blocking" (any critical/major warning) so the
// caller can wire its own submit guard / override-with-reason flow.
//
// Usage:
//   <RxSafetyPanel
//     newDrugs={items}
//     patientId={p.id}
//     onResult={(r) => setBlocked(r.worst === "critical" || r.worst === "major")}
//   />
//
// The component debounces the API call (350ms) so typing-fast doesn't
// hammer the endpoint.

import { useEffect, useState } from "react";

export type Severity = "critical" | "major" | "moderate" | "minor";

export interface SafetyWarning {
  code: string;
  severity: Severity;
  drugs: string[];
  effect: string;
  detail: string;
  recommendation: string;
  source?: string;
}

export interface CheckResult {
  warnings: SafetyWarning[];
  worst: Severity | null;
  counts: Record<Severity, number>;
}

interface Props {
  newDrugs: Array<{ name: string; strength?: string }>;
  patientId?: string;
  contextOverride?: Record<string, unknown>;
  onResult?: (result: CheckResult) => void;
  /** Hide the panel chrome when there are zero warnings. Defaults true. */
  hideWhenClean?: boolean;
}

const SEV_COLORS: Record<Severity, string> = {
  critical: "bg-rose-50 border-rose-300 text-rose-900",
  major: "bg-amber-50 border-amber-300 text-amber-900",
  moderate: "bg-yellow-50 border-yellow-300 text-yellow-900",
  minor: "bg-sky-50 border-sky-300 text-sky-900",
};
const SEV_PILL: Record<Severity, string> = {
  critical: "bg-rose-600 text-white",
  major: "bg-amber-500 text-white",
  moderate: "bg-yellow-400 text-yellow-900",
  minor: "bg-sky-400 text-white",
};
const CODE_LABEL: Record<string, string> = {
  ddi: "Drug interaction",
  allergy: "Allergy",
  cross_reactive: "Cross-reactive",
  pregnancy: "Pregnancy",
  renal: "Renal",
  paediatric: "Paediatric",
  geriatric: "Geriatric",
  duplicate: "Duplicate",
};

export default function RxSafetyPanel({
  newDrugs,
  patientId,
  contextOverride,
  onResult,
  hideWhenClean = true,
}: Props) {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (newDrugs.length === 0) {
      setResult(null);
      onResult?.({ warnings: [], worst: null, counts: { critical: 0, major: 0, moderate: 0, minor: 0 } });
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/rx/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientId, newDrugs, contextOverride }),
        });
        if (!r.ok) return;
        const data = (await r.json()) as CheckResult;
        if (cancelled) return;
        setResult(data);
        onResult?.(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(newDrugs), patientId, JSON.stringify(contextOverride)]);

  if (!result || (hideWhenClean && result.warnings.length === 0)) {
    return null;
  }

  const headerColor =
    result.worst === "critical"
      ? "bg-rose-600 text-white"
      : result.worst === "major"
      ? "bg-amber-500 text-white"
      : result.worst === "moderate"
      ? "bg-yellow-300 text-yellow-900"
      : result.worst === "minor"
      ? "bg-sky-400 text-white"
      : "bg-emerald-500 text-white";

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className={`flex items-center justify-between rounded-t-xl px-4 py-2 ${headerColor}`}>
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
          </svg>
          <p className="text-sm font-bold">
            {result.warnings.length === 0
              ? "No safety issues detected"
              : `${result.warnings.length} safety warning${result.warnings.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex gap-1 text-[11px] font-bold">
          {(["critical", "major", "moderate", "minor"] as Severity[]).map((s) =>
            result.counts[s] ? (
              <span key={s} className={`rounded-full px-2 py-0.5 ${SEV_PILL[s]}`}>
                {result.counts[s]} {s}
              </span>
            ) : null,
          )}
          {loading && <span className="text-white/80">checking…</span>}
        </div>
      </div>
      {result.warnings.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {result.warnings.map((w, i) => {
            const open = expanded.has(i);
            return (
              <li key={i} className={`border-l-4 px-4 py-3 ${SEV_COLORS[w.severity]}`}>
                <button
                  onClick={() => {
                    const next = new Set(expanded);
                    if (open) next.delete(i);
                    else next.add(i);
                    setExpanded(next);
                  }}
                  className="flex w-full items-start justify-between gap-3 text-left"
                >
                  <div className="flex-1">
                    <p className="text-sm font-bold">
                      <span className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${SEV_PILL[w.severity]}`}>
                        {CODE_LABEL[w.code] || w.code}
                      </span>
                      {w.effect}
                    </p>
                    <p className="mt-0.5 text-xs">
                      <span className="font-mono">{w.drugs.join(" + ")}</span>
                    </p>
                  </div>
                  <span className="text-xs">{open ? "▴" : "▾"}</span>
                </button>
                {open && (
                  <div className="mt-2 space-y-1.5 text-xs">
                    <p>{w.detail}</p>
                    <p>
                      <strong>Recommendation:</strong> {w.recommendation}
                    </p>
                    {w.source && <p className="text-slate-500">Source: {w.source}</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
