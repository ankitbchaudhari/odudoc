"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Payout {
  id: string;
  orderNumber: string;
  grossAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  netAmount: number;
  status: "pending" | "paid";
  paidAt?: string;
  createdAt: string;
}

const FILTERS = ["pending", "paid", "all"] as const;

export default function VendorPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [pendingNet, setPendingNet] = useState(0);
  const [paidNet, setPaidNet] = useState(0);
  const [commission, setCommission] = useState(0);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/vendors/me/payouts?status=${filter}`);
        const data = await res.json();
        if (!res.ok) { setErr(data.error || "Failed to load"); return; }
        setErr("");
        setPayouts(data.payouts || []);
        setPendingNet(data.pendingNet || 0);
        setPaidNet(data.paidNet || 0);
        setCommission(data.commissionPercent || 0);
      } finally { setLoading(false); }
    })();
  }, [filter]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/dashboard/vendor" className="text-sm text-primary-600 hover:underline">← Back to dashboard</Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Payouts</h1>
        <p className="text-sm text-gray-500">Platform commission {commission}%. Net is what you&apos;ll receive per paid order.</p>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-amber-50 p-5 text-amber-900">
            <p className="text-2xl font-bold">${pendingNet.toFixed(2)}</p>
            <p className="mt-1 text-xs opacity-70">Owed to you (pending)</p>
          </div>
          <div className="rounded-xl bg-green-50 p-5 text-green-900">
            <p className="text-2xl font-bold">${paidNet.toFixed(2)}</p>
            <p className="mt-1 text-xs opacity-70">Paid out to date</p>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          {FILTERS.map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                filter === s ? "bg-primary-600 text-white" : "bg-white text-gray-700 border border-gray-200"
              }`}>
              {s}
            </button>
          ))}
        </div>

        {err && <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</p>}

        <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-sm text-gray-400">Loading…</div>
          ) : payouts.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400">No payout entries yet. Entries are created when orders are paid.</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="py-3 pl-4">Order</th>
                  <th className="py-3 text-right">Gross</th>
                  <th className="py-3 text-right">Commission</th>
                  <th className="py-3 text-right">Net</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 pr-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="py-3 pl-4 font-medium text-gray-900">{p.orderNumber}</td>
                    <td className="py-3 text-right text-gray-700">${p.grossAmount.toFixed(2)}</td>
                    <td className="py-3 text-right text-gray-500">
                      -${p.commissionAmount.toFixed(2)}
                      <span className="ml-1 text-xs text-gray-400">({p.commissionPercent}%)</span>
                    </td>
                    <td className="py-3 text-right font-semibold text-gray-900">${p.netAmount.toFixed(2)}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        p.status === "paid" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                      }`}>{p.status}</span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-gray-400">
                      {new Date(p.createdAt).toLocaleDateString()}
                      {p.paidAt && <span className="block text-[10px]">paid {new Date(p.paidAt).toLocaleDateString()}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
