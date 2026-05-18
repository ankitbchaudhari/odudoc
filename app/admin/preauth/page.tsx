"use client";

// Pre-authorization queue (insurance-preauth-store). Surfaces the
// state-machine UI: every request shows current state + the actions
// the operator can take from that state. Distinct from /admin/cashless
// (older first-cut UI bound to a different store).

import { useCallback, useEffect, useState } from "react";

type Status =
  | "draft" | "submitted" | "under_review" | "query_raised"
  | "approved" | "partial" | "denied"
  | "claim_submitted" | "settled" | "appealed";

interface PreAuthRequest {
  id: string;
  patientEmail: string;
  patientName: string;
  tpaId: string;
  policyNumber: string;
  encounterType: "opd" | "ipd" | "surgery" | "emergency";
  diagnosis: string;
  estimatedAmount: number;
  approvedAmount?: number;
  currency: string;
  status: Status;
  tpaRef?: string;
  query?: string;
  history: Array<{ at: string; actor: string; event: string; detail?: string }>;
  doctorName: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_PALETTE: Record<Status, string> = {
  draft:             "bg-slate-100 text-slate-700",
  submitted:         "bg-sky-100 text-sky-800",
  under_review:      "bg-indigo-100 text-indigo-800",
  query_raised:      "bg-amber-100 text-amber-900",
  approved:          "bg-emerald-100 text-emerald-800",
  partial:           "bg-teal-100 text-teal-800",
  denied:            "bg-rose-100 text-rose-800",
  claim_submitted:   "bg-violet-100 text-violet-800",
  settled:           "bg-emerald-100 text-emerald-900",
  appealed:          "bg-orange-100 text-orange-900",
};

const STATUS_LABEL: Record<Status, string> = {
  draft: "Draft", submitted: "Submitted", under_review: "Under review", query_raised: "Query raised",
  approved: "Approved", partial: "Partial", denied: "Denied",
  claim_submitted: "Claim submitted", settled: "Settled", appealed: "Appealed",
};

export default function PreAuthAdminPage() {
  const [list, setList] = useState<PreAuthRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Status | "">("");
  const [selected, setSelected] = useState<PreAuthRequest | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/preauth${statusFilter ? `?status=${statusFilter}` : ""}`, { cache: "no-store" });
      const j = await r.json();
      setList(j.requests || []);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  const act = async (id: string, action: string, extra: Record<string, unknown> = {}) => {
    const r = await fetch(`/api/preauth?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const j = await r.json();
    if (!r.ok) { alert(j.error || "Action failed"); return; }
    if (selected?.id === id) setSelected(j.request);
    refresh();
  };

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Insurance · Pre-authorization</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Pre-auth queue</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Cashless pre-authorization requests across all TPAs. Workflow: draft → submitted → review → approved /
            partial / denied → claim submitted → settled.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Status | "")}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading && list.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">Loading…</p>
        ) : list.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">No pre-auth requests {statusFilter ? `in "${STATUS_LABEL[statusFilter as Status]}"` : "yet"}.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {list.map((r) => (
              <li
                key={r.id}
                onClick={() => setSelected(r)}
                className="cursor-pointer p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{r.patientName}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_PALETTE[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                        {r.encounterType.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                      {r.diagnosis} · {r.tpaId} #{r.policyNumber}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      Est. {r.currency} {r.estimatedAmount.toLocaleString()}
                      {r.approvedAmount != null && <> · Approved {r.currency} {r.approvedAmount.toLocaleString()}</>}
                      {r.tpaRef && <> · TPA ref {r.tpaRef}</>}
                      {" · "}by {r.doctorName}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 self-start">
                    <ActionButtons request={r} onAct={act} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && (
        <Drawer request={selected} onClose={() => setSelected(null)} onAct={act} />
      )}
    </main>
  );
}

function ActionButtons({ request, onAct }: { request: PreAuthRequest; onAct: (id: string, action: string, extra?: Record<string, unknown>) => void }) {
  const btn = (label: string, fn: () => void, color = "bg-slate-600") => (
    <button
      onClick={(e) => { e.stopPropagation(); fn(); }}
      className={`rounded-md ${color} px-2 py-1 text-[11px] font-bold text-white`}
    >
      {label}
    </button>
  );

  switch (request.status) {
    case "draft":
      return btn("Submit", () => onAct(request.id, "submit"), "bg-sky-600");
    case "submitted":
    case "under_review":
      return (
        <>
          {btn("Raise query", () => {
            const q = prompt("TPA query text?");
            if (q) onAct(request.id, "query", { query: q });
          }, "bg-amber-600")}
          {btn("Approve full", () => onAct(request.id, "approve", { amount: request.estimatedAmount }), "bg-emerald-600")}
          {btn("Approve partial", () => {
            const a = Number(prompt(`Approved amount (max ${request.estimatedAmount})?`));
            if (a > 0) onAct(request.id, "approve", { amount: a });
          }, "bg-teal-600")}
          {btn("Deny", () => {
            const reason = prompt("Denial reason?");
            if (reason) onAct(request.id, "deny", { reason });
          }, "bg-rose-600")}
        </>
      );
    case "query_raised":
      return btn("Resubmit", () => onAct(request.id, "submit"), "bg-sky-600");
    case "approved":
    case "partial":
      return btn("Submit claim", () => {
        const cap = request.approvedAmount ?? request.estimatedAmount;
        const a = Number(prompt(`Final claim amount (cap ${request.currency} ${cap})?`));
        if (a > 0) onAct(request.id, "claim", { amount: a });
      }, "bg-violet-600");
    case "denied":
      return btn("Appeal", () => {
        const reason = prompt("Appeal grounds?");
        if (reason) onAct(request.id, "appeal", { reason });
      }, "bg-orange-600");
    case "claim_submitted":
      return btn("Mark settled", () => onAct(request.id, "settle"), "bg-emerald-700");
    default:
      return null;
  }
}

function Drawer({ request, onClose, onAct }: { request: PreAuthRequest; onClose: () => void; onAct: (id: string, action: string, extra?: Record<string, unknown>) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{request.id}</p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{request.patientName}</h2>
          </div>
          <button onClick={onClose} className="text-2xl text-slate-400">×</button>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <DefRow k="Encounter" v={request.encounterType.toUpperCase()} />
          <DefRow k="TPA" v={request.tpaId} />
          <DefRow k="Policy" v={request.policyNumber} />
          <DefRow k="Diagnosis" v={request.diagnosis} />
          <DefRow k="Estimated" v={`${request.currency} ${request.estimatedAmount.toLocaleString()}`} />
          {request.approvedAmount != null && <DefRow k="Approved" v={`${request.currency} ${request.approvedAmount.toLocaleString()}`} />}
          {request.tpaRef && <DefRow k="TPA ref" v={request.tpaRef} />}
          {request.query && <DefRow k="Query" v={request.query} />}
        </dl>

        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Available actions</p>
          <div className="flex flex-wrap gap-2">
            <ActionButtons request={request} onAct={onAct} />
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Timeline</p>
          <ol className="space-y-2">
            {request.history.map((h, i) => (
              <li key={i} className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800">
                <p className="font-bold text-slate-900 dark:text-slate-100">{h.event.replace(/_/g, " ")}</p>
                {h.detail && <p className="mt-0.5 text-slate-600 dark:text-slate-300">{h.detail}</p>}
                <p className="mt-1 text-[10px] text-slate-500">{new Date(h.at).toLocaleString()} · {h.actor}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function DefRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 pb-1 dark:border-slate-800">
      <dt className="text-slate-500 dark:text-slate-400">{k}</dt>
      <dd className="text-right font-semibold text-slate-900 dark:text-slate-100">{v}</dd>
    </div>
  );
}
