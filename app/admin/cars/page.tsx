"use client";

// V13 §5 — Corrective Action Request board (admin view).
//
// Lists all CARs grouped by status. Each row shows severity,
// assignee, both deadlines, and a one-click "Advance" button that
// walks the lifecycle (open → acknowledged → investigating →
// action_planned → closed → verified). Click into a row for the
// full update timeline + a notes/root-cause/corrective-action form.

import { useCallback, useEffect, useState } from "react";

type CarStatus = "open" | "acknowledged" | "investigating" | "action_planned" | "closed" | "verified";
type CarSeverity = "low" | "medium" | "high" | "critical";

interface CarUpdate {
  at: string; byEmail: string; byRole?: string; note: string; toStatus?: CarStatus;
}
interface Car {
  id: string;
  eventId: string;
  breachRule: string;
  breachLevel: 1 | 2 | 3 | 4 | 5;
  category: "clinical" | "admin" | "financial" | "data_access" | "system";
  title: string;
  description: string;
  severity: CarSeverity;
  status: CarStatus;
  assignedToEmail: string;
  assignedToRole?: string;
  openedByEmail: string;
  respondByAt: string;
  closeByAt: string;
  rootCause?: string;
  correctiveAction?: string;
  updates: CarUpdate[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  closedLate?: boolean;
}

const SEV_PILL: Record<CarSeverity, string> = {
  low:      "bg-emerald-100 text-emerald-800",
  medium:   "bg-amber-100 text-amber-800",
  high:     "bg-orange-100 text-orange-800",
  critical: "bg-rose-100 text-rose-800",
};

const STATUS_LABEL: Record<CarStatus, string> = {
  open:           "Open",
  acknowledged:   "Acknowledged",
  investigating:  "Investigating",
  action_planned: "Action planned",
  closed:         "Closed",
  verified:       "Verified",
};

const NEXT_STATE: Record<CarStatus, CarStatus | null> = {
  open:           "acknowledged",
  acknowledged:   "investigating",
  investigating:  "action_planned",
  action_planned: "closed",
  closed:         "verified",
  verified:       null,
};

export default function CarsPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [status, setStatus] = useState<"" | CarStatus>("");
  const [severity, setSeverity] = useState<"" | CarSeverity>("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Car | null>(null);
  const [advanceNote, setAdvanceNote] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (severity) qs.set("severity", severity);
    if (overdueOnly) qs.set("overdueOnly", "1");
    const r = await fetch(`/api/cars?${qs}`, { cache: "no-store" });
    if (r.ok) setCars((await r.json()).cars || []);
    setLoading(false);
  }, [status, severity, overdueOnly]);
  useEffect(() => { load(); }, [load]);

  const reload = async (id?: string) => {
    await load();
    if (id) {
      const r = await fetch(`/api/cars/${id}`, { cache: "no-store" });
      if (r.ok) setSelected((await r.json()).car);
    }
  };

  const advance = async () => {
    if (!selected) return;
    const next = NEXT_STATE[selected.status];
    if (!next) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/cars/${selected.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedCurrentState: selected.status,
          note: advanceNote || `Advanced to ${STATUS_LABEL[next]}.`,
          rootCause: rootCause || undefined,
          correctiveAction: correctiveAction || undefined,
        }),
      });
      if (r.ok) {
        setAdvanceNote(""); setRootCause(""); setCorrectiveAction("");
        await reload(selected.id);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Corrective Action Requests</h1>
        <p className="mt-1 text-sm text-gray-600">
          V13 §5 quality-management workflow. Each CAR captures a root
          cause and a corrective action against an accountability breach.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="text-xs font-semibold text-gray-600">Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as "" | CarStatus)} className="rounded-lg border border-gray-300 px-2 py-1 text-sm">
          <option value="">All</option>
          {(Object.keys(STATUS_LABEL) as CarStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <label className="ml-3 text-xs font-semibold text-gray-600">Severity</label>
        <select value={severity} onChange={(e) => setSeverity(e.target.value as "" | CarSeverity)} className="rounded-lg border border-gray-300 px-2 py-1 text-sm">
          <option value="">All</option>
          {(["low", "medium", "high", "critical"] as CarSeverity[]).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="ml-3 inline-flex items-center gap-1.5 text-sm text-gray-700">
          <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
          Overdue only
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        {/* List */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-center text-sm text-gray-500">Loading…</div>
          ) : cars.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">No CARs match the filters.</div>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
              {cars.map((c) => {
                const overdue = c.status !== "closed" && c.status !== "verified" && (c.respondByAt < new Date().toISOString() || c.closeByAt < new Date().toISOString());
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelected(c)}
                      className={`block w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 ${selected?.id === c.id ? "bg-[#0F6E56]/5" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900">{c.title}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${SEV_PILL[c.severity]}`}>{c.severity}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {STATUS_LABEL[c.status]} · assigned {c.assignedToEmail}
                        {overdue && <span className="ml-2 font-bold text-rose-600">OVERDUE</span>}
                        {c.closedLate && <span className="ml-2 font-bold text-amber-600">closed late</span>}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Close by {new Date(c.closeByAt).toLocaleString()}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Detail */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          {!selected ? (
            <p className="text-sm text-gray-500">Select a CAR on the left to view detail.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{selected.title}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SEV_PILL[selected.severity]}`}>{selected.severity}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {STATUS_LABEL[selected.status]} · breach <code>{selected.breachRule}</code> L{selected.breachLevel}
                </p>
                <p className="mt-3 text-sm text-gray-700 whitespace-pre-line">{selected.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 text-xs">
                <div><span className="font-semibold text-gray-700">Assigned to:</span> {selected.assignedToEmail}</div>
                <div><span className="font-semibold text-gray-700">Opened by:</span> {selected.openedByEmail}</div>
                <div><span className="font-semibold text-gray-700">Respond by:</span> {new Date(selected.respondByAt).toLocaleString()}</div>
                <div><span className="font-semibold text-gray-700">Close by:</span> {new Date(selected.closeByAt).toLocaleString()}</div>
              </div>

              {selected.rootCause && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Root cause</p>
                  <p className="mt-1 text-sm text-gray-800 whitespace-pre-line">{selected.rootCause}</p>
                </div>
              )}
              {selected.correctiveAction && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Corrective action</p>
                  <p className="mt-1 text-sm text-gray-800 whitespace-pre-line">{selected.correctiveAction}</p>
                </div>
              )}

              {/* Update timeline */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Updates</p>
                <ul className="mt-2 space-y-2">
                  {selected.updates.slice().reverse().map((u, i) => (
                    <li key={i} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <p className="text-xs text-gray-500">
                        {new Date(u.at).toLocaleString()} · {u.byEmail}{u.byRole ? ` (${u.byRole})` : ""}
                        {u.toStatus && <span className="ml-2 font-bold text-[#0F6E56]">→ {STATUS_LABEL[u.toStatus]}</span>}
                      </p>
                      <p className="mt-1 text-sm text-gray-800">{u.note}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Advance lifecycle */}
              {NEXT_STATE[selected.status] && (
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-600">
                    Advance to: {STATUS_LABEL[NEXT_STATE[selected.status] as CarStatus]}
                  </p>
                  <textarea
                    value={advanceNote}
                    onChange={(e) => setAdvanceNote(e.target.value)}
                    placeholder="Note (what happened, decision rationale)"
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                    rows={2}
                  />
                  {selected.status === "investigating" && (
                    <textarea
                      value={rootCause}
                      onChange={(e) => setRootCause(e.target.value)}
                      placeholder="Root cause analysis"
                      className="mt-2 w-full rounded-lg border border-gray-300 p-2 text-sm"
                      rows={3}
                    />
                  )}
                  {selected.status === "action_planned" && (
                    <textarea
                      value={correctiveAction}
                      onChange={(e) => setCorrectiveAction(e.target.value)}
                      placeholder="Corrective action taken"
                      className="mt-2 w-full rounded-lg border border-gray-300 p-2 text-sm"
                      rows={3}
                    />
                  )}
                  <button
                    onClick={advance}
                    disabled={busy}
                    className="mt-2 rounded-lg bg-[#0F6E56] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0A5942] disabled:opacity-60"
                  >
                    {busy ? "Working…" : "Advance"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
