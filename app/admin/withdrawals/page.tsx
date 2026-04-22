"use client";

import { useEffect, useState } from "react";
import type { WithdrawalRequest, WithdrawalStatus } from "@/lib/withdrawals-store";

const STATUS_STYLES: Record<WithdrawalStatus, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  approved: "bg-blue-50 text-blue-700",
  rejected: "bg-red-50 text-red-700",
  paid: "bg-green-50 text-green-700",
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Withdrawal Requests</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Review and approve doctor payout requests. Approved requests should be
          marked as Paid once the transfer has been sent.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["pending", "approved", "paid", "rejected", "all"] as const).map(
          (s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                filter === s
                  ? "bg-primary-600 text-white"
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {s} ({counts[s]})
            </button>
          )
        )}
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        {loading ? (
          <p className="py-16 text-center text-sm text-gray-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">
            No requests in this view.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
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
                  <tr key={w.id} className="hover:bg-gray-50">
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
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[w.status]}`}
                      >
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
                              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              disabled={busyId === w.id}
                              onClick={() => updateStatus(w.id, "rejected", true)}
                              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {w.status === "approved" && (
                          <button
                            disabled={busyId === w.id}
                            onClick={() => updateStatus(w.id, "paid")}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            Mark as Paid
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
