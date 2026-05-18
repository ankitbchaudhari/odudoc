"use client";

// /dashboard/chronic — index of the patient's chronic conditions.
// Each tile deep-links to the focused condition dashboard at
// /dashboard/chronic/[condition].

import { useEffect, useState } from "react";
import Link from "next/link";

type Condition =
  | "diabetes_t2" | "diabetes_t1" | "hypertension" | "hyperlipidemia"
  | "asthma" | "copd" | "ckd" | "thyroid_hypo" | "thyroid_hyper"
  | "obesity" | "anxiety_depression" | "post_mi" | "pregnancy" | "other";

const COND_INFO: Record<Condition, { label: string; emoji: string; gradient: string }> = {
  diabetes_t2:        { label: "Type 2 Diabetes",   emoji: "🩸", gradient: "from-rose-500 to-fuchsia-500" },
  diabetes_t1:        { label: "Type 1 Diabetes",   emoji: "🩸", gradient: "from-rose-500 to-fuchsia-500" },
  hypertension:       { label: "Hypertension",      emoji: "❤️", gradient: "from-red-500 to-rose-500" },
  hyperlipidemia:     { label: "High Cholesterol",  emoji: "🧈", gradient: "from-amber-500 to-orange-500" },
  asthma:             { label: "Asthma",            emoji: "🫁", gradient: "from-sky-500 to-cyan-500" },
  copd:               { label: "COPD",              emoji: "🫁", gradient: "from-slate-500 to-sky-500" },
  ckd:                { label: "Kidney Disease",    emoji: "🫘", gradient: "from-amber-500 to-orange-500" },
  thyroid_hypo:       { label: "Hypothyroid",       emoji: "🦋", gradient: "from-teal-500 to-emerald-500" },
  thyroid_hyper:      { label: "Hyperthyroid",      emoji: "🦋", gradient: "from-orange-500 to-amber-500" },
  obesity:            { label: "Weight Management", emoji: "⚖️", gradient: "from-emerald-500 to-teal-500" },
  anxiety_depression: { label: "Mental Health",     emoji: "🧠", gradient: "from-violet-500 to-purple-500" },
  post_mi:            { label: "Post-Heart Attack", emoji: "❤️‍🩹", gradient: "from-red-500 to-rose-500" },
  pregnancy:          { label: "Pregnancy",         emoji: "🤰", gradient: "from-rose-500 to-pink-500" },
  other:              { label: "Chronic Care",      emoji: "🏥", gradient: "from-indigo-500 to-violet-500" },
};

interface CarePlan {
  id: string;
  condition: Condition;
  title: string;
  diagnosedOn?: string;
  active: boolean;
}

export default function ChronicIndexPage() {
  const [plans, setPlans] = useState<CarePlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/care-plan", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : { plans: [] })
      .then((d) => setPlans((d.plans || []).filter((p: CarePlan) => p.active !== false)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="relative mx-auto max-w-4xl px-4 py-8">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-rose-400/25 via-fuchsia-400/25 to-indigo-300/25 blur-3xl dark:from-rose-600/25 dark:via-fuchsia-600/25 dark:to-indigo-500/15" />
      </div>

      <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 hover:text-indigo-600 transition">
        ← Dashboard
      </Link>

      <header className="mb-6 overflow-hidden rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
        <div className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-6 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Chronic care</p>
          <h1 className="mt-1 text-2xl font-bold">My conditions</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/80">
            One focused dashboard per condition — vitals trend, prescriptions, today&apos;s doses, and care-plan targets in one place.
          </p>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">Loading…</p>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 bg-gradient-to-br from-indigo-50/50 to-fuchsia-50/30 dark:from-indigo-950/20 dark:to-fuchsia-950/20 p-10 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-2xl text-white shadow-lg shadow-indigo-500/30">🏥</span>
          <p className="mt-3 text-base font-semibold text-gray-900 dark:text-slate-100">No chronic conditions tracked yet</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-gray-500 dark:text-slate-400">
            Set up a care plan for diabetes, hypertension, asthma, or any chronic condition. We&apos;ll track your vitals, prescriptions, and adherence in one focused view.
          </p>
          <Link href="/dashboard/care-plan" className="mt-5 inline-block rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl transition">
            Set up your first care plan →
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            const info = COND_INFO[p.condition] || COND_INFO.other;
            return (
              <li key={p.id}>
                <Link
                  href={`/dashboard/chronic/${p.condition}`}
                  className="group flex h-full flex-col rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:shadow-md hover:shadow-indigo-500/10"
                >
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${info.gradient} text-2xl text-white shadow-md`}>
                    {info.emoji}
                  </span>
                  <p className="mt-3 text-base font-semibold text-gray-900 dark:text-slate-100">{p.title || info.label}</p>
                  {p.diagnosedOn && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                      Since {new Date(p.diagnosedOn).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                    </p>
                  )}
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                    Open dashboard →
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/dashboard/care-plan"
              className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-700 bg-gray-50/40 dark:bg-slate-900/40 p-5 text-center text-gray-500 dark:text-slate-400 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 transition"
            >
              <span className="text-3xl">+</span>
              <span className="mt-1 text-xs font-medium">Add a care plan</span>
            </Link>
          </li>
        </ul>
      )}
    </main>
  );
}
