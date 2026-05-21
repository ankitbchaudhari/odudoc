"use client";

// CAPA (Corrective + Preventive Action) workflow admin.
// Tracks every quality-issue resolution from open → RCA →
// actions → verification of effectiveness.

import { useCallback, useEffect, useState } from "react";
import ExportButtons from "@/components/ExportButtons";

type Status = "open" | "investigating" | "actions_pending" | "verifying" | "closed" | "reopened";
type Source = "incident" | "mortality_review" | "infection_control" | "audit_finding" | "patient_complaint" | "medication_error" | "other";
type Category = "people" | "process" | "equipment" | "environment" | "communication" | "policy";

interface CapaAction {
  description: string;
  owner: string;
  ownerEmail?: string;
  dueOn: string;
  kind: "corrective" | "preventive";
  completedAt?: string;
  completedBy?: string;
  evidenceNote?: string;
}

interface CapaRecord {
  id: string;
  sourceKind: Source;
  sourceRef?: string;
  problem: string;
  severity?: "low" | "medium" | "high" | "critical";
  rca?: { whys: string[]; category: Category };
  actions: CapaAction[];
  status: Status;
  voeDueOn?: string;
  voeDoneAt?: string;
  voeRecurred?: boolean;
  voeNote?: string;
  history: Array<{ at: string; actor: string; event: string; detail?: string }>;
  openedAt: string;
  closedAt?: string;
}

const STATUS_PALETTE: Record<Status, string> = {
  open: "bg-sky-100 text-sky-800",
  investigating: "bg-indigo-100 text-indigo-800",
  actions_pending: "bg-amber-100 text-amber-900",
  verifying: "bg-violet-100 text-violet-800",
  closed: "bg-emerald-100 text-emerald-800",
  reopened: "bg-rose-100 text-rose-800",
};

const SEVERITY_TONE: Record<NonNullable<CapaRecord["severity"]>, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-rose-100 text-rose-800",
};

export default function CapaAdminPage() {
  const [records, setRecords] = useState<CapaRecord[]>([]);
  const [filter, setFilter] = useState<Status | "">("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CapaRecord | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/capa${filter ? `?status=${filter}` : ""}`, { cache: "no-store" });
      const j = await r.json();
      setRecords(j.records || []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { refresh(); }, [refresh]);

  const patch = async (id: string, body: Record<string, unknown>) => {
    const r = await fetch(`/api/capa?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) { alert(j.error || "Action failed"); return; }
    if (selected?.id === id) setSelected(j.record);
    refresh();
  };

  const recordRca = (r: CapaRecord) => {
    const whyText = prompt("Root cause 5-whys (one per line)?");
    if (!whyText) return;
    const cat = prompt("Category (people | process | equipment | environment | communication | policy)?", "process");
    if (!cat) return;
    patch(r.id, {
      action: "rca",
      rca: { whys: whyText.split("\n").map((s) => s.trim()).filter(Boolean), category: cat },
    });
  };

  const addAction = (r: CapaRecord) => {
    const description = prompt("Action description?");
    if (!description) return;
    const owner = prompt("Owner name?");
    if (!owner) return;
    const dueOn = prompt("Due date (YYYY-MM-DD)?");
    if (!dueOn) return;
    const kind = (prompt("Corrective or preventive?", "corrective") || "corrective").toLowerCase() === "preventive" ? "preventive" : "corrective";
    patch(r.id, { action: "add_action", newAction: { description, owner, dueOn, kind } });
  };

  const completeAction = (r: CapaRecord, idx: number) => {
    const note = prompt("Evidence note (optional)?") || undefined;
    patch(r.id, { action: "complete_action", actionIndex: idx, evidenceNote: note });
  };

  const voe = (r: CapaRecord, recurred: boolean) => {
    const note = prompt(`VoE note for ${recurred ? "RECURRED" : "no recurrence"}?`) || undefined;
    patch(r.id, { action: "voe", voeRecurred: recurred, voeNote: note });
  };

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Quality · CAPA</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Corrective + Preventive Actions</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Open → investigating → actions pending → verifying → closed. VoE 30 days after action completion;
            reopens if the issue recurred.
          </p>
          <div className="mt-3"><ExportButtons type="capa" /></div>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Status | "")}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="actions_pending">Actions pending</option>
          <option value="verifying">Verifying</option>
          <option value="closed">Closed</option>
          <option value="reopened">Reopened</option>
        </select>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading && records.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">Loading…</p>
        ) : records.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">No CAPAs {filter ? `in "${filter}"` : "yet"}.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {records.map((r) => {
              const totalActions = r.actions.length;
              const doneActions = r.actions.filter((a) => a.completedAt).length;
              return (
                <li
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="cursor-pointer p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{r.problem}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_PALETTE[r.status]}`}>
                          {r.status.replace(/_/g, " ")}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {r.sourceKind.replace(/_/g, " ")}
                        </span>
                        {r.severity && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_TONE[r.severity]}`}>
                            {r.severity}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Opened {new Date(r.openedAt).toLocaleDateString()} · {doneActions}/{totalActions} action{totalActions === 1 ? "" : "s"} done
                        {r.rca && <> · RCA: {r.rca.category}</>}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1 self-start" onClick={(e) => e.stopPropagation()}>
                      {(r.status === "open" || r.status === "investigating") && !r.rca && (
                        <Btn label="Record RCA" onClick={() => recordRca(r)} color="bg-indigo-600" />
                      )}
                      {(r.status === "investigating" || r.status === "actions_pending" || (r.status === "open" && r.rca)) && (
                        <Btn label="+ Action" onClick={() => addAction(r)} color="bg-amber-600" />
                      )}
                      {r.status === "verifying" && (
                        <>
                          <Btn label="VoE: no recurrence" onClick={() => voe(r, false)} color="bg-emerald-600" />
                          <Btn label="VoE: recurred" onClick={() => voe(r, true)} color="bg-rose-600" />
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50" onClick={() => setSelected(null)}>
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{selected.sourceKind.replace(/_/g, " ")}</p>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{selected.problem}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="text-2xl text-slate-400">×</button>
            </div>

            {selected.rca && (
              <section className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">RCA · {selected.rca.category}</p>
                <ol className="mt-2 list-inside list-decimal text-sm space-y-1">
                  {selected.rca.whys.map((w, i) => <li key={i}>{w}</li>)}
                </ol>
              </section>
            )}

            <section className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Actions ({selected.actions.length})</p>
              {selected.actions.length === 0 ? (
                <p className="mt-1 text-sm text-slate-500 italic">None yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {selected.actions.map((a, i) => (
                    <li key={i} className={`rounded-lg p-2 text-xs ${a.completedAt ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-amber-50 dark:bg-amber-950/30"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            [{a.kind}] {a.description}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                            Owner: {a.owner} · Due {a.dueOn}
                            {a.completedAt && <> · Completed {new Date(a.completedAt).toLocaleDateString()} by {a.completedBy}</>}
                          </p>
                          {a.evidenceNote && <p className="mt-0.5 text-[11px] text-slate-500">Evidence: {a.evidenceNote}</p>}
                        </div>
                        {!a.completedAt && (
                          <button
                            onClick={() => completeAction(selected, i)}
                            className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white"
                          >
                            Mark done
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {selected.voeDueOn && (
              <section className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs dark:border-violet-700 dark:bg-violet-950/30">
                <p className="font-bold text-violet-900 dark:text-violet-100">Verification of Effectiveness</p>
                <p className="mt-1 text-violet-800 dark:text-violet-200">
                  VoE due {new Date(selected.voeDueOn).toLocaleDateString()}.
                  {selected.voeDoneAt && (
                    <>
                      {" Reviewed "}
                      {new Date(selected.voeDoneAt).toLocaleDateString()}: {selected.voeRecurred ? "recurred" : "no recurrence"}.
                      {selected.voeNote && <> {selected.voeNote}</>}
                    </>
                  )}
                </p>
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
