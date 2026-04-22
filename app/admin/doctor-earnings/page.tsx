"use client";

// Admin view of the doctor earnings ledger.
//
// Top: per-doctor summary — pending vs paid nets, lifetime gross, platform
// commission collected, entry count.
// Bottom: flat ledger of every earning entry, filterable by status, with
// checkbox-select + "Mark selected paid" for batch settlement.

import { useEffect, useMemo, useState } from "react";
import type { DoctorEarning } from "@/lib/doctor-earnings-store";

interface Summary {
  doctorId: string;
  doctorEmail: string;
  doctorName: string;
  pendingNet: number;
  paidNet: number;
  lifetimeGross: number;
  totalCommission: number;
  entryCount: number;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminDoctorEarningsPage() {
  const [earnings, setEarnings] = useState<DoctorEarning[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "paid" | "all">("pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/doctor-earnings");
      if (res.ok) {
        const data = await res.json();
        setEarnings(data.earnings || []);
        setSummary(data.summary || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    if (filter === "all") return earnings;
    return earnings.filter((e) => e.status === filter);
  }, [earnings, filter]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === visible.filter((e) => e.status === "pending").length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visible.filter((e) => e.status === "pending").map((e) => e.id)));
    }
  };

  const markPaid = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Mark ${selected.size} earning(s) as paid?`)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/doctor-earnings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (res.ok) {
        setSelected(new Set());
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Doctor Earnings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Per-consultation ledger with a 70/30 split. Use this to reconcile with
          withdrawal requests before marking them paid.
        </p>
      </div>

      {/* Summary */}
      <div className="mb-8 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Per-doctor summary
        </h2>
        {summary.length === 0 ? (
          <p className="py-4 text-sm text-gray-400">No earnings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="pb-2 pr-4">Doctor</th>
                  <th className="pb-2 pr-4 text-right">Pending</th>
                  <th className="pb-2 pr-4 text-right">Paid</th>
                  <th className="pb-2 pr-4 text-right">Lifetime gross</th>
                  <th className="pb-2 pr-4 text-right">Commission</th>
                  <th className="pb-2 text-right">Entries</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.map((s) => (
                  <tr key={s.doctorEmail || s.doctorId}>
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-gray-900">{s.doctorName}</p>
                      <p className="text-xs text-gray-500">{s.doctorEmail}</p>
                    </td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-yellow-700">
                      ${fmt(s.pendingNet)}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-green-700">
                      ${fmt(s.paidNet)}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-gray-700">
                      ${fmt(s.lifetimeGross)}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-gray-500">
                      ${fmt(s.totalCommission)}
                    </td>
                    <td className="py-2.5 text-right text-gray-500">{s.entryCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ledger */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {(["pending", "paid", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setSelected(new Set());
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
                  filter === f
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {selected.size} selected
            </span>
            <button
              onClick={markPaid}
              disabled={selected.size === 0 || saving}
              className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Mark selected paid"}
            </button>
          </div>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">
            No {filter === "all" ? "" : filter + " "}earnings found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="pb-2 pr-3">
                    <input
                      type="checkbox"
                      onChange={toggleAll}
                      checked={
                        visible.filter((e) => e.status === "pending").length > 0 &&
                        selected.size ===
                          visible.filter((e) => e.status === "pending").length
                      }
                    />
                  </th>
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Doctor</th>
                  <th className="pb-2 pr-4">Patient</th>
                  <th className="pb-2 pr-4 text-right">Gross</th>
                  <th className="pb-2 pr-4 text-right">Commission</th>
                  <th className="pb-2 pr-4 text-right">Net</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        disabled={e.status !== "pending"}
                        checked={selected.has(e.id)}
                        onChange={() => toggle(e.id)}
                      />
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-500">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-4">
                      <p className="text-gray-900">{e.doctorName}</p>
                      <p className="text-xs text-gray-500">{e.doctorEmail}</p>
                    </td>
                    <td className="py-2 pr-4 text-gray-700">{e.patientName}</td>
                    <td className="py-2 pr-4 text-right text-gray-900">
                      {e.currency} {fmt(e.grossAmount)}
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-500">
                      −{e.currency} {fmt(e.commissionAmount)}
                    </td>
                    <td className="py-2 pr-4 text-right font-semibold text-gray-900">
                      {e.currency} {fmt(e.netAmount)}
                    </td>
                    <td className="py-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                          e.status === "paid"
                            ? "bg-green-50 text-green-700"
                            : "bg-yellow-50 text-yellow-700"
                        }`}
                      >
                        {e.status}
                      </span>
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
