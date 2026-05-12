"use client";

// Triage chatbot — drop into any /doctors/[id] profile.
//
// Renders as a floating button that expands into a 5-step flow:
//   1. Chief complaint (text)
//   2. Severity slider 1-5
//   3. Duration (chips)
//   4. Follow-up modifiers (multi-select; pulled from /api/triage)
//   5. Result card with urgency, fit-or-not, pre-visit note

import { useState } from "react";

interface Question {
  id: string; prompt: string;
  options: Array<{ value: string; label: string; redFlag?: boolean }>;
}
interface TriageResult {
  recommendation: string;
  urgency: "ER_NOW" | "TODAY" | "WITHIN_3_DAYS" | "ROUTINE";
  doctorIsGoodFit: boolean;
  suggestedSpecialty?: string;
  redFlags: string[];
  preVisitNote: string;
  confidence: number;
  matchedBucketId?: string;
}

interface Props {
  doctorName: string;
  doctorSpecialty?: string;
}

const URGENCY_TONE: Record<TriageResult["urgency"], string> = {
  ER_NOW: "border-rose-400 bg-rose-50 text-rose-900",
  TODAY: "border-amber-400 bg-amber-50 text-amber-900",
  WITHIN_3_DAYS: "border-sky-400 bg-sky-50 text-sky-900",
  ROUTINE: "border-emerald-400 bg-emerald-50 text-emerald-900",
};
const URGENCY_HEADLINE: Record<TriageResult["urgency"], string> = {
  ER_NOW: "🚨 Emergency",
  TODAY: "⚠ Urgent — see a doctor today",
  WITHIN_3_DAYS: "📅 Within 3 days",
  ROUTINE: "✓ Routine appointment",
};

export default function TriageChatbot({ doctorName, doctorSpecialty }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [chief, setChief] = useState("");
  const [severity, setSeverity] = useState(2);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [followUps, setFollowUps] = useState<Question[]>([]);
  const [modifiers, setModifiers] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<TriageResult | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStep(1); setChief(""); setSeverity(2); setDuration(undefined);
    setFollowUps([]); setModifiers(new Set()); setResult(null);
  };

  const proceedToFollowUps = async () => {
    if (!chief.trim()) return;
    setBusy(true);
    try {
      const r = await fetch("/api/triage", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "follow_ups", chiefComplaint: chief }),
      });
      if (r.ok) setFollowUps((await r.json()).questions || []);
    } finally { setBusy(false); }
    setStep(4);
  };

  const submit = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/triage", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chiefComplaint: chief,
          modifiers: Array.from(modifiers),
          severity,
          durationDays: duration,
          doctorSpecialty,
        }),
      });
      if (r.ok) setResult(await r.json());
      setStep(5);
    } finally { setBusy(false); }
  };

  const toggleMod = (v: string) => {
    setModifiers((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v); else next.add(v);
      return next;
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100"
      >
        <span className="text-lg">🩺</span>
        Should I see {doctorName}? — quick check
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Quick symptom check</p>
          <button onClick={() => { setOpen(false); reset(); }} className="text-slate-400">✕</button>
        </div>

        {step === 1 && (
          <div>
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">In 1-2 sentences, what&apos;s bothering you?</p>
            <textarea
              autoFocus
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={chief}
              onChange={(e) => setChief(e.target.value)}
              placeholder="e.g. Chest pain that started this morning, mild but won't go away."
            />
            <div className="mt-4 flex justify-end">
              <button onClick={() => setStep(2)} disabled={chief.trim().length < 4} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Next</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-2 text-sm text-slate-700 dark:text-slate-300">How severe?</p>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">1 = barely noticeable, 5 = worst it&apos;s ever been</p>
            <input type="range" min={1} max={5} value={severity} onChange={(e) => setSeverity(Number(e.target.value))} className="w-full accent-indigo-500" />
            <p className="mt-2 text-center text-3xl font-extrabold text-indigo-700">{severity}</p>
            <div className="mt-4 flex justify-between">
              <button onClick={() => setStep(1)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Back</button>
              <button onClick={() => setStep(3)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">How long has this been going on?</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Today", v: 1 }, { label: "2-3 days", v: 3 },
                { label: "About a week", v: 7 }, { label: "Few weeks", v: 21 },
                { label: "1-2 months", v: 60 }, { label: "More than 3 months", v: 100 },
              ].map((o) => (
                <button key={o.label} onClick={() => setDuration(o.v)}
                  className={`rounded-lg border-2 p-2 text-sm ${duration === o.v ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 dark:border-slate-800"}`}>
                  {o.label}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-between">
              <button onClick={() => setStep(2)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Back</button>
              <button onClick={proceedToFollowUps} disabled={duration === undefined || busy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "…" : "Next"}</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">Anything else applies?</p>
            {followUps.length === 0 ? (
              <p className="rounded-md bg-slate-50 dark:bg-slate-900 p-3 text-xs text-slate-500 dark:text-slate-400">We don&apos;t have follow-up questions for this. Continue.</p>
            ) : (
              followUps.map((q) => (
                <div key={q.id} className="mb-3">
                  <p className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{q.prompt}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {q.options.map((o) => (
                      <button key={o.value} onClick={() => toggleMod(o.value)}
                        className={`rounded-full border px-3 py-1 text-xs ${modifiers.has(o.value) ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-300 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
            <div className="mt-4 flex justify-between">
              <button onClick={() => setStep(3)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Back</button>
              <button onClick={submit} disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "Analysing…" : "Get recommendation"}</button>
            </div>
          </div>
        )}

        {step === 5 && result && (
          <div>
            <div className={`rounded-2xl border-2 p-4 ${URGENCY_TONE[result.urgency]}`}>
              <p className="text-2xl font-extrabold">{URGENCY_HEADLINE[result.urgency]}</p>
              <p className="mt-2 text-sm">{result.recommendation}</p>
              {result.redFlags.length > 0 && (
                <p className="mt-2 text-xs font-semibold">Red flags: {result.redFlags.join(", ")}</p>
              )}
            </div>

            {!result.doctorIsGoodFit && result.suggestedSpecialty && (
              <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
                💡 A <strong>{result.suggestedSpecialty}</strong> specialist would fit your symptoms better than {doctorName}{doctorSpecialty ? ` (${doctorSpecialty})` : ""}.
              </p>
            )}
            {result.doctorIsGoodFit && result.urgency !== "ER_NOW" && (
              <p className="mt-3 rounded-md bg-emerald-50 p-3 text-xs text-emerald-800">
                ✓ {doctorName} is a good fit. Tap Book below.
              </p>
            )}

            <div className="mt-3 rounded-md bg-slate-50 dark:bg-slate-900 p-3 text-xs">
              <div className="mb-1 flex items-center justify-between">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Pre-visit note (copy to booking)</p>
                <button onClick={() => navigator.clipboard?.writeText(result.preVisitNote)} className="text-[11px] font-semibold text-indigo-600">Copy</button>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-600 dark:text-slate-300">{result.preVisitNote}</pre>
            </div>

            <p className="mt-3 text-[10px] text-slate-400">Confidence {Math.round(result.confidence * 100)}%. This is a guidance tool, not a diagnosis. If unsure, see a doctor in person.</p>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={reset} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Start over</button>
              <button onClick={() => { setOpen(false); reset(); }} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
