"use client";

// Differential-diagnosis copilot panel.
//
// Drop into any encounter form. Shows ranked DDx candidates + red
// flags as the doctor types the chief complaint and modifiers. Pure
// advisory — never auto-fills the encounter; the doctor confirms.

import { useEffect, useState } from "react";

interface RankedCandidate {
  name: string; baseScore: number; score: number;
  icd10?: string; rationale: string; nextStep: string;
  matchedBoosts: string[]; matchedPenalties: string[];
}
interface RedFlag {
  label: string; severity: "critical" | "major";
  action: string; firedBy: string[];
}
interface DDxResult {
  matchedBucket: { id: string } | null;
  candidates: RankedCandidate[];
  redFlags: RedFlag[];
}

interface Vitals {
  systolic?: number; diastolic?: number; hr?: number;
  rr?: number; spo2?: number; tempC?: number;
}

interface Props {
  chiefComplaint: string;
  modifiers?: string[];
  vitals?: Vitals;
  ageYears?: number;
  sex?: "male" | "female" | "other";
  onPickCandidate?: (c: RankedCandidate) => void;
}

export default function DifferentialPanel({
  chiefComplaint, modifiers, vitals, ageYears, sex, onPickCandidate,
}: Props) {
  const [result, setResult] = useState<DDxResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!chiefComplaint || chiefComplaint.trim().length < 3) {
      setResult(null);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/clinical/differential", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chiefComplaint, modifiers, vitals, ageYears, sex }),
        });
        if (!r.ok) return;
        const data = await r.json();
        if (!cancelled) setResult(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [chiefComplaint, JSON.stringify(modifiers), JSON.stringify(vitals), ageYears, sex]);

  if (!result || (!result.candidates.length && !result.redFlags.length)) {
    return chiefComplaint && chiefComplaint.length > 2 ? (
      <p className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3 text-xs text-slate-500 dark:text-slate-400">
        {loading ? "Analysing…" : "No matching complaint pattern. Engine covers chest pain, headache, abdominal pain, dyspnoea, fever — extend lib/clinical-ai/differential-db.ts to add more."}
      </p>
    ) : null;
  }

  return (
    <div className="space-y-3">
      {/* Red flags first */}
      {result.redFlags.length > 0 && (
        <div className="rounded-xl border-2 border-rose-300 bg-rose-50 p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xl">🚨</span>
            <p className="text-sm font-bold text-rose-900">Red flags fired ({result.redFlags.length})</p>
          </div>
          <ul className="space-y-2">
            {result.redFlags.map((rf, i) => (
              <li key={i} className="rounded-lg bg-white dark:bg-slate-900 p-3 ring-1 ring-rose-200">
                <p className="text-sm font-bold text-rose-800">
                  {rf.label}
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${rf.severity === "critical" ? "bg-rose-600 text-white" : "bg-amber-500 text-white"}`}>{rf.severity}</span>
                </p>
                <p className="mt-1 text-xs text-rose-700">Triggered by: <span className="font-mono">{rf.firedBy.join(", ")}</span></p>
                <p className="mt-1 text-xs text-slate-700 dark:text-slate-300"><strong>Action:</strong> {rf.action}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ranked candidates */}
      {result.candidates.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 dark:bg-slate-900 px-4 py-2">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Differential ({result.candidates.length})</p>
            {loading && <span className="text-xs text-slate-500 dark:text-slate-400">analysing…</span>}
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {result.candidates.slice(0, 8).map((c, i) => {
              const open = expanded.has(i);
              const maxScore = result.candidates[0].score;
              const pct = Math.max(8, Math.min(100, Math.round((c.score / Math.max(1, maxScore)) * 100)));
              return (
                <li key={i} className="px-4 py-2.5">
                  <button onClick={() => {
                    const next = new Set(expanded);
                    if (open) next.delete(i); else next.add(i);
                    setExpanded(next);
                  }} className="flex w-full items-start justify-between gap-3 text-left">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{c.name}</p>
                        {c.icd10 && <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700">{c.icd10}</span>}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 max-w-[200px] overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{c.score}</span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">{open ? "▴" : "▾"}</span>
                  </button>
                  {open && (
                    <div className="mt-2 space-y-1.5 border-l-2 border-indigo-200 pl-3 text-xs">
                      <p className="text-slate-700 dark:text-slate-300">{c.rationale}</p>
                      <p className="text-slate-700 dark:text-slate-300"><strong>Next step:</strong> {c.nextStep}</p>
                      {c.matchedBoosts.length > 0 && <p className="text-emerald-700">Matched: {c.matchedBoosts.join(", ")}</p>}
                      {c.matchedPenalties.length > 0 && <p className="text-rose-600">Penalised by: {c.matchedPenalties.join(", ")}</p>}
                      {onPickCandidate && (
                        <button onClick={() => onPickCandidate(c)} className="mt-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                          Use this diagnosis
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
