"use client";

import { useEffect, useState } from "react";
import type { WithdrawalRequest, WithdrawalStatus } from "@/lib/withdrawals-store";

const STATUS_STYLES: Record<WithdrawalStatus, { pill: string; dot: string }> = {
  pending: { pill: "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  approved: { pill: "bg-gradient-to-r from-sky-50 to-blue-50 text-blue-700 ring-blue-200", dot: "bg-blue-500" },
  rejected: { pill: "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  paid: { pill: "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
};

const FILTER_THEMES: Record<WithdrawalStatus | "all", string> = {
  all: "from-slate-500 to-gray-600",
  pending: "from-amber-500 to-orange-600",
  approved: "from-sky-500 to-blue-600",
  paid: "from-emerald-500 to-green-600",
  rejected: "from-rose-500 to-red-600",
};

const METHOD_LABELS: Record<WithdrawalRequest["method"], string> = {
  bank_transfer: "Bank Transfer",
  paypal: "PayPal",
  stripe: "Stripe",
  other: "Other",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminWithdrawalsPage() {
  const [items, setItems] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<WithdrawalStatus | "all">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/withdrawals");
      if (res.ok) {
        const data = await res.json();
        setItems(data.withdrawals || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (
    id: string,
    status: WithdrawalStatus,
    promptNote = false
  ) => {
    let note: string | undefined;
    if (promptNote) {
      note = window.prompt("Reason (optional):") || undefined;
    }
    setBusyId(id);
    try {
      const res = await fetch(`/api/withdrawals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote: note }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || "Update failed");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const filtered =
    filter === "all" ? items : items.filter((w) => w.status === filter);

  const counts = {
    all: items.length,
    pending: items.filter((w) => w.status === "pending").length,
    approved: items.filter((w) => w.status === "approved").length,
    paid: items.filter((w) => w.status === "paid").length,
    rejected: items.filter((w) => w.status === "rejected").length,
  };

  const totalPending = items
    .filter((w) => w.status === "pending")
    .reduce((s, w) => s + w.amount, 0);

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-lime-300/20 blur-3xl" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-400" />
            </span>
            {counts.pending} pending · ${totalPending.toLocaleString()} awaiting payout
          </div>
          <h1 className="text-2xl font-bold">Withdrawal Requests</h1>
          <p className="mt-1 text-sm text-teal-50/90">
            Review and approve doctor payout requests. Approved requests should be marked as Paid once the transfer has been sent.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["pending", "approved", "paid", "rejected", "all"] as const).map(
          (s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition hover:-translate-y-0.5 ${
                filter === s
                  ? `bg-gradient-to-r ${FILTER_THEMES[s]} text-white shadow-md`
                  : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"
              }`}
            >
              {s} ({counts[s]})
            </button>
          )
        )}
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        {loading ? (
          <p className="py-16 text-center text-sm text-gray-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">
            💰 No requests in this view.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gradient-to-r from-emerald-50/60 via-teal-50/40 to-cyan-50/60">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  <th className="px-5 py-3">Requested</th>
                  <th className="px-5 py-3">Doctor</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Details</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((w) => (
                  <tr key={w.id} className="transition-colors hover:bg-emerald-50/30">
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {formatDate(w.requestedAt)}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{w.doctorName}</p>
                      <p className="text-xs text-gray-500">{w.doctorEmail}</p>
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-900">
                      ${w.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      {METHOD_LABELS[w.method]}
                    </td>
                    <td className="px-5 py-3 max-w-[240px] truncate text-gray-500" title={w.accountDetails}>
                      {w.accountDetails}
                      {w.notes && (
                        <p className="mt-0.5 text-[11px] text-gray-400">
                          Note: {w.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${STATUS_STYLES[w.status].pill}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLES[w.status].dot}`} />
                        {w.status}
                      </span>
                      {w.adminNote && (
                        <p className="mt-1 text-[11px] text-gray-400">
                          {w.adminNote}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        {w.status === "pending" && (
                          <>
                            <button
                              disabled={busyId === w.id}
                              onClick={() => updateStatus(w.id, "approved")}
                              className="rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
                            >
                              ✓ Approve
                            </button>
                            <button
                              disabled={busyId === w.id}
                              onClick={() => updateStatus(w.id, "rejected", true)}
                              className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow disabled:opacity-50"
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}
                        {w.status === "approved" && (
                          <button
                            disabled={busyId === w.id}
                            onClick={() => updateStatus(w.id, "paid")}
                            className="rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
                          >
                            💸 Mark as Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
