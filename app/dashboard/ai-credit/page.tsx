"use client";

// AI credit dashboard.
//
// Shows current balance, 30-day spend by feature, recent usage rows,
// auto-topup rule editor, and a manual top-up button. Doctors and
// hospital admins both land here from /dashboard.

import { useCallback, useEffect, useState } from "react";

interface Account {
  id: string; ownerKind: string; ownerId: string;
  balanceRupees: number; lifetimeSpentRupees: number; lifetimeToppedUpRupees: number;
  autoTopup?: { enabled: boolean; thresholdRupees: number; topupAmountRupees: number; lastFiredAt?: string };
}
interface Usage {
  id: string; feature: string; unitCount: number;
  costRupees: number; status: string; context?: string; createdAt: string;
}
interface Pricing { perUnitRupees: number; unitLabel: string; }

const FEATURE_LABEL: Record<string, string> = {
  ddx: "Differential diagnosis", scribe: "Scribe", ocr: "OCR",
  triage: "Triage", translation: "Translation", image_analysis: "Image analysis",
  voice_transcript: "Voice transcript", rx_safety: "Rx safety", summarize: "Summarize",
};

export default function AiCreditPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [pricing, setPricing] = useState<Record<string, Pricing>>({});
  const [recent, setRecent] = useState<Usage[]>([]);
  const [summary, setSummary] = useState<{ totalRupees: number; calls: number; byFeature: Record<string, { rupees: number; calls: number }> }>({ totalRupees: 0, calls: 0, byFeature: {} });
  const [topupAmount, setTopupAmount] = useState(500);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/ai-credit", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setAccount(d.account);
      setPricing(d.pricing || {});
      setRecent(d.recent || []);
      setSummary(d.summary || { totalRupees: 0, calls: 0, byFeature: {} });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const topup = async () => {
    setBusy(true);
    try {
      await fetch("/api/ai-credit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "topup", amountRupees: topupAmount, source: "ops" }),
      });
      load();
    } finally { setBusy(false); }
  };

  const setAuto = async (patch: { enabled?: boolean; thresholdRupees?: number; topupAmountRupees?: number }) => {
    await fetch("/api/ai-credit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_auto_topup", ...patch }),
    });
    load();
  };

  if (!account) return <p className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-slate-400">Loading…</p>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">AI credits</h1>
        <p className="mt-1 text-sm text-slate-500">Premium AI features run off this balance — DDx, scribe, OCR, image analysis, voice transcript, Rx safety, and more.</p>
      </div>

      {/* Balance hero */}
      <div className="rounded-3xl bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 p-8 text-white shadow-xl">
        <p className="text-xs font-bold uppercase tracking-wider opacity-80">Current balance</p>
        <p className="mt-2 text-5xl font-extrabold">₹{account.balanceRupees.toLocaleString("en-IN")}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg bg-white/15 p-3 backdrop-blur">
            <p className="opacity-80">Lifetime topped up</p>
            <p className="mt-0.5 text-lg font-bold">₹{account.lifetimeToppedUpRupees.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-lg bg-white/15 p-3 backdrop-blur">
            <p className="opacity-80">Lifetime spent</p>
            <p className="mt-0.5 text-lg font-bold">₹{account.lifetimeSpentRupees.toLocaleString("en-IN")}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[100, 500, 1000, 2500].map((amt) => (
            <button key={amt} onClick={() => setTopupAmount(amt)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${topupAmount === amt ? "bg-white text-violet-700" : "bg-white/20 text-white"}`}>₹{amt}</button>
          ))}
          <input type="number" value={topupAmount} onChange={(e) => setTopupAmount(Number(e.target.value) || 0)} className="w-24 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-bold text-white placeholder:text-white/60" />
          <button onClick={topup} disabled={busy || topupAmount < 1} className="ml-auto rounded-lg bg-white px-4 py-2 text-sm font-bold text-violet-700 disabled:opacity-50">
            {busy ? "Adding…" : `Add ₹${topupAmount.toLocaleString("en-IN")}`}
          </button>
        </div>
      </div>

      {/* Auto-topup rule */}
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900">Auto-topup</p>
          <button
            onClick={() => setAuto({ enabled: !account.autoTopup?.enabled })}
            className={`relative h-6 w-11 rounded-full ${account.autoTopup?.enabled ? "bg-violet-600" : "bg-slate-300"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 transform rounded-full bg-white shadow transition-transform ${account.autoTopup?.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">When balance drops below the threshold, a top-up of the configured amount is queued automatically.</p>
        {account.autoTopup && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-700">
              Threshold (₹)
              <input type="number" defaultValue={account.autoTopup.thresholdRupees} onBlur={(e) => setAuto({ thresholdRupees: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Top-up amount (₹)
              <input type="number" defaultValue={account.autoTopup.topupAmountRupees} onBlur={(e) => setAuto({ topupAmountRupees: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
            </label>
          </div>
        )}
      </section>

      {/* Pricing reference */}
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="mb-3 text-sm font-bold text-slate-900">What things cost</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(pricing).map(([k, p]) => (
            <div key={k} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
              <p className="font-bold text-slate-900">{FEATURE_LABEL[k] || k}</p>
              <p className="text-slate-500">₹{p.perUnitRupees} / {p.unitLabel}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 30-day spend */}
      {summary.calls > 0 && (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="mb-3 text-sm font-bold text-slate-900">Last 30 days</p>
          <p className="text-3xl font-extrabold text-slate-900">₹{summary.totalRupees.toLocaleString("en-IN")} <span className="text-sm font-normal text-slate-500">across {summary.calls} call{summary.calls === 1 ? "" : "s"}</span></p>
          <ul className="mt-3 space-y-1.5">
            {Object.entries(summary.byFeature).sort((a, b) => b[1].rupees - a[1].rupees).map(([k, v]) => (
              <li key={k} className="flex items-baseline justify-between text-sm">
                <span className="text-slate-700">{FEATURE_LABEL[k] || k}</span>
                <span className="tabular-nums font-bold">₹{v.rupees.toLocaleString("en-IN")} <span className="text-[10px] font-normal text-slate-500">({v.calls})</span></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Recent usage */}
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="mb-3 text-sm font-bold text-slate-900">Recent usage</p>
        {recent.length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-4 text-xs text-slate-500">No AI calls yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((u) => (
              <li key={u.id} className="flex items-center justify-between py-2 text-xs">
                <div>
                  <p className="font-bold text-slate-900">{FEATURE_LABEL[u.feature] || u.feature}</p>
                  <p className="text-[10px] text-slate-500">{new Date(u.createdAt).toLocaleString()} · {u.unitCount} units{u.context ? ` · ${u.context}` : ""}</p>
                </div>
                <span className={`tabular-nums font-bold ${u.status === "refunded" ? "text-emerald-600 line-through" : "text-slate-900"}`}>
                  −₹{u.costRupees.toLocaleString("en-IN")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
