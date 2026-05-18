"use client";

// Patient + doctor view of multi-sitting procedure plans.
// Patient sees their own; doctor sees plans they own.

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface Plan {
  id: string;
  patientName: string;
  doctorName: string;
  category: string;
  title: string;
  plannedSittings: number;
  packageFeeUsd: number;
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "paused";
  progress: { done: number; planned: number };
  createdAt: string;
}

interface Sitting {
  id: string;
  sequence: number;
  scheduledFor: string;
  doneAt?: string;
  status: "planned" | "done" | "missed" | "rescheduled" | "cancelled";
  note?: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  dental_rct: "Dental — Root Canal",
  dental_orthodontic: "Dental — Orthodontic",
  dental_implant: "Dental — Implant",
  oncology_chemo: "Oncology — Chemo",
  oncology_radio: "Oncology — Radio",
  physio_rehab: "Physio — Rehab",
  skin_laser: "Skin — Laser",
  fertility_ivf: "Fertility — IVF",
  psychiatry_therapy: "Psychiatry — Therapy",
  other: "Other",
};

const STATUS_PALETTE: Record<Plan["status"], string> = {
  scheduled: "bg-sky-100 text-sky-800",
  in_progress: "bg-emerald-100 text-emerald-800",
  completed: "bg-slate-200 text-slate-700",
  cancelled: "bg-rose-100 text-rose-800",
  paused: "bg-amber-100 text-amber-900",
};

export default function ProcedurePlansPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isDoctor = role === "doctor" || role === "admin";

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [sittings, setSittings] = useState<Sitting[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/procedure-plans", { cache: "no-store" });
      const j = await r.json();
      setPlans(j.plans || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (!selected) { setSittings([]); return; }
    fetch(`/api/procedure-plans/${selected.id}/sittings`).then(async (r) => {
      const j = await r.json();
      setSittings(j.sittings || []);
    });
  }, [selected]);

  const completeSitting = async (sittingId: string) => {
    if (!selected) return;
    const note = prompt("Note for this sitting (optional)?") || undefined;
    await fetch(`/api/procedure-plans/${selected.id}/sittings`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sittingId, note }),
    });
    // Reload the drawer.
    fetch(`/api/procedure-plans/${selected.id}/sittings`).then(async (r) => {
      const j = await r.json();
      setSittings(j.sittings || []);
    });
    refresh();
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Care plans</p>
      <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">
        {isDoctor ? "My procedure plans" : "Your procedure plans"}
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Multi-sitting care plans — RCT, chemo cycles, orthodontic adjustments, physio rehab, IVF, therapy.
        Each plan tracks progress against the agreed total sittings.
      </p>

      <div className="mt-6 space-y-3">
        {loading && plans.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            Loading…
          </p>
        ) : plans.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            {isDoctor ? "You haven't created any procedure plans yet." : "No procedure plans assigned to you. When your doctor sets one up, it appears here."}
          </p>
        ) : (
          plans.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="block w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-violet-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900 dark:text-slate-100">{p.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_PALETTE[p.status]}`}>
                      {p.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {CATEGORY_LABEL[p.category] || p.category}
                    {isDoctor ? <> · Patient: {p.patientName}</> : <> · Dr. {p.doctorName}</>}
                    {" · "}${p.packageFeeUsd}
                  </p>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{p.progress.done} of {p.progress.planned} sittings complete</span>
                      <span>{Math.round((p.progress.done / Math.max(p.progress.planned, 1)) * 100)}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-600"
                        style={{ width: `${Math.min(100, (p.progress.done / Math.max(p.progress.planned, 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50" onClick={() => setSelected(null)}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{CATEGORY_LABEL[selected.category] || selected.category}</p>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="text-2xl text-slate-400">×</button>
            </div>

            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {isDoctor ? `Patient: ${selected.patientName}` : `Dr. ${selected.doctorName}`} · {selected.progress.done}/{selected.progress.planned} sittings done
            </p>

            <ol className="mt-5 space-y-2">
              {sittings.map((s) => {
                const isDone = s.status === "done";
                return (
                  <li
                    key={s.id}
                    className={`rounded-xl border p-3 ${isDone ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30" : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800"}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Sitting {s.sequence} · {new Date(s.scheduledFor).toLocaleDateString()}
                      </p>
                      {isDone ? (
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Done</span>
                      ) : isDoctor ? (
                        <button
                          onClick={() => completeSitting(s.id)}
                          className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white"
                        >
                          Mark done
                        </button>
                      ) : (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800">Planned</span>
                      )}
                    </div>
                    {s.note && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{s.note}</p>}
                    {s.doneAt && <p className="mt-0.5 text-[10px] text-slate-500">Completed {new Date(s.doneAt).toLocaleString()}</p>}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
    </main>
  );
}
