"use client";

// Doctor-only differential-diagnosis modal. Click the button to fetch
// a ranked list with rationales and ruling-out questions. Designed
// for the assessment phase of the visit form: doctor reads the list,
// asks the suggested questions, and types their final assessment.
//
// Click a Dx → it gets appended to the assessment field via onAccept.

import { useState } from "react";

type Urgency = "routine" | "today" | "urgent";

interface Differential {
  diagnosis: string;
  probability: number;
  urgency: Urgency;
  rationale: string;
  rulingOutQuestions: string[];
}

interface Props {
  chiefComplaint: string;
  subjective?: string;
  objective?: string;
  vitals?: string;
  patientAge?: string;
  patientSex?: string;
  patientAllergies?: string;
  patientChronicConditions?: string;
  onAccept: (formattedDiagnosis: string) => void;
  className?: string;
}

const URGENCY_STYLE: Record<Urgency, { bg: string; text: string; label: string }> = {
  routine: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Routine" },
  today:   { bg: "bg-amber-100",   text: "text-amber-800",   label: "Today" },
  urgent:  { bg: "bg-rose-100",    text: "text-rose-800",    label: "Urgent" },
};

export default function DifferentialDxButton({
  chiefComplaint,
  subjective,
  objective,
  vitals,
  patientAge,
  patientSex,
  patientAllergies,
  patientChronicConditions,
  onAccept,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [differentials, setDifferentials] = useState<Differential[]>([]);
  const [emergency, setEmergency] = useState(false);

  async function fetchDx() {
    if (!chiefComplaint.trim() && !(subjective || "").trim()) {
      setError("Add chief complaint or subjective first.");
      setDifferentials([]);
      setOpen(true);
      return;
    }
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/differential", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chiefComplaint, subjective, objective, vitals,
          patientAge, patientSex, patientAllergies, patientChronicConditions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDifferentials(data.result?.differentials || []);
      setEmergency(!!data.result?.emergencyFlag);
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
        onClick={fetchDx}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 text-xs font-semibold text-fuchsia-700 hover:bg-fuchsia-100 ${className}`}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
        </svg>
        Differential diagnosis
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Differential diagnosis</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Decision support — your assessment is final.</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {emergency && !loading && (
              <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
                <p className="font-bold">⛔ Emergency consideration</p>
                <p className="mt-0.5 text-xs">
                  At least one urgent differential is in play. Consider escalation, in-person evaluation, or ED referral.
                </p>
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</div>
            )}

            {loading && (
              <div className="space-y-2">
                <div className="h-16 w-full animate-pulse rounded bg-fuchsia-50" />
                <div className="h-16 w-full animate-pulse rounded bg-fuchsia-50/70" />
                <div className="h-16 w-full animate-pulse rounded bg-fuchsia-50/50" />
              </div>
            )}

            {!loading && !error && differentials.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No clear differential. Add more detail to chief complaint / subjective / objective and try again.
              </p>
            )}

            {!loading && differentials.length > 0 && (
              <ul className="space-y-2">
                {differentials.map((d, i) => {
                  const u = URGENCY_STYLE[d.urgency];
                  return (
                    <li key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{d.diagnosis}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{Math.round(d.probability * 100)}%</span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{d.rationale}</p>
                          {d.rulingOutQuestions.length > 0 && (
                            <ul className="mt-2 space-y-0.5">
                              {d.rulingOutQuestions.map((q, qi) => (
                                <li key={qi} className="flex gap-1.5 text-[12px] text-slate-700 dark:text-slate-300">
                                  <span className="text-slate-400">·</span>
                                  <span>{q}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${u.bg} ${u.text}`}>
                            {u.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onAccept(d.diagnosis);
                              setOpen(false);
                            }}
                            className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-2 py-1 text-[11px] font-semibold text-fuchsia-700 hover:bg-fuchsia-100"
                          >
                            Use
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
