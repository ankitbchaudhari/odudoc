"use client";

import { useEffect, useState } from "react";
import ExportButtons from "@/components/ExportButtons";

interface Payout {
  id: string;
  vendorId: string;
  vendorName: string;
  orderId: string;
  orderNumber: string;
  grossAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  netAmount: number;
  status: "pending" | "paid";
  paidAt?: string;
  createdAt: string;
  stripeTransferId?: string;
  transferInitiatedAt?: string;
  transferError?: string;
}
interface Summary {
  vendorId: string;
  vendorName: string;
  pendingNet: number;
  paidNet: number;
  totalCommission: number;
  entryCount: number;
}

const FILTERS = ["pending", "paid", "all"] as const;

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [rowsRes, sumRes] = await Promise.all([
      fetch(`/api/payouts?status=${filter}`),
      fetch(`/api/payouts?view=summary`),
    ]);
    if (rowsRes.ok) {
      const d = await rowsRes.json();
      setPayouts(d.payouts || []);
    }
    if (sumRes.ok) {
      const d = await sumRes.json();
      setSummary(d.summary || []);
    }
    setSelected(new Set());
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    const pending = payouts.filter((p) => p.status === "pending").map((p) => p.id);
    if (selected.size === pending.length) setSelected(new Set());
    else setSelected(new Set(pending));
  };

  const markPaid = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      await load();
    } finally { setBusy(false); }
  };

  const transferViaStripe = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Issue Stripe transfers for ${selected.size} payout(s)? This will move real funds to vendor connected accounts.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/payouts/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (Array.isArray(data.results)) {
        const ok = data.results.filter((r: { ok: boolean }) => r.ok).length;
        const failed = data.results.filter((r: { ok: boolean }) => !r.ok);
        let msg = `${ok} transfer(s) initiated.`;
        if (failed.length) {
          msg += `\n\nFailed (${failed.length}):\n` +
            failed.map((r: { id: string; error?: string }) => `• ${r.id}: ${r.error}`).join("\n");
        }
        alert(msg);
      } else if (data.error) {
        alert(data.error);
      }
      await load();
    } finally { setBusy(false); }
  };

  const selectedTotal = payouts
    .filter((p) => selected.has(p.id))
    .reduce((s, p) => s + p.netAmount, 0);
  const pendingTotal = summary.reduce((s, v) => s + v.pendingNet, 0);
  const commissionTotal = summary.reduce((s, v) => s + v.totalCommission, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 p-6 text-white shadow-lg">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-yellow-300/20 blur-3xl" />
          <div className="relative">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-400" />
              </span>
              ${pendingTotal.toFixed(2)} owed across {summary.filter((s) => s.pendingNet > 0).length} vendor(s)
            </div>
            <h1 className="text-2xl font-bold">Vendor payouts</h1>
            <p className="mt-1 text-sm text-orange-50/90">Ledger of amounts owed to vendors after platform commission.</p>
            <div className="mt-3"><ExportButtons type="payouts" className="text-white" /></div>
          </div>
        </div>

        {/* Totals */}
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Stat label="Total owed (pending)" value={`$${pendingTotal.toFixed(2)}`} tone="amber" />
          <Stat label="Platform commission earned" value={`$${commissionTotal.toFixed(2)}`} tone="green" />
          <Stat label="Vendors with pending payouts" value={String(summary.filter((s) => s.pendingNet > 0).length)} tone="slate" />
        </div>

        {/* Per-vendor summary */}
        {summary.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
            <div className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow">💼</span>
              By vendor
            </h2>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs text-gray-500">
                <tr className="border-b border-gray-100">
                  <th className="py-2">Vendor</th>
                  <th className="py-2 text-right">Pending</th>
                  <th className="py-2 text-right">Paid</th>
                  <th className="py-2 text-right">Commission</th>
                  <th className="py-2 text-right">Entries</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((v) => (
                  <tr key={v.vendorId} className="border-b border-gray-50">
                    <td className="py-2 font-medium text-gray-900">{v.vendorName}</td>
                    <td className="py-2 text-right text-amber-700">${v.pendingNet.toFixed(2)}</td>
                    <td className="py-2 text-right text-gray-600">${v.paidNet.toFixed(2)}</td>
                    <td className="py-2 text-right text-gray-600">${v.totalCommission.toFixed(2)}</td>
                    <td className="py-2 text-right text-gray-500">{v.entryCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            </div>
          </div>
        )}

        {/* Entry list */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {FILTERS.map((s) => {
              const grads: Record<string, string> = {
                pending: "from-amber-500 to-orange-600",
                paid: "from-emerald-500 to-green-600",
                all: "from-slate-500 to-gray-700",
              };
              return (
                <button key={s} onClick={() => setFilter(s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    filter === s
                      ? `bg-gradient-to-r ${grads[s]} text-white shadow-md`
                      : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                  }`}>
                  {s}
                </button>
              );
            })}
          </div>
          {filter === "pending" && payouts.length > 0 && (
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-gray-500">
                {selected.size} selected · ${selectedTotal.toFixed(2)}
              </span>
              <button disabled={busy || selected.size === 0} onClick={transferViaStripe}
                className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50">
                ⚡ Transfer via Stripe
              </button>
              <button disabled={busy || selected.size === 0} onClick={markPaid}
                className="rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50">
                ✓ Mark paid (manual)
              </button>
            </div>
          )}
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
          {payouts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 text-2xl ring-4 ring-white">💸</div>
              <p className="text-sm font-medium text-gray-500">No payout entries in this view.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-gradient-to-r from-amber-50/60 via-orange-50/40 to-rose-50/60 text-left text-xs text-gray-600">
                <tr>
                  <th className="py-3 pl-4">
                    {filter === "pending" && (
                      <input type="checkbox"
                        checked={selected.size > 0 && selected.size === payouts.filter((p) => p.status === "pending").length}
                        onChange={toggleAll} />
                    )}
                  </th>
                  <th className="py-3">Vendor</th>
                  <th className="py-3">Order</th>
                  <th className="py-3 text-right">Gross</th>
                  <th className="py-3 text-right">Commission</th>
                  <th className="py-3 text-right">Net owed</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 pr-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100 transition-colors hover:bg-amber-50/30">
                    <td className="py-3 pl-4">
                      {p.status === "pending" && (
                        <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                      )}
                    </td>
                    <td className="py-3 font-medium text-gray-900">{p.vendorName}</td>
                    <td className="py-3 text-gray-600">{p.orderNumber}</td>
                    <td className="py-3 text-right text-gray-700">${p.grossAmount.toFixed(2)}</td>
                    <td className="py-3 text-right text-gray-500">
                      ${p.commissionAmount.toFixed(2)}
                      <span className="ml-1 text-xs text-gray-400">({p.commissionPercent}%)</span>
                    </td>
                    <td className="py-3 text-right font-semibold text-gray-900">${p.netAmount.toFixed(2)}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                        p.status === "paid" ? "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200"
                          : p.stripeTransferId ? "bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 ring-indigo-200"
                          : "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 ring-amber-200"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          p.status === "paid" ? "bg-emerald-500" : p.stripeTransferId ? "bg-indigo-500" : "bg-amber-500"
                        }`} />
                        {p.status === "paid" ? "paid" : p.stripeTransferId ? "transferring" : "pending"}
                      </span>
                      {p.transferError && (
                        <span className="mt-1 block text-[10px] text-rose-600" title={p.transferError}>
                          transfer error
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-xs text-gray-400">
                      {new Date(p.createdAt).toLocaleDateString()}
                      {p.paidAt && <span className="block text-[10px]">paid {new Date(p.paidAt).toLocaleDateString()}</span>}
                      {p.stripeTransferId && !p.paidAt && (
                        <span className="block text-[10px] font-mono text-indigo-500">{p.stripeTransferId.slice(0, 14)}…</span>
                      )}
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

function Stat({ label, value, tone }: { label: string; value: string; tone: "amber" | "green" | "slate" }) {
  const themes = {
    amber: { bg: "from-amber-50 to-yellow-50", ring: "ring-amber-200", text: "text-amber-900", dot: "bg-amber-500" },
    green: { bg: "from-emerald-50 to-green-50", ring: "ring-emerald-200", text: "text-emerald-900", dot: "bg-emerald-500" },
    slate: { bg: "from-slate-50 to-gray-50", ring: "ring-slate-200", text: "text-slate-900", dot: "bg-slate-500" },
  }[tone];
  return (
    <div className={`rounded-xl bg-gradient-to-br ${themes.bg} p-5 shadow-sm ring-1 ${themes.ring} transition hover:-translate-y-0.5 hover:shadow-md`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${themes.dot}`} />
        <p className="text-xs font-medium text-gray-600">{label}</p>
      </div>
      <p className={`mt-2 text-2xl font-bold ${themes.text}`}>{value}</p>
    </div>
  );
}
