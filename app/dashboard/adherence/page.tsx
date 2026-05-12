"use client";

// Medication adherence — today's schedule + 7-day stats.
//
// Patients tap "Taken" / "Skipped" per dose. The same row updates
// in place if they re-tap, so a tap-fail doesn't double-log.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface ScheduledDose {
  rxId: string; medIndex: number; medName: string; dose: string;
  frequency: string; instructions?: string;
  scheduledDate: string; slot: string;
  status: "due" | "taken" | "skipped"; loggedAt?: string;
}
interface Stats { adherencePct: number; taken: number; logged: number; activePrescriptions: number; }

const SLOT_LABEL: Record<string, string> = { morning: "Morning", noon: "Noon", evening: "Evening", night: "Night" };
const SLOT_TIME: Record<string, string> = { morning: "8:00 AM", noon: "1:00 PM", evening: "6:00 PM", night: "10:00 PM" };
const SLOT_EMOJI: Record<string, string> = { morning: "☀️", noon: "🌤️", evening: "🌆", night: "🌙" };

export default function AdherencePage() {
  const [schedule, setSchedule] = useState<ScheduledDose[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/adherence", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setSchedule(d.today || []);
        setStats(d.stats || null);
      } else if (r.status === 401) setError("Please sign in.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const log = async (d: ScheduledDose, action: "taken" | "skipped") => {
    await fetch("/api/adherence", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rxId: d.rxId, medIndex: d.medIndex,
        scheduledDate: d.scheduledDate, slot: d.slot, action,
      }),
    });
    load();
  };

  // Group by slot for the daily schedule.
  const grouped = schedule.reduce<Record<string, ScheduledDose[]>>((acc, d) => {
    (acc[d.slot] = acc[d.slot] || []).push(d);
    return acc;
  }, {});
  const slotOrder = ["morning", "noon", "evening", "night"].filter((s) => grouped[s]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Today&apos;s medications</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tap each dose as you take it. Missed doses help your doctor adjust the plan.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Stat label="7-day adherence" value={`${stats.adherencePct}%`} tone={stats.adherencePct >= 80 ? "ok" : stats.adherencePct >= 60 ? "warn" : "critical"} />
          <Stat label="Doses taken" value={String(stats.taken)} sub={`of ${stats.logged} logged`} />
          <Stat label="Active prescriptions" value={String(stats.activePrescriptions)} />
        </div>
      )}

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
      {loading && <p className="rounded-xl bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-400 shadow-sm">Loading…</p>}

      {!loading && schedule.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white dark:bg-slate-900 p-10 text-center">
          <p className="text-3xl">💊</p>
          <p className="mt-2 text-base font-bold text-slate-700 dark:text-slate-300">No active prescriptions</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Once a doctor issues a prescription, today&apos;s schedule appears here.</p>
          <Link href="/dashboard/prescriptions" className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white">View prescriptions</Link>
        </div>
      )}

      {slotOrder.map((slot) => (
        <section key={slot} className="mb-6">
          <header className="mb-3 flex items-center gap-2">
            <span className="text-xl">{SLOT_EMOJI[slot]}</span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{SLOT_LABEL[slot]}</p>
            <span className="text-xs text-slate-400">{SLOT_TIME[slot]}</span>
          </header>
          <ul className="space-y-2">
            {grouped[slot].map((d) => {
              const isTaken = d.status === "taken";
              const isSkipped = d.status === "skipped";
              return (
                <li
                  key={`${d.rxId}-${d.medIndex}-${d.slot}`}
                  className={`rounded-xl border p-3 shadow-sm transition-all ${
                    isTaken ? "border-emerald-200 bg-emerald-50/40"
                    : isSkipped ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 opacity-70"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{d.medName}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{d.dose} · {d.frequency}</p>
                      {d.instructions && <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{d.instructions}</p>}
                      {d.loggedAt && (
                        <p className="mt-1 text-[10px] text-slate-400">
                          {isTaken ? "Taken" : "Skipped"} at {new Date(d.loggedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => log(d, "taken")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                          isTaken ? "bg-emerald-600 text-white" : "bg-white dark:bg-slate-900 text-emerald-700 ring-1 ring-emerald-300 hover:bg-emerald-50"
                        }`}
                      >
                        {isTaken ? "✓ Taken" : "Mark taken"}
                      </button>
                      <button
                        onClick={() => log(d, "skipped")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                          isSkipped ? "bg-slate-700 text-white" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 ring-1 ring-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Stat({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub?: string; tone?: "neutral" | "ok" | "warn" | "critical" }) {
  const ring =
    tone === "ok" ? "ring-emerald-200 bg-emerald-50"
    : tone === "warn" ? "ring-amber-200 bg-amber-50"
    : tone === "critical" ? "ring-rose-200 bg-rose-50"
    : "ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900";
  return (
    <div className={`rounded-xl p-3 ring-1 ${ring}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-slate-100">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}
