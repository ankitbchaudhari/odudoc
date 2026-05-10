"use client";

// Super-admin revenue dashboard — cross-store snapshot.

import { useCallback, useEffect, useState } from "react";

interface RevenueResp {
  windowDays: number;
  totals: { gmv: number; platformRevenue: number; walletFloat: number; activeWallets: number; subscriptionsArrInr: number };
  pharmacy: { gmv: number; cut: number; orderCount: number };
  lab: { gmv: number; cut: number; orderCount: number };
  cashless: { approvedGmv: number; preauthCount: number };
  wallet: { totalBalance: number; totalBonus: number; activeWallets: number; lifetimeToppedUp: number; lifetimeSpent: number };
  generatedAt: string;
}

function fmtINR(n: number, compact = false): string {
  if (compact && n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (compact && n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (compact && n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/super/revenue", { cache: "no-store" });
    if (r.ok) { setData(await r.json()); setError(null); }
    else {
      const body = await r.json().catch(() => ({}));
      setError(body.error || `Failed (${r.status})`);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <div><p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-800">{error === "forbidden" ? "Super-admin only." : error}</p></div>;
  if (!data) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Revenue Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">Last {data.windowDays} days · {new Date(data.generatedAt).toLocaleString()}</p>
        </div>
        <button onClick={load} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Refresh</button>
      </div>

      {/* Hero KPIs */}
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Hero label="Total GMV" v={fmtINR(data.totals.gmv, true)} sub="last 90d" tone="indigo" />
        <Hero label="Platform revenue" v={fmtINR(data.totals.platformRevenue, true)} sub="OduDoc cut" tone="emerald" />
        <Hero label="Wallet float" v={fmtINR(data.totals.walletFloat, true)} sub={`${data.totals.activeWallets} active`} tone="violet" />
        <Hero label="Subscriptions ARR" v={fmtINR(data.totals.subscriptionsArrInr, true)} sub="annualised" tone="amber" />
      </div>

      {/* Channel split */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Channel
          title="💊 Pharmacy marketplace"
          gmv={data.pharmacy.gmv} cut={data.pharmacy.cut} orderCount={data.pharmacy.orderCount}
          link="/admin/rx-fulfillment" linkLabel="Pharmacy Ops"
        />
        <Channel
          title="🧪 Lab marketplace"
          gmv={data.lab.gmv} cut={data.lab.cut} orderCount={data.lab.orderCount}
          link="/admin/lab-ops" linkLabel="Lab Ops"
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-900">🛡️ Cashless flow</p>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">{fmtINR(data.cashless.approvedGmv, true)}</p>
          <p className="mt-1 text-xs text-slate-500">approved value across {data.cashless.preauthCount} pre-auth{data.cashless.preauthCount === 1 ? "" : "s"}</p>
          <p className="mt-3 text-[11px] text-slate-500">No direct platform cut, but it&apos;s a major leading indicator of hospital adoption depth.</p>
        </div>
      </div>

      {/* Wallet detail */}
      <div className="mb-6 rounded-2xl border border-violet-200 bg-violet-50/40 p-5">
        <p className="mb-3 text-sm font-bold text-violet-900">Wallet — float earns interest on idle balance</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <Mini label="Total balance" v={fmtINR(data.wallet.totalBalance)} />
          <Mini label="Bonus liability" v={fmtINR(data.wallet.totalBonus)} accent="amber" />
          <Mini label="Lifetime topped up" v={fmtINR(data.wallet.lifetimeToppedUp)} />
          <Mini label="Lifetime spent" v={fmtINR(data.wallet.lifetimeSpent)} />
        </div>
        <p className="mt-3 text-xs text-violet-800">
          Idle balance × ~4% APY = <strong>{fmtINR((data.wallet.totalBalance + data.wallet.totalBonus) * 0.04)}</strong> annualised float income.
        </p>
      </div>

      <p className="text-center text-[10px] text-slate-400">
        Numbers reflect orders in delivered / reported state. Cashless GMV = approved pre-auths in the window.
      </p>
    </div>
  );
}

function Hero({ label, v, sub, tone }: { label: string; v: string; sub: string; tone: "indigo" | "emerald" | "violet" | "amber" }) {
  const cls = tone === "indigo" ? "from-indigo-600 to-blue-700"
    : tone === "emerald" ? "from-emerald-600 to-teal-700"
    : tone === "violet" ? "from-violet-600 to-fuchsia-700"
    : "from-amber-500 to-orange-600";
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${cls} p-5 text-white shadow-md`}>
      <p className="text-[11px] uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-extrabold">{v}</p>
      <p className="text-[10px] opacity-80">{sub}</p>
    </div>
  );
}
function Channel({ title, gmv, cut, orderCount, link, linkLabel }: { title: string; gmv: number; cut: number; orderCount: number; link: string; linkLabel: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-3 text-3xl font-extrabold text-slate-900">{fmtINR(gmv, true)}</p>
      <p className="text-[11px] text-slate-500">GMV across {orderCount} order{orderCount === 1 ? "" : "s"}</p>
      <p className="mt-2 text-xs"><strong className="text-emerald-700">{fmtINR(cut)}</strong> platform cut</p>
      <a href={link} className="mt-3 inline-block text-[11px] font-semibold text-indigo-600 hover:underline">→ {linkLabel}</a>
    </div>
  );
}
function Mini({ label, v, accent }: { label: string; v: string; accent?: "amber" }) {
  return (
    <div className="rounded-lg bg-white p-3 shadow-sm">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-extrabold ${accent === "amber" ? "text-amber-700" : "text-slate-900"}`}>{v}</p>
    </div>
  );
}
