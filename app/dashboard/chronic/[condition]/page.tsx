"use client";

// /dashboard/chronic/[condition] — focused view for one chronic
// condition (diabetes_t2, hypertension, etc.).
//
// Stitches together data the patient already owns scattered across
// pages: care-plan compliance, recent vitals trend, active
// prescriptions, today's adherence, next refill. The patient sees
// one screen instead of clicking through four.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Condition =
  | "diabetes_t2" | "diabetes_t1" | "hypertension" | "hyperlipidemia"
  | "asthma" | "copd" | "ckd" | "thyroid_hypo" | "thyroid_hyper"
  | "obesity" | "anxiety_depression" | "post_mi" | "pregnancy" | "other";

const COND_INFO: Record<Condition, { label: string; emoji: string; gradient: string; primaryVital: string; primaryVitalKind: string }> = {
  diabetes_t2:        { label: "Type 2 Diabetes",   emoji: "🩸", gradient: "from-rose-600 via-pink-600 to-fuchsia-600",   primaryVital: "Blood glucose",   primaryVitalKind: "glucose" },
  diabetes_t1:        { label: "Type 1 Diabetes",   emoji: "🩸", gradient: "from-rose-600 via-pink-600 to-fuchsia-600",   primaryVital: "Blood glucose",   primaryVitalKind: "glucose" },
  hypertension:       { label: "Hypertension",      emoji: "❤️", gradient: "from-red-600 via-rose-600 to-pink-600",        primaryVital: "Blood pressure",  primaryVitalKind: "bp" },
  hyperlipidemia:     { label: "High Cholesterol",  emoji: "🧈", gradient: "from-amber-600 via-orange-600 to-rose-600",   primaryVital: "Weight",           primaryVitalKind: "weight" },
  asthma:             { label: "Asthma",            emoji: "🫁", gradient: "from-sky-600 via-cyan-600 to-teal-600",        primaryVital: "SpO2",             primaryVitalKind: "spo2" },
  copd:               { label: "COPD",              emoji: "🫁", gradient: "from-slate-600 via-sky-600 to-cyan-600",      primaryVital: "SpO2",             primaryVitalKind: "spo2" },
  ckd:                { label: "Kidney Disease",    emoji: "🫘", gradient: "from-amber-600 via-yellow-600 to-orange-600", primaryVital: "Blood pressure",  primaryVitalKind: "bp" },
  thyroid_hypo:       { label: "Hypothyroid",       emoji: "🦋", gradient: "from-teal-600 via-emerald-600 to-green-600",  primaryVital: "Weight",           primaryVitalKind: "weight" },
  thyroid_hyper:      { label: "Hyperthyroid",      emoji: "🦋", gradient: "from-orange-600 via-amber-600 to-yellow-600", primaryVital: "Heart rate",       primaryVitalKind: "heart_rate" },
  obesity:            { label: "Weight Management", emoji: "⚖️", gradient: "from-emerald-600 via-teal-600 to-cyan-600",   primaryVital: "Weight",           primaryVitalKind: "weight" },
  anxiety_depression: { label: "Mental Health",     emoji: "🧠", gradient: "from-violet-600 via-purple-600 to-fuchsia-600", primaryVital: "Mood",          primaryVitalKind: "weight" },
  post_mi:            { label: "Post-Heart Attack", emoji: "❤️‍🩹", gradient: "from-red-600 via-rose-600 to-pink-600",  primaryVital: "Blood pressure",  primaryVitalKind: "bp" },
  pregnancy:          { label: "Pregnancy",         emoji: "🤰", gradient: "from-rose-600 via-pink-600 to-fuchsia-600",   primaryVital: "Weight",           primaryVitalKind: "weight" },
  other:              { label: "Chronic Care",      emoji: "🏥", gradient: "from-indigo-600 via-violet-600 to-fuchsia-600", primaryVital: "Vitals",        primaryVitalKind: "weight" },
};

interface VitalReading {
  id: string;
  kind: string;
  value: number;
  value2?: number;
  unit: string;
  takenAt: string;
}

interface CarePlan {
  id: string;
  condition: Condition;
  title: string;
  targets: Array<{ kind: string; min?: number; max?: number; max2?: number; unit: string; label: string }>;
  compliance?: Array<{ kind: string; status: "in_range" | "out_of_range" | "no_data"; lastValue?: number }>;
  diagnosedOn?: string;
}

interface PrescriptionRow {
  id: string;
  createdAt: string;
  data: {
    doctorName?: string;
    diagnosis?: string;
    medications?: Array<{ name: string; dose?: string; frequency?: string; duration?: string }>;
  };
  status: string;
}

interface AdherenceResp {
  stats: { adherencePct: number; takenLast7: number; missedLast7: number };
  today: Array<{ rxId: string; medName: string; slot: string; status: "due" | "taken" | "missed" | "skipped" }>;
}

export default function ChronicConditionDashboard() {
  const params = useParams<{ condition: string }>();
  const condition = (params.condition as Condition) || "other";
  const info = COND_INFO[condition] || COND_INFO.other;

  const [plans, setPlans] = useState<CarePlan[]>([]);
  const [vitals, setVitals] = useState<VitalReading[]>([]);
  const [rxs, setRxs] = useState<PrescriptionRow[]>([]);
  const [adherence, setAdherence] = useState<AdherenceResp | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, vRes, rRes, aRes] = await Promise.all([
        fetch("/api/care-plan", { cache: "no-store" }).then((r) => r.ok ? r.json() : { plans: [] }),
        fetch(`/api/vitals?kind=${info.primaryVitalKind}`, { cache: "no-store" }).then((r) => r.ok ? r.json() : { readings: [] }),
        fetch("/api/prescriptions", { cache: "no-store" }).then((r) => r.ok ? r.json() : { prescriptions: [] }),
        fetch("/api/adherence", { cache: "no-store" }).then((r) => r.ok ? r.json() : null),
      ]);
      setPlans((pRes.plans || []).filter((p: CarePlan) => p.condition === condition));
      setVitals(vRes.readings || []);
      setRxs(rRes.prescriptions || []);
      setAdherence(aRes);
    } finally {
      setLoading(false);
    }
  }, [condition, info.primaryVitalKind]);
  useEffect(() => { load(); }, [load]);

  const plan = plans[0];
  const recentVitals = useMemo(() => vitals.slice(0, 14).reverse(), [vitals]);
  const latestVital = vitals[0];
  const trend = computeTrend(recentVitals);

  return (
    <main className="relative mx-auto max-w-5xl px-4 py-8">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden">
        <div className={`absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-gradient-to-tr opacity-30 blur-3xl ${info.gradient}`} />
      </div>

      <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 hover:text-indigo-600 transition">
        ← Dashboard
      </Link>

      <header className="mb-6 overflow-hidden rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
        <div className={`relative bg-gradient-to-br ${info.gradient} px-6 py-6 text-white`}>
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Chronic care</p>
              <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold">
                <span>{info.emoji}</span> {info.label}
              </h1>
              {plan?.diagnosedOn && (
                <p className="mt-1 text-sm text-white/80">
                  Diagnosed {new Date(plan.diagnosedOn).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </p>
              )}
            </div>
            {adherence && (
              <div className="rounded-2xl bg-white/15 backdrop-blur px-4 py-3 ring-1 ring-white/25">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">7-day adherence</p>
                <p className="mt-0.5 text-3xl font-bold tabular-nums">{adherence.stats.adherencePct}%</p>
                <p className="text-[11px] text-white/80">{adherence.stats.takenLast7} taken · {adherence.stats.missedLast7} missed</p>
              </div>
            )}
          </div>
          <div className="pointer-events-none absolute -right-12 -bottom-12 h-40 w-40 rounded-full border-2 border-white/10" />
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">Loading your data…</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Primary vital card */}
          <section className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300">📊</span>
                <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">{info.primaryVital}</h2>
              </div>
              <Link href={`/dashboard/vitals/log?kind=${info.primaryVitalKind}`} className="rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-rose-500/30">
                + Log reading
              </Link>
            </div>
            {latestVital ? (
              <div className="mt-3 flex items-baseline gap-3">
                <span className={`text-5xl font-extrabold tracking-tight bg-gradient-to-r ${info.gradient} bg-clip-text text-transparent`}>
                  {latestVital.value}
                  {latestVital.value2 !== undefined && <span className="text-3xl">/{latestVital.value2}</span>}
                </span>
                <span className="text-sm text-gray-500 dark:text-slate-400">{latestVital.unit}</span>
                {trend && (
                  <span className={`text-xs font-medium ${trend.direction === "down" ? "text-emerald-600 dark:text-emerald-300" : trend.direction === "up" ? "text-rose-600 dark:text-rose-300" : "text-gray-500 dark:text-slate-400"}`}>
                    {trend.direction === "down" ? "▼" : trend.direction === "up" ? "▲" : "—"} {trend.label}
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">No readings yet. Tap &quot;Log reading&quot; to record your first.</p>
            )}
            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
              {latestVital ? `Recorded ${new Date(latestVital.takenAt).toLocaleString()}` : ""}
            </p>
            {recentVitals.length > 1 && <Sparkline readings={recentVitals} />}
          </section>

          {/* Care-plan target compliance */}
          <section className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-300">🎯</span>
              <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">Targets</h2>
            </div>
            {plan?.compliance && plan.compliance.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {plan.compliance.map((t) => (
                  <li key={t.kind} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-gray-700 dark:text-slate-300 capitalize truncate">{t.kind.replace("_", " ")}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      t.status === "in_range" ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                      : t.status === "out_of_range" ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}>
                      {t.status === "in_range" ? "✓ In range" : t.status === "out_of_range" ? "Out of range" : "No data"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3">
                <p className="text-xs text-gray-500 dark:text-slate-400">No active care plan for {info.label} yet.</p>
                <Link href="/dashboard/care-plan" className="mt-2 inline-block text-xs font-semibold text-violet-600 dark:text-violet-300 hover:underline">
                  + Set up care plan →
                </Link>
              </div>
            )}
          </section>

          {/* Active prescriptions */}
          <section className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300">💊</span>
              <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">Active prescriptions</h2>
            </div>
            {rxs.filter((r) => r.status === "active").length > 0 ? (
              <ul className="mt-3 space-y-3">
                {rxs.filter((r) => r.status === "active").slice(0, 4).map((rx) => (
                  <li key={rx.id} className="rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-950/40 p-3">
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Dr. {rx.data.doctorName || "Unknown"} · {new Date(rx.createdAt).toLocaleDateString()}
                    </p>
                    {rx.data.diagnosis && <p className="mt-1 text-sm font-medium text-gray-900 dark:text-slate-100">{rx.data.diagnosis}</p>}
                    {rx.data.medications && rx.data.medications.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {rx.data.medications.slice(0, 4).map((m, i) => (
                          <li key={i} className="text-xs text-gray-700 dark:text-slate-300">
                            <span className="font-medium">{m.name}</span>
                            {m.dose ? ` · ${m.dose}` : ""}
                            {m.frequency ? ` · ${m.frequency}` : ""}
                            {m.duration ? ` · ${m.duration}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link href={`/prescription/${rx.id}`} className="mt-2 inline-block text-[11px] font-semibold text-emerald-600 dark:text-emerald-300 hover:underline">
                      View →
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">No active prescriptions.</p>
            )}
          </section>

          {/* Today's doses */}
          <section className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300">⏰</span>
              <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">Today&apos;s doses</h2>
            </div>
            {adherence?.today && adherence.today.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {adherence.today.slice(0, 6).map((d, i) => (
                  <li key={`${d.rxId}-${d.slot}-${i}`} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-gray-700 dark:text-slate-300">
                      <span className="font-medium">{d.medName}</span>
                      <span className="ml-1 text-xs text-gray-500 dark:text-slate-400">· {d.slot}</span>
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      d.status === "taken" ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                      : d.status === "missed" ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                      : d.status === "skipped" ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                    }`}>
                      {d.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">No scheduled doses for today.</p>
            )}
            <Link href="/dashboard/adherence" className="mt-3 inline-block text-xs font-semibold text-amber-600 dark:text-amber-300 hover:underline">
              Full schedule →
            </Link>
          </section>

          {/* Quick actions */}
          <section className="lg:col-span-3 grid gap-3 sm:grid-cols-3">
            <Link href="/consult-now" className="group flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md hover:shadow-emerald-500/10 transition">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-lg text-white shadow-md">🩺</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Book follow-up</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Online doctor in 2 min</p>
              </div>
            </Link>
            <Link href="/lab-marketplace" className="group flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md hover:shadow-sky-500/10 transition">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 text-lg text-white shadow-md">🧪</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Order lab tests</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">HbA1c, lipid panel, more</p>
              </div>
            </Link>
            <Link href="/shop" className="group flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md hover:shadow-violet-500/10 transition">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-lg text-white shadow-md">💊</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Refill medicines</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">From nearby pharmacy</p>
              </div>
            </Link>
          </section>
        </div>
      )}
    </main>
  );
}

function computeTrend(readings: VitalReading[]): { direction: "up" | "down" | "flat"; label: string } | null {
  if (readings.length < 2) return null;
  const first = readings[0].value;
  const last = readings[readings.length - 1].value;
  const diff = last - first;
  if (Math.abs(diff) < first * 0.02) return { direction: "flat", label: "stable" };
  const pct = Math.round(Math.abs(diff / first) * 100);
  return { direction: diff > 0 ? "up" : "down", label: `${pct}% over ${readings.length} readings` };
}

function Sparkline({ readings }: { readings: VitalReading[] }) {
  if (readings.length < 2) return null;
  const values = readings.map((r) => r.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 400;
  const h = 60;
  const step = w / (values.length - 1);
  const points = values.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 h-16 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(244 63 94)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(244 63 94)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${h} ${points} ${w},${h}`} fill="url(#sparkfill)" />
      <polyline points={points} fill="none" stroke="rgb(244 63 94)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
