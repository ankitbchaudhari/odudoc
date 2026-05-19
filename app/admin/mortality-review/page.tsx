"use client";

// M&M (Morbidity & Mortality) review committee queue.
// Cases auto-flow here from the discharge module on death /
// major-morbidity events. The committee chair walks the queue
// through the schedule → present → grade → close lifecycle.

import { useCallback, useEffect, useState } from "react";

type Status = "queued" | "scheduled" | "presented" | "graded" | "closed";
type Kind = "death" | "major_morbidity" | "near_miss" | "unexpected_outcome";
type Preventability = "non_preventable" | "possibly_preventable" | "preventable" | "indeterminate";

interface MmCase {
  id: string;
  patientName: string;
  patientMrn?: string;
  kind: Kind;
  eventDate: string;
  primaryDiagnosis: string;
  causeOfDeath?: string;
  summary: string;
  status: Status;
  scheduledFor?: string;
  presenterName?: string;
  discussion?: string;
  preventability?: Preventability;
  capaActions?: Array<{ description: string; owner: string; dueOn?: string }>;
  history: Array<{ at: string; actor: string; event: string; detail?: string }>;
  createdAt: string;
}

const STATUS_PALETTE: Record<Status, string> = {
  queued: "bg-sky-100 text-sky-800",
  scheduled: "bg-indigo-100 text-indigo-800",
  presented: "bg-violet-100 text-violet-800",
  graded: "bg-amber-100 text-amber-900",
  closed: "bg-slate-200 text-slate-700",
};

const PREVENTABILITY_TONE: Record<Preventability, string> = {
  non_preventable: "bg-emerald-100 text-emerald-800",
  possibly_preventable: "bg-amber-100 text-amber-900",
  preventable: "bg-rose-100 text-rose-900",
  indeterminate: "bg-slate-200 text-slate-700",
};

const KIND_LABEL: Record<Kind, string> = {
  death: "Death",
  major_morbidity: "Major morbidity",
  near_miss: "Near miss",
  unexpected_outcome: "Unexpected outcome",
};

export default function MortalityReviewPage() {
  const [cases, setCases] = useState<MmCase[]>([]);
  const [statusFilter, setStatusFilter] = useState<Status | "">("queued");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MmCase | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/mm-review${statusFilter ? `?status=${statusFilter}` : ""}`, { cache: "no-store" });
      const j = await r.json();
      setCases(j.cases || []);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  const act = async (id: string, body: Record<string, unknown>) => {
    const r = await fetch(`/api/mm-review?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) { alert(j.error || "Action failed"); return; }
    if (selected?.id === id) setSelected(j.case);
    refresh();
  };

  const schedule = (c: MmCase) => {
    const when = prompt("Schedule for (YYYY-MM-DD HH:MM)?");
    if (!when) return;
    const presenterName = prompt("Presenter name?");
    if (!presenterName) return;
    act(c.id, { action: "schedule", scheduledFor: when, presenterId: presenterName.toLowerCase().replace(/\s+/g, "-"), presenterName });
  };
  const present = (c: MmCase) => {
    const discussion = prompt("Discussion notes from committee?");
    if (!discussion) return;
    act(c.id, { action: "present", discussion });
  };
  const grade = (c: MmCase, level: Preventability) => {
    const capaText = prompt("CAPA actions (one per line — optional)?") || "";
    const capaActions = capaText
      .split("\n").map((s) => s.trim()).filter(Boolean)
      .map((line) => ({ description: line, owner: "TBD" }));
    act(c.id, { action: "grade", preventability: level, capaActions });
  };
  const close = (c: MmCase) => act(c.id, { action: "close" });

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600">Quality · M&amp;M review</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Mortality &amp; morbidity review</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Cases queued for committee review. Workflow: queued → scheduled → presented → graded → closed.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Status | "")}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="">All statuses</option>
          <option value="queued">Queued</option>
          <option value="scheduled">Scheduled</option>
          <option value="presented">Presented</option>
          <option value="graded">Graded</option>
          <option value="closed">Closed</option>
        </select>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading && cases.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">Loading…</p>
        ) : cases.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">No cases {statusFilter ? `in "${statusFilter}"` : ""}.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {cases.map((c) => (
              <li
                key={c.id}
                onClick={() => setSelected(c)}
                className="cursor-pointer p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{c.patientName}</p>
                      {c.patientMrn && <span className="text-xs text-slate-500">MRN {c.patientMrn}</span>}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_PALETTE[c.status]}`}>
                        {c.status}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {KIND_LABEL[c.kind]}
                      </span>
                      {c.preventability && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${PREVENTABILITY_TONE[c.preventability]}`}>
                          {c.preventability.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">{c.primaryDiagnosis}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{c.summary}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Event {new Date(c.eventDate).toLocaleDateString()}
                      {c.scheduledFor && <> · Scheduled {new Date(c.scheduledFor).toLocaleString()}</>}
                      {c.presenterName && <> · Presenter: {c.presenterName}</>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 self-start" onClick={(e) => e.stopPropagation()}>
                    {c.status === "queued"    && <Btn label="Schedule" onClick={() => schedule(c)} color="bg-indigo-600" />}
                    {c.status === "scheduled" && <Btn label="Mark presented" onClick={() => present(c)} color="bg-violet-600" />}
                    {c.status === "presented" && (
                      <>
                        <Btn label="Non-prev." onClick={() => grade(c, "non_preventable")} color="bg-emerald-600" />
                        <Btn label="Possibly" onClick={() => grade(c, "possibly_preventable")} color="bg-amber-600" />
                        <Btn label="Preventable" onClick={() => grade(c, "preventable")} color="bg-rose-600" />
                      </>
                    )}
                    {c.status === "graded"    && <Btn label="Close" onClick={() => close(c)} color="bg-slate-600" />}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50" onClick={() => setSelected(null)}>
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{KIND_LABEL[selected.kind]}</p>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selected.patientName}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">{selected.primaryDiagnosis}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-2xl text-slate-400">×</button>
            </div>

            <section className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Case summary</p>
              <p className="mt-1 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">{selected.summary}</p>
            </section>

            {selected.causeOfDeath && (
              <section className="mt-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Cause of death</p>
                <p className="mt-1 text-sm">{selected.causeOfDeath}</p>
              </section>
            )}

            {selected.discussion && (
              <section className="mt-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Committee discussion</p>
                <p className="mt-1 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">{selected.discussion}</p>
              </section>
            )}

            {selected.capaActions && selected.capaActions.length > 0 && (
              <section className="mt-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">CAPA actions</p>
                <ul className="mt-1 space-y-1">
                  {selected.capaActions.map((a, i) => (
                    <li key={i} className="rounded-lg bg-amber-50 p-2 text-xs dark:bg-amber-950/30">
                      {a.description} · <em>owner: {a.owner}</em>{a.dueOn && <> · due {a.dueOn}</>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Timeline</p>
              <ol className="mt-2 space-y-2">
                {selected.history.map((h, i) => (
                  <li key={i} className="rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{h.event.replace(/_/g, " ")}</p>
                    {h.detail && <p className="mt-0.5 text-slate-600 dark:text-slate-300">{h.detail}</p>}
                    <p className="mt-0.5 text-[10px] text-slate-500">{new Date(h.at).toLocaleString()} · {h.actor}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      )}
    </main>
  );
}

function Btn({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick} className={`rounded-md ${color} px-2.5 py-1 text-[11px] font-bold text-white`}>
      {label}
    </button>
  );
}
