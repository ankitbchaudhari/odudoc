"use client";

// ICD-10 code suggester for the EMR visit form. Doctor clicks "Suggest
// codes" → modal opens with a ranked list → click to copy a code into
// the assessment field. Stays out of the way until invoked: zero AI
// cost on visit forms the doctor never asks for codes on.

import { useState } from "react";

interface IcdSuggestion {
  code: string;
  description: string;
  confidence: number;
  rationale: string;
}

interface Props {
  /** Pulled from the visit form. */
  chiefComplaint: string;
  subjective?: string;
  objective?: string;
  assessment: string;
  plan?: string;
  vitals?: string;
  patientAge?: string;
  patientSex?: string;
  /** Called when the doctor clicks a code. The visit form decides where
   *  to place it (we just hand back the formatted "CODE — description"
   *  string for them to append to the assessment). */
  onAccept: (formatted: string) => void;
  className?: string;
}

function confidenceLabel(c: number): { label: string; cls: string } {
  if (c >= 0.85) return { label: `${Math.round(c * 100)}%`, cls: "bg-emerald-100 text-emerald-800" };
  if (c >= 0.6)  return { label: `${Math.round(c * 100)}%`, cls: "bg-sky-100 text-sky-800" };
  return { label: `${Math.round(c * 100)}%`, cls: "bg-amber-100 text-amber-800" };
}

export default function Icd10Suggester({
  chiefComplaint,
  subjective,
  objective,
  assessment,
  plan,
  vitals,
  patientAge,
  patientSex,
  onAccept,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<IcdSuggestion[]>([]);

  async function fetchCodes() {
    if (!chiefComplaint?.trim() && !assessment?.trim()) {
      setError("Fill in chief complaint or assessment first.");
      setSuggestions([]);
      setOpen(true);
      return;
    }
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/icd10", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chiefComplaint,
          subjective,
          objective,
          assessment,
          plan,
          vitals,
          patientAge,
          patientSex,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Suggest failed");
      setSuggestions(data.result?.suggestions || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={fetchCodes}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 ${className}`}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17 9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z" />
        </svg>
        Suggest ICD-10 codes
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Suggested ICD-10-CM codes</h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</div>
            )}

            {loading && (
              <div className="space-y-2">
                <div className="h-12 w-full animate-pulse rounded bg-indigo-50" />
                <div className="h-12 w-full animate-pulse rounded bg-indigo-50/70" />
                <div className="h-12 w-full animate-pulse rounded bg-indigo-50/50" />
              </div>
            )}

            {!loading && !error && suggestions.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No codes suggested. Add more detail to the assessment and try again.
              </p>
            )}

            {!loading && suggestions.length > 0 && (
              <ul className="space-y-2">
                {suggestions.map((s) => {
                  const conf = confidenceLabel(s.confidence);
                  const formatted = `${s.code} — ${s.description}`;
                  return (
                    <li key={s.code}>
                      <button
                        type="button"
                        onClick={() => {
                          onAccept(formatted);
                          setOpen(false);
                        }}
                        className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-left transition hover:border-indigo-400 hover:bg-indigo-50"
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <div>
                            <span className="font-mono text-sm font-bold text-indigo-700">{s.code}</span>
                            <span className="ml-2 text-sm text-slate-800 dark:text-slate-200">{s.description}</span>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${conf.cls}`}>
                            {conf.label}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{s.rationale}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="mt-4 text-xs text-slate-400">
              Decision support — verify each code against the official ICD-10-CM index before billing.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
