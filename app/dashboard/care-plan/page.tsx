"use client";

// Care plan tracker — chronic-condition view.
//
// Each plan card shows: condition title, diagnosis date, target rows
// (BP < 130/80, glucose 80-130 mg/dL, etc.) with a 30-day compliance
// % bar from the patient's vital readings, free-text goals, and a
// link into /dashboard/vitals to log a fresh reading.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface VitalTarget {
  kind: "bp" | "weight" | "glucose" | "heart_rate" | "spo2" | "temperature";
  min?: number; max?: number; max2?: number;
  unit: string; label: string;
}
interface TargetCompliance {
  target: VitalTarget;
  count: number;
  inRangePct: number;
  latest?: string;
  latestAt?: string;
}
interface CarePlan {
  id: string; userId: string;
  condition: string; title: string;
  diagnosedOn?: string; doctorEmail?: string;
  targets: VitalTarget[]; goals: string[];
  notes?: string; active: boolean;
  createdAt: string; updatedAt: string;
  compliance: TargetCompliance[];
}
interface ConditionOpt { value: string; label: string; }

const KIND_EMOJI: Record<VitalTarget["kind"], string> = {
  bp: "🩺", weight: "⚖️", glucose: "🩸", heart_rate: "❤️", spo2: "🫁", temperature: "🌡️",
};

export default function CarePlanPage() {
  const [plans, setPlans] = useState<CarePlan[]>([]);
  const [conditions, setConditions] = useState<ConditionOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/care-plan", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setPlans(d.plans || []);
        setConditions(d.conditions || []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const removePlan = async (id: string) => {
    if (!confirm("Delete this care plan? Your vital readings stay — only the plan is removed.")) return;
    await fetch(`/api/care-plan?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  };

  const togglePlanActive = async (p: CarePlan) => {
    await fetch("/api/care-plan", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, active: !p.active }),
    });
    load();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Care plans</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Chronic-condition goals — targets, compliance %, lifestyle reminders. Pulls vitals from the last 30 days.
          </p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
        >
          {showCreate ? "Cancel" : "+ New plan"}
        </button>
      </div>

      {showCreate && (
        <CreatePlanForm conditions={conditions} onCreated={() => { setShowCreate(false); load(); }} />
      )}

      {loading && <p className="rounded-xl bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-400 shadow-sm">Loading…</p>}

      {!loading && plans.length === 0 && !showCreate && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white dark:bg-slate-900 p-10 text-center">
          <p className="text-3xl">📋</p>
          <p className="mt-2 text-base font-bold text-slate-700 dark:text-slate-300">No active care plans</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add a plan for an ongoing condition (diabetes, hypertension, etc.) to track targets over time.</p>
          <button onClick={() => setShowCreate(true)} className="mt-4 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white">+ New plan</button>
        </div>
      )}

      <div className="space-y-6">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} onDelete={() => removePlan(p.id)} onToggle={() => togglePlanActive(p)} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan, onDelete, onToggle }: { plan: CarePlan; onDelete: () => void; onToggle: () => void }) {
  return (
    <article className={`rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-sm ring-1 ${plan.active ? "ring-slate-200 dark:ring-slate-800" : "ring-slate-100 opacity-70"}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{plan.title}</h2>
            {!plan.active && <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300">Paused</span>}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {plan.diagnosedOn && <>Since {new Date(plan.diagnosedOn).toLocaleDateString()} · </>}
            {plan.doctorEmail && <>{plan.doctorEmail} · </>}
            Updated {new Date(plan.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-none gap-1">
          <button onClick={onToggle} className="rounded-lg bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-900">
            {plan.active ? "Pause" : "Reactivate"}
          </button>
          <button onClick={onDelete} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" aria-label="Delete plan">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
            </svg>
          </button>
        </div>
      </header>

      {plan.compliance.length > 0 && (
        <section className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Targets — last 30 days</p>
          <ul className="space-y-2">
            {plan.compliance.map((c, i) => (
              <li key={i} className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3 ring-1 ring-slate-100">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-base">{KIND_EMOJI[c.target.kind]}</span>
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{c.target.label}</p>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {targetText(c.target)}
                    </span>
                  </div>
                  {c.count > 0 ? (
                    <div className="flex flex-none items-center gap-3">
                      <span className="text-xs tabular-nums text-slate-700 dark:text-slate-300">{c.latest} {c.target.unit}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        c.inRangePct >= 80 ? "bg-emerald-100 text-emerald-800"
                        : c.inRangePct >= 50 ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                      }`}>
                        {c.inRangePct}% in range
                      </span>
                    </div>
                  ) : (
                    <Link href="/dashboard/vitals" className="flex-none text-xs font-semibold text-indigo-600 hover:underline">
                      Log a reading →
                    </Link>
                  )}
                </div>
                {c.count > 0 && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${
                        c.inRangePct >= 80 ? "bg-emerald-500"
                        : c.inRangePct >= 50 ? "bg-amber-500"
                        : "bg-rose-500"
                      }`}
                      style={{ width: `${c.inRangePct}%` }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {plan.goals.length > 0 && (
        <section className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Lifestyle goals</p>
          <ul className="space-y-1.5">
            {plan.goals.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-indigo-500" />
                {g}
              </li>
            ))}
          </ul>
        </section>
      )}

      {plan.notes && (
        <section className="mt-4 rounded-xl bg-amber-50/60 p-3 text-xs text-amber-900 ring-1 ring-amber-100">
          📝 {plan.notes}
        </section>
      )}
    </article>
  );
}

function targetText(t: VitalTarget): string {
  if (t.kind === "bp" && t.max && t.max2) return `target < ${t.max}/${t.max2}`;
  if (t.min !== undefined && t.max !== undefined) return `target ${t.min}–${t.max}`;
  if (t.min !== undefined) return `target ≥ ${t.min}`;
  if (t.max !== undefined) return `target ≤ ${t.max}`;
  return "track only";
}

function CreatePlanForm({ conditions, onCreated }: { conditions: ConditionOpt[]; onCreated: () => void }) {
  const [condition, setCondition] = useState(conditions[0]?.value || "diabetes_t2");
  const [title, setTitle] = useState("");
  const [diagnosedOn, setDiagnosedOn] = useState("");
  const [goals, setGoals] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null); setBusy(true);
    try {
      const res = await fetch("/api/care-plan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condition,
          title: title.trim() || undefined,
          diagnosedOn: diagnosedOn || undefined,
          goals: goals.split("\n").map((g) => g.trim()).filter(Boolean),
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b.error || `Failed (${res.status})`);
        return;
      }
      onCreated();
    } finally { setBusy(false); }
  };

  return (
    <div className="mb-6 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">New care plan</p>
      {error && <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Condition
          <select value={condition} onChange={(e) => setCondition(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-normal">
            {conditions.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Diagnosed on (optional)
          <input type="date" value={diagnosedOn} onChange={(e) => setDiagnosedOn(e.target.value)} max={new Date().toISOString().slice(0, 10)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-normal" />
        </label>
        <label className="sm:col-span-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          Title (optional override)
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Auto: condition name" className="mt-1 w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-normal" />
        </label>
        <label className="sm:col-span-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          Lifestyle goals (one per line)
          <textarea
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            rows={4}
            placeholder={"Walk 30 minutes daily\nNo added sugar\nSleep 7 hours"}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="sm:col-span-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          Notes (optional)
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why this plan, lifestyle context, etc." className="mt-1 w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-normal" />
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={submit} disabled={busy} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50">
          {busy ? "Creating…" : "Create plan"}
        </button>
      </div>
    </div>
  );
}
