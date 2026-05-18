"use client";

// Antimicrobial Stewardship approval inbox.
//
// ID consultant's queue of pending restricted-antibiotic requests.
// Each row shows the drug + tier + indication + 72h approval clock.
// Auto-expire kicks in past the deadline; this UI surfaces what
// would expire in the next 4 hours so the consultant can clear them.

import { useCallback, useEffect, useState } from "react";

type Status =
  | "pending_approval" | "approved" | "denied" | "expired"
  | "withdrawn" | "de_escalated";

interface Req {
  id: string;
  patientName: string;
  drug: string;
  tier: "T1" | "T2" | "T3" | "T4";
  indication: string;
  doctorName: string;
  status: Status;
  approvalDeadline?: string;
  deEscalationDeadline?: string;
  approverName?: string;
  approvalNote?: string;
  createdAt: string;
}

const TIER_PALETTE: Record<Req["tier"], string> = {
  T1: "bg-slate-100 text-slate-700",
  T2: "bg-sky-100 text-sky-800",
  T3: "bg-amber-100 text-amber-900",
  T4: "bg-rose-100 text-rose-900",
};
const STATUS_PALETTE: Record<Status, string> = {
  pending_approval: "bg-amber-100 text-amber-900",
  approved: "bg-emerald-100 text-emerald-800",
  denied: "bg-rose-100 text-rose-800",
  expired: "bg-slate-200 text-slate-700",
  withdrawn: "bg-slate-200 text-slate-700",
  de_escalated: "bg-violet-100 text-violet-800",
};

export default function AmsAdminPage() {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [filter, setFilter] = useState<Status | "">("pending_approval");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter ? `/api/ams?status=${filter}` : "/api/ams";
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      setReqs(j.requests || []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { refresh(); }, [refresh]);

  const act = async (id: string, action: "approve" | "deny" | "de_escalate") => {
    const note = action === "deny" ? prompt("Denial reason?") : action === "de_escalate" ? (prompt("De-escalation note (optional)?") || undefined) : prompt("Approval note (optional)?") || undefined;
    if (action === "deny" && !note) return;
    await fetch(`/api/ams?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    refresh();
  };

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">Antimicrobial stewardship</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Approval inbox</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Restricted-antibiotic requests waiting for ID consultant approval. 72h auto-expire if not actioned;
            48h de-escalation review after approval.
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Status | "")}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="">All</option>
          <option value="pending_approval">Pending</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
          <option value="expired">Expired</option>
          <option value="de_escalated">De-escalated</option>
        </select>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading && reqs.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">Loading…</p>
        ) : reqs.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">✓ Inbox empty for this filter.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {reqs.map((r) => {
              const ddl = r.approvalDeadline ? new Date(r.approvalDeadline).getTime() : null;
              const hoursLeft = ddl ? Math.max(0, Math.round((ddl - Date.now()) / 3_600_000)) : null;
              const urgent = ddl && hoursLeft != null && hoursLeft <= 4 && r.status === "pending_approval";
              return (
                <li key={r.id} className={`flex flex-wrap items-start justify-between gap-3 p-4 ${urgent ? "bg-rose-50/60 dark:bg-rose-950/20" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{r.drug}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${TIER_PALETTE[r.tier]}`}>
                        {r.tier}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_PALETTE[r.status]}`}>
                        {r.status.replace(/_/g, " ")}
                      </span>
                      {urgent && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white animate-pulse">{hoursLeft}h left</span>}
                    </div>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                      Patient: <strong>{r.patientName}</strong> · Requested by Dr. {r.doctorName}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                      <strong>Indication:</strong> {r.indication}
                    </p>
                    {r.approverName && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        {r.status === "denied" ? "Denied" : r.status === "approved" ? "Approved" : "Reviewed"} by {r.approverName}
                        {r.approvalNote && <> — {r.approvalNote}</>}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 self-start">
                    {r.status === "pending_approval" && (
                      <>
                        <button onClick={() => act(r.id, "approve")} className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">Approve</button>
                        <button onClick={() => act(r.id, "deny")} className="rounded-md bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white">Deny</button>
                      </>
                    )}
                    {r.status === "approved" && (
                      <button onClick={() => act(r.id, "de_escalate")} className="rounded-md bg-violet-600 px-2.5 py-1 text-[11px] font-bold text-white">De-escalate</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
