"use client";

// Super-admin review surface for open erasure requests.
//
// Lists every pending / cooling-off / approved erasure request so a
// data-protection officer can triage, mark approved or rejected, and
// after the user's cooling-off elapses execute the actual deletion.
// We don't auto-purge here — execution is a manual click so an admin
// can validate no legal-hold conflicts (open billing disputes, etc.)
// before pulling the trigger.

import { useCallback, useEffect, useState } from "react";

type ErasureStatus = "pending_review" | "cooling_off" | "approved" | "completed" | "rejected" | "cancelled";

interface ErasureRequest {
  id: string; userId: string; filedAt: string; reason?: string;
  retainDependents: boolean; scopeCategories: string[];
  status: ErasureStatus;
  coolingOffEndsAt?: string; reviewedBy?: string; reviewedAt?: string;
  reviewNote?: string; completedAt?: string; cancelledAt?: string;
}

export default function PrivacyRequestsPage() {
  const [list, setList] = useState<ErasureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/privacy/erasures", { cache: "no-store" });
      if (r.ok) setList((await r.json()).requests || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const review = async (id: string, decision: "approved" | "rejected") => {
    const note = window.prompt(decision === "approved" ? "Approval note (optional):" : "Rejection reason:", "");
    if (decision === "rejected" && !note) return;
    const r = await fetch(`/api/admin/privacy/erasures/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note }),
    });
    if (r.ok) { setToast({ kind: "ok", text: `Request ${decision}.` }); await load(); }
    else { setToast({ kind: "err", text: "Action failed." }); }
  };

  const complete = async (id: string) => {
    if (!confirm("Mark erasure as completed? This is the final state — make sure the underlying data has been purged.")) return;
    const r = await fetch(`/api/admin/privacy/erasures/${id}/complete`, { method: "POST" });
    if (r.ok) { setToast({ kind: "ok", text: "Marked completed." }); await load(); }
    else { setToast({ kind: "err", text: "Action failed." }); }
  };

  return (
    <div>
      {toast && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${toast.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Privacy requests</h2>
        <p className="mt-1 text-sm text-gray-500">
          Pending right-to-erasure requests under DPDP §13. Review each for legal-hold conflicts before approving; cooling-off must elapse before completion.
        </p>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-400">Loading…</p>
      ) : list.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">No open requests.</p>
      ) : (
        <ul className="space-y-3">
          {list.map((e) => {
            const cooled = e.coolingOffEndsAt ? new Date(e.coolingOffEndsAt).getTime() < Date.now() : false;
            return (
              <li key={e.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">User {e.userId}</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">Filed {new Date(e.filedAt).toLocaleString()}</p>
                    {e.reason && <p className="mt-1 text-xs text-slate-700 italic">&ldquo;{e.reason}&rdquo;</p>}
                    <p className="mt-1 text-[11px] text-slate-500">
                      Status: <strong>{e.status}</strong>
                      {e.coolingOffEndsAt && <> · cooling-off ends {new Date(e.coolingOffEndsAt).toLocaleDateString()}{cooled ? " (passed)" : ""}</>}
                      {e.retainDependents && <> · dependents retained</>}
                    </p>
                    {e.reviewedBy && <p className="text-[11px] text-slate-500">Reviewed by {e.reviewedBy} on {e.reviewedAt && new Date(e.reviewedAt).toLocaleDateString()}{e.reviewNote ? ` — ${e.reviewNote}` : ""}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    {e.status === "cooling_off" && (
                      <>
                        <button onClick={() => review(e.id, "approved")} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Approve</button>
                        <button onClick={() => review(e.id, "rejected")} className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">Reject</button>
                      </>
                    )}
                    {e.status === "approved" && cooled && (
                      <button onClick={() => complete(e.id)} className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-bold text-white">Execute deletion</button>
                    )}
                    {e.status === "approved" && !cooled && (
                      <span className="text-[10px] text-slate-500">Wait for cooling-off</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
