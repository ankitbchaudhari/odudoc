"use client";

// Admin view of the doctor earnings ledger.
//
// Top: per-doctor summary — pending vs paid nets, lifetime gross, platform
// commission collected, entry count.
// Bottom: flat ledger of every earning entry, filterable by status, with
// checkbox-select + "Mark selected paid" for batch settlement.

import { useEffect, useMemo, useState } from "react";
import ExportButtons from "@/components/ExportButtons";
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

const STATUS_STYLES: Record<"pending" | "paid", { pill: string; dot: string }> = {
  pending: { pill: "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  paid: { pill: "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
};

const FILTER_THEMES: Record<"pending" | "paid" | "all", string> = {
  all: "from-slate-500 to-gray-600",
  pending: "from-amber-500 to-orange-600",
  paid: "from-emerald-500 to-green-600",
};

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

  const counts = {
    all: earnings.length,
    pending: earnings.filter((e) => e.status === "pending").length,
    paid: earnings.filter((e) => e.status === "paid").length,
  };

  const totalPendingNet = earnings
    .filter((e) => e.status === "pending")
    .reduce((s, e) => s + e.netAmount, 0);

  return (
    <div className="p-6">
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-accent-300/20 blur-3xl" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-400" />
            </span>
            {counts.pending} pending · ${fmt(totalPendingNet)} outstanding
          </div>
          <h1 className="text-2xl font-bold">Doctor Earnings</h1>
          <p className="mt-1 text-sm text-emerald-50/90">
            Per-consultation ledger with a 70/30 split. Use this to reconcile with
            withdrawal requests before marking them paid.
          </p>
          <div className="mt-3"><ExportButtons type="doctor-earnings" className="text-white" /></div>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-8 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />
        <div className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Per-doctor summary
          </h2>
          {summary.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              💰 No earnings yet.
            </p>
          ) : (
            <div className="space-y-2">
              {summary.map((s) => (
                <div
                  key={s.doctorEmail || s.doctorId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-emerald-50/60 via-green-50/40 to-teal-50/60 p-4 ring-1 ring-emerald-100/60 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{s.doctorName}</p>
                    <p className="text-xs text-gray-500">{s.doctorEmail}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1 text-xs font-semibold text-white shadow">
                      Pending ${fmt(s.pendingNet)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-1 text-xs font-semibold text-white shadow">
                      Paid ${fmt(s.paidNet)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                      Gross ${fmt(s.lifetimeGross)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-500 ring-1 ring-gray-200">
                      Commission ${fmt(s.totalCommission)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-500 ring-1 ring-gray-200">
                      {s.entryCount} entries
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ledger */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["pending", "paid", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setSelected(new Set());
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition hover:-translate-y-0.5 ${
              filter === f
                ? `bg-gradient-to-r ${FILTER_THEMES[f]} text-white shadow-md`
                : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"
            }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50/60 via-green-50/40 to-teal-50/60 px-5 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
            {selected.size} selected
          </span>
          <button
            onClick={markPaid}
            disabled={selected.size === 0 || saving}
            className="rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "💸 Mark selected paid"}
          </button>
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm text-gray-400">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">
            {filter === "pending"
              ? "🌱 No pending earnings found."
              : filter === "paid"
              ? "✅ No paid earnings yet."
              : "💰 No earnings yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gradient-to-r from-emerald-50/60 via-green-50/40 to-teal-50/60">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  <th className="px-5 py-3">
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
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Doctor</th>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3 text-right">Gross</th>
                  <th className="px-5 py-3 text-right">Commission</th>
                  <th className="px-5 py-3 text-right">Net</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((e) => (
                  <tr key={e.id} className="transition-colors hover:bg-emerald-50/30">
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        disabled={e.status !== "pending"}
                        checked={selected.has(e.id)}
                        onChange={() => toggle(e.id)}
                      />
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{e.doctorName}</p>
                      <p className="text-xs text-gray-500">{e.doctorEmail}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{e.patientName}</td>
                    <td className="px-5 py-3 text-right text-gray-900">
                      <span className="inline-flex rounded-full bg-gradient-to-r from-slate-100 to-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                        {e.currency} {fmt(e.grossAmount)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500">
                      −{e.currency} {fmt(e.commissionAmount)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`inline-flex rounded-full bg-gradient-to-r px-2.5 py-1 text-xs font-bold text-white shadow ${
                          e.status === "paid"
                            ? "from-emerald-500 to-green-600"
                            : "from-amber-500 to-orange-600"
                        }`}
                      >
                        {e.currency} {fmt(e.netAmount)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${STATUS_STYLES[e.status].pill}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLES[e.status].dot}`} />
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
