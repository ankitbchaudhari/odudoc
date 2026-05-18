"use client";

// Homepage symptom checker. 3-step wizard:
//   1) Pick a body region (8 buttons with emoji)
//   2) Pick a specific complaint (subset of that region)
//   3) Duration + severity (two radio rows)
// → Recommendation card with specialty + urgency + two CTAs.
//
// Pre-signup — drives Google traffic ("headache doctor", etc.)
// straight into the booking funnel without forcing an account.

import { useState } from "react";
import Link from "next/link";
import { REGIONS, recommend, type Duration, type Severity, type Recommendation, type SymptomOption } from "@/lib/symptom-router";

type Step = 1 | 2 | 3 | 4;

export default function SymptomChecker() {
  const [step, setStep] = useState<Step>(1);
  const [region, setRegion] = useState<SymptomOption | null>(null);
  const [complaintId, setComplaintId] = useState<string | null>(null);
  const [duration, setDuration] = useState<Duration | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);

  const reset = () => {
    setStep(1);
    setRegion(null);
    setComplaintId(null);
    setDuration(null);
    setSeverity(null);
  };

  const result: Recommendation | null =
    region && complaintId && duration && severity
      ? recommend(region, complaintId, duration, severity)
      : null;

  return (
    <section className="relative mx-auto mt-12 max-w-3xl px-4">
      <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl shadow-indigo-500/10">
        <header className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-5 text-white">
          <div className="relative flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Not sure who to see?</p>
              <h2 className="mt-1 text-xl font-bold sm:text-2xl">Find the right doctor in 3 taps</h2>
              <p className="mt-1 text-xs text-white/75 sm:text-sm">
                Answer a few questions about your symptoms. We&apos;ll route you to the specialist who can help.
              </p>
            </div>
            <Stepper step={step} />
          </div>
          <div className="pointer-events-none absolute -right-12 -bottom-12 h-32 w-32 rounded-full border-2 border-white/10" />
        </header>

        <div className="px-6 py-6">
          {step === 1 && (
            <Step1
              onPick={(r) => { setRegion(r); setComplaintId(null); setStep(2); }}
            />
          )}
          {step === 2 && region && (
            <Step2
              region={region}
              onBack={() => setStep(1)}
              onPick={(cId) => { setComplaintId(cId); setStep(3); }}
            />
          )}
          {step === 3 && region && complaintId && (
            <Step3
              duration={duration}
              severity={severity}
              setDuration={setDuration}
              setSeverity={setSeverity}
              onBack={() => setStep(2)}
              onContinue={() => setStep(4)}
              canContinue={!!duration && !!severity}
            />
          )}
          {step === 4 && result && (
            <Step4 recommendation={result} onReset={reset} />
          )}
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-gray-500 dark:text-slate-400">
        ⚕️ This is triage guidance, not a diagnosis. If you have a life-threatening emergency, call 911 or go to the nearest ER.
      </p>
    </section>
  );
}

function Stepper({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className={`flex h-7 w-7 items-center justify-center rounded-full ring-1 ${
            n === step ? "bg-white text-indigo-700 ring-white" :
            n < step ? "bg-white/30 text-white ring-white/40" :
            "bg-white/10 text-white/60 ring-white/20"
          }`}
        >
          {n < step ? "✓" : n}
        </div>
      ))}
    </div>
  );
}

function Step1({ onPick }: { onPick: (r: SymptomOption) => void }) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
        Step 1 · Where is it?
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {REGIONS.map((r) => (
          <button
            key={r.id}
            onClick={() => onPick(r)}
            className="group flex flex-col items-center gap-1.5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 transition hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 hover:shadow-md"
          >
            <span className="text-3xl transition group-hover:scale-110">{r.emoji}</span>
            <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">{r.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Step2({
  region, onBack, onPick,
}: {
  region: SymptomOption;
  onBack: () => void;
  onPick: (id: string) => void;
}) {
  return (
    <div>
      <button onClick={onBack} className="mb-3 text-xs text-gray-500 dark:text-slate-400 hover:text-indigo-600">
        ← Back
      </button>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
        Step 2 · {region.emoji} {region.label} — what specifically?
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {region.complaints.map((c) => (
          <button
            key={c.id}
            onClick={() => onPick(c.id)}
            className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-slate-300 transition hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30"
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Step3({
  duration, severity, setDuration, setSeverity, onBack, onContinue, canContinue,
}: {
  duration: Duration | null;
  severity: Severity | null;
  setDuration: (d: Duration) => void;
  setSeverity: (s: Severity) => void;
  onBack: () => void;
  onContinue: () => void;
  canContinue: boolean;
}) {
  const durations: Array<{ id: Duration; label: string; emoji: string }> = [
    { id: "today",     label: "Today",       emoji: "🆕" },
    { id: "few_days",  label: "Few days",    emoji: "📆" },
    { id: "weeks",     label: "Weeks",       emoji: "🗓️" },
    { id: "months",    label: "Months",      emoji: "📅" },
  ];
  const severities: Array<{ id: Severity; label: string; tone: string }> = [
    { id: "mild",     label: "🟢 Mild",     tone: "from-emerald-500 to-teal-500" },
    { id: "moderate", label: "🟡 Moderate", tone: "from-amber-500 to-orange-500" },
    { id: "severe",   label: "🔴 Severe",   tone: "from-rose-500 to-red-500" },
  ];
  return (
    <div>
      <button onClick={onBack} className="mb-3 text-xs text-gray-500 dark:text-slate-400 hover:text-indigo-600">
        ← Back
      </button>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
        Step 3 · How long? How bad?
      </p>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium text-gray-600 dark:text-slate-400">How long have you had it?</p>
          <div className="grid grid-cols-4 gap-2">
            {durations.map((d) => (
              <button
                key={d.id}
                onClick={() => setDuration(d.id)}
                className={
                  duration === d.id
                    ? "rounded-xl border-2 border-indigo-500 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/20 dark:to-violet-500/20 px-2 py-3 text-xs font-semibold text-indigo-700 dark:text-indigo-300"
                    : "rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-3 text-xs font-medium text-gray-700 dark:text-slate-300 hover:border-indigo-300"
                }
              >
                <span className="block text-lg">{d.emoji}</span>
                <span>{d.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-gray-600 dark:text-slate-400">How severe is it?</p>
          <div className="grid grid-cols-3 gap-2">
            {severities.map((s) => {
              const selected = severity === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSeverity(s.id)}
                  className={
                    selected
                      ? `rounded-xl bg-gradient-to-r ${s.tone} px-3 py-3 text-xs font-bold text-white shadow-md`
                      : "rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-xs font-medium text-gray-700 dark:text-slate-300 hover:border-indigo-300"
                  }
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <button
        disabled={!canContinue}
        onClick={onContinue}
        className="mt-5 w-full rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        See recommendation →
      </button>
    </div>
  );
}

function Step4({ recommendation, onReset }: { recommendation: Recommendation; onReset: () => void }) {
  const URGENCY_TONE = {
    routine:   "from-emerald-500 to-teal-500",
    soon:      "from-amber-500 to-orange-500",
    urgent:    "from-rose-500 to-red-500",
    emergency: "from-red-600 to-rose-700",
  } as const;
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
        Your recommendation
      </p>
      <div className={`rounded-2xl bg-gradient-to-br ${URGENCY_TONE[recommendation.urgency]} px-5 py-4 text-white shadow-lg`}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">{recommendation.urgencyLabel}</p>
        <p className="mt-1 text-2xl font-bold">{recommendation.specialtyLabel}</p>
        <p className="mt-1 text-sm text-white/90">{recommendation.reason}</p>
      </div>

      {recommendation.urgency === "emergency" ? (
        <div className="mt-4 rounded-2xl border-2 border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4">
          <p className="text-sm font-bold text-red-900 dark:text-red-200">🚨 This may be a medical emergency</p>
          <p className="mt-1 text-xs text-red-800 dark:text-red-300">
            Please go to the nearest emergency room immediately or call:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="tel:911" className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow">📞 911</a>
            <a href="tel:+13028992625" className="rounded-xl bg-white dark:bg-slate-900 border border-red-300 dark:border-red-900/60 px-4 py-2 text-sm font-bold text-red-700 dark:text-red-300 shadow">OduDoc 24/7 helpline</a>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link
            href={`/consult-now?specialty=${encodeURIComponent(recommendation.specialty)}`}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-center text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:shadow-xl"
          >
            <span className="relative z-10">⚡ Consult now (live)</span>
          </Link>
          <Link
            href={`/specialty/${recommendation.specialty}`}
            className="rounded-2xl border-2 border-indigo-500 bg-white dark:bg-slate-950 px-5 py-3 text-center text-sm font-bold text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30"
          >
            Browse {recommendation.specialtyLabel}s
          </Link>
        </div>
      )}

      <button onClick={onReset} className="mt-4 w-full text-center text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-indigo-600">
        ← Start over
      </button>
    </div>
  );
}
