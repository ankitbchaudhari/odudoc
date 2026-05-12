"use client";

// Doctor-facing pre-visit intake summary. Pass in the patient's submitted
// medical history (from the Consultation record) and we'll fetch the
// AI structuring lazily on mount.
//
// Slot this into the doctor's consultation detail or pre-call screen so
// they see "headline + red flags + questions to ask + exams to do" at
// a glance before the call starts.

import { useEffect, useState } from "react";
import type { IntakeMedicalHistory } from "@/lib/ai-intake";

interface PreVisitIntake {
  headline: string;
  redFlags: string[];
  suggestedQuestions: string[];
  suggestedExams: string[];
  generatedAt: string;
}

interface Props {
  history: IntakeMedicalHistory;
  patientAge?: string;
  patientSex?: string;
  specialty?: string;
  className?: string;
}

export default function AiPreVisitIntakeCard({
  history,
  patientAge,
  patientSex,
  specialty,
  className = "",
}: Props) {
  const [intake, setIntake] = useState<PreVisitIntake | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, patientAge, patientSex, specialty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setIntake(data.intake);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`overflow-hidden rounded-3xl border border-cyan-200/70 bg-gradient-to-br from-cyan-50/80 via-white to-sky-50/60 p-6 shadow-lg shadow-cyan-500/5 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-sky-500 text-white shadow-md shadow-cyan-500/30">
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Pre-visit intake</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Patient&rsquo;s history, structured for the doctor
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-cyan-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-cyan-700 hover:bg-cyan-50 disabled:opacity-60"
        >
          {loading ? "…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading && !intake && (
        <div className="space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-cyan-100" />
          <div className="h-3 w-full animate-pulse rounded bg-cyan-100/70" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-cyan-100/70" />
        </div>
      )}

      {intake && !error && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{intake.headline}</p>

          {intake.redFlags.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                ⚠ Red flags
              </p>
              <ul className="space-y-1 text-sm text-amber-900">
                {intake.redFlags.map((f, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {intake.suggestedQuestions.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-cyan-700">
                Ask the patient
              </p>
              <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                {intake.suggestedQuestions.map((q, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {intake.suggestedExams.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-sky-700">
                Exams / quick checks
              </p>
              <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                {intake.suggestedExams.map((q, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
