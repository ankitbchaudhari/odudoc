"use client";

// Patient lab marketplace flow.
//
//   1. Pick tests (multi-select against the curated catalogue, or
//      pre-filled from a doctor-issued order via ?tests=CBC,HBA1C).
//   2. Match → ranked lab offers with coverage / price / TAT / NABL.
//   3. Order: pick fulfilment (home collection / in-lab) + address /
//      slot, place. 5-stage tracker on My orders.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface CatalogTest { testCode: string; testName: string; category: string; minPrice: number }
interface LabMeta { labId: string; labName: string; city?: string; pincode?: string; testCount: number }
interface MatchedTest {
  testCode: string; available: boolean;
  pricedRupees?: number; mrpRupees?: number;
  reportingHours?: number; fastingHours?: number; testEntryId?: string;
}
interface LabOffer {
  labId: string; labName: string; city?: string; pincode?: string;
  tests: MatchedTest[]; coveragePct: number;
  totalRupees: number; totalMrpRupees: number; savingsRupees: number;
  reportingHours: number; fastingHoursMax?: number;
  homeCollection: boolean; homeCollectionFeeRupees: number;
  nablAccredited: boolean; effectiveDiscountPct: number;
  score: number; samePincode: boolean;
}
interface OrderLine { testCode: string; testName?: string; pricedRupees: number; mrpRupees: number; testEntryId?: string; resultText?: string; resultUrl?: string }
interface LabOrder {
  id: string; labId: string; labName: string;
  fulfilment: "home_collection" | "in_lab"; address?: string; scheduledFor?: string;
  lines: OrderLine[]; subtotalRupees: number; collectionFeeRupees: number; totalRupees: number;
  status: string; events: Array<{ at: string; status: string; note?: string }>;
  createdAt: string; reportUrl?: string;
}

const STATUS_PILL: Record<string, string> = {
  placed: "bg-amber-100 text-amber-800",
  confirmed: "bg-sky-100 text-sky-800",
  sample_collected: "bg-indigo-100 text-indigo-800",
  in_lab: "bg-violet-100 text-violet-800",
  reported: "bg-emerald-100 text-emerald-800",
  closed: "bg-emerald-200 text-emerald-900",
  cancelled: "bg-slate-200 text-slate-600 dark:text-slate-300",
};
const STATUS_LABEL: Record<string, string> = {
  placed: "Placed", confirmed: "Confirmed",
  sample_collected: "Sample collected", in_lab: "In lab",
  reported: "Reported", closed: "Closed", cancelled: "Cancelled",
};
const STAGES = ["placed", "confirmed", "sample_collected", "in_lab", "reported"];

const CATEGORY_TONE: Record<string, string> = {
  blood: "bg-rose-100 text-rose-800",
  urine: "bg-amber-100 text-amber-800",
  imaging: "bg-indigo-100 text-indigo-800",
  ecg: "bg-pink-100 text-pink-800",
  biopsy: "bg-fuchsia-100 text-fuchsia-800",
  stool: "bg-yellow-100 text-yellow-800",
  other: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
};

function fmtINR(n: number): string { return `₹${Math.round(n).toLocaleString("en-IN")}`; }

function LabsContent() {
  const params = useSearchParams();
  const [catalog, setCatalog] = useState<{ labs: LabMeta[]; tests: CatalogTest[] }>({ labs: [], tests: [] });
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pincode, setPincode] = useState("500033");
  const [filter, setFilter] = useState("");
  const [includePartial, setIncludePartial] = useState(false);
  const [offers, setOffers] = useState<LabOffer[]>([]);
  const [matching, setMatching] = useState(false);
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [orderingFrom, setOrderingFrom] = useState<LabOffer | null>(null);
  const [fulfilment, setFulfilment] = useState<"home_collection" | "in_lab">("home_collection");
  const [address, setAddress] = useState("Flat 401, Block C, Jubilee Heights, Hyderabad 500033");
  const [slot, setSlot] = useState("");
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const [r1, r2] = await Promise.all([
      fetch("/api/lab-marketplace/catalog", { cache: "no-store" }),
      fetch("/api/lab-marketplace/orders", { cache: "no-store" }),
    ]);
    if (r1.ok) setCatalog(await r1.json());
    if (r2.ok) setOrders((await r2.json()).orders || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Pre-fill tests from query string.
  useEffect(() => {
    const t = params.get("tests");
    if (t) {
      const codes = t.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      setPicked(new Set(codes));
    }
  }, [params]);

  const seed = async () => {
    const r = await fetch("/api/lab-marketplace/catalog", { method: "POST" });
    if (r.ok) {
      const d = await r.json();
      setToast({ kind: "ok", text: `Seeded ${d.inserted} tests across ${d.labs.length} labs.` });
      await load();
    }
  };

  const togglePick = (code: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  const search = async () => {
    if (picked.size === 0) { setToast({ kind: "err", text: "Pick at least one test." }); return; }
    setMatching(true);
    setOffers([]);
    try {
      const r = await fetch("/api/lab-marketplace/match", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tests: Array.from(picked).map((code) => ({ testCode: code })),
          patientPincode: pincode || undefined,
          includePartial,
        }),
      });
      if (r.ok) setOffers((await r.json()).offers || []);
    } finally { setMatching(false); }
  };

  const placeOrder = async () => {
    if (!orderingFrom) return;
    if (fulfilment === "home_collection" && !address.trim()) {
      setToast({ kind: "err", text: "Address required for home collection." });
      return;
    }
    const lines = orderingFrom.tests.filter((t) => t.available).map((t) => ({
      testCode: t.testCode,
      testName: catalog.tests.find((c) => c.testCode === t.testCode)?.testName,
      pricedRupees: t.pricedRupees || 0,
      mrpRupees: t.mrpRupees || 0,
      testEntryId: t.testEntryId,
    }));
    const collectionFee = fulfilment === "home_collection" ? orderingFrom.homeCollectionFeeRupees : 0;
    const r = await fetch("/api/lab-marketplace/orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        labId: orderingFrom.labId,
        labName: orderingFrom.labName,
        fulfilment,
        address: fulfilment === "home_collection" ? address : undefined,
        scheduledFor: slot || undefined,
        lines,
        collectionFeeRupees: collectionFee,
      }),
    });
    if (r.ok) {
      setToast({ kind: "ok", text: `Order placed with ${orderingFrom.labName}.` });
      setOrderingFrom(null);
      setOffers([]);
      setPicked(new Set());
      await load();
    } else {
      setToast({ kind: "err", text: "Order failed." });
    }
  };

  const cancelOrder = async (id: string) => {
    if (!confirm("Cancel this lab order?")) return;
    const r = await fetch(`/api/lab-marketplace/orders/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "cancelled", note: "patient_cancelled" }),
    });
    if (r.ok) { setToast({ kind: "ok", text: "Cancelled." }); await load(); }
  };

  const filteredCatalog = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return catalog.tests;
    return catalog.tests.filter((t) => t.testName.toLowerCase().includes(q) || t.testCode.toLowerCase().includes(q));
  }, [catalog, filter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
    <div className="mx-auto max-w-5xl px-4 py-8">
      {toast && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${toast.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white text-2xl shadow-lg shadow-teal-500/30">🧪</div>
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-300 dark:to-cyan-300 bg-clip-text text-transparent">Lab Tests</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Pick tests, see nearby NABL-accredited labs, and book home collection or an in-lab visit.
            </p>
          </div>
        </div>
        {catalog.labs.length === 0 && (
          <button onClick={seed} className="rounded-xl border border-dashed border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-slate-800 transition">Seed demo</button>
        )}
      </div>

      {/* Test picker */}
      <section className="mb-6 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition ring-1 ring-slate-200 dark:ring-slate-800">
        <p className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-100">
          Pick tests
          {picked.size > 0 && <span className="ml-2 inline-flex items-center rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm shadow-teal-500/30">{picked.size} in cart</span>}
        </p>
        {picked.size > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {Array.from(picked).map((code) => {
              const t = catalog.tests.find((c) => c.testCode === code);
              return (
                <button key={code} onClick={() => togglePick(code)} className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-teal-100 to-cyan-100 dark:from-teal-900/40 dark:to-cyan-900/40 px-2.5 py-1 text-[11px] font-semibold text-teal-800 dark:text-teal-200 ring-1 ring-teal-200 dark:ring-teal-800 hover:bg-rose-50">
                  {t?.testName || code} <span className="text-teal-500">×</span>
                </button>
              );
            })}
          </div>
        )}
        <input
          className="mb-3 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
          placeholder="Search tests (CBC, HbA1c, lipid…)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="grid gap-1.5 sm:grid-cols-2">
          {filteredCatalog.slice(0, 50).map((t) => {
            const on = picked.has(t.testCode);
            return (
              <button
                key={t.testCode}
                onClick={() => togglePick(t.testCode)}
                className={`flex items-start justify-between gap-2 rounded-lg border p-2 text-left text-xs transition ${on ? "border-teal-500 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/40 dark:to-cyan-950/40 dark:border-teal-700 shadow-sm" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-teal-300 hover:shadow-sm"}`}
              >
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100">{t.testName}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${CATEGORY_TONE[t.category] || "bg-slate-100 dark:bg-slate-800"}`}>{t.category}</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">from</p>
                  <p className="font-bold text-emerald-700">{fmtINR(t.minPrice)}</p>
                </div>
              </button>
            );
          })}
          {filteredCatalog.length === 0 && <p className="col-span-full p-4 text-center text-sm text-slate-400">No tests in catalogue. Use Seed demo to populate.</p>}
        </div>
        {filteredCatalog.length > 50 && <p className="mt-2 text-[10px] text-slate-400">Showing first 50 — refine search to see more.</p>}

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none" placeholder="Pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} />
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={includePartial} onChange={(e) => setIncludePartial(e.target.checked)} />
            Show partial matches
          </label>
          <button onClick={search} disabled={matching || picked.size === 0} className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-teal-500/30 ring-2 ring-teal-400/30 transition disabled:opacity-50 disabled:shadow-none disabled:ring-0">
            {matching ? "Searching…" : "Find labs →"}
          </button>
        </div>
      </section>

      {/* Offers */}
      {offers.length > 0 && (
        <section className="mb-6 space-y-3">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{offers.length} lab{offers.length === 1 ? "" : "s"} matched</p>
          {offers.map((o, i) => (
            <div key={o.labId} className={`rounded-2xl p-4 shadow-sm hover:shadow-md transition ring-1 ${i === 0 ? "ring-2 ring-teal-300 dark:ring-teal-700 bg-gradient-to-br from-teal-50 to-cyan-50/40 dark:from-teal-950/30 dark:to-cyan-950/20" : "ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-[240px]">
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    {o.labName}
                    {i === 0 && <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Best match</span>}
                    {o.samePincode && <span className="ml-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-700">Same pincode</span>}
                    {o.nablAccredited && <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">NABL</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{o.city || "—"}{o.pincode ? ` · ${o.pincode}` : ""}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5">Coverage {o.coveragePct}%</span>
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-emerald-800">{o.effectiveDiscountPct}% off</span>
                    <span className="rounded-md bg-sky-100 px-2 py-0.5 text-sky-800">Reports in {o.reportingHours}h</span>
                    {o.homeCollection && <span className="rounded-md bg-violet-100 px-2 py-0.5 text-violet-800">Home collection ₹{o.homeCollectionFeeRupees}</span>}
                    {o.fastingHoursMax !== undefined && o.fastingHoursMax > 0 && <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-800">Fast {o.fastingHoursMax}h</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{fmtINR(o.totalRupees)}</p>
                  {o.savingsRupees > 0 && <p className="text-xs text-emerald-700">Save {fmtINR(o.savingsRupees)} vs MRP</p>}
                  <button onClick={() => setOrderingFrom(o)} className="mt-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 px-4 py-2 text-sm font-bold text-white shadow-md shadow-teal-500/30 transition">Book →</button>
                </div>
              </div>
              <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {o.tests.map((t, j) => (
                  <div key={j} className={`rounded-md px-2 py-1 text-xs ${t.available ? "bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800" : "bg-rose-50 ring-1 ring-rose-200"}`}>
                    <div className="flex items-center justify-between">
                      <span className={t.available ? "text-slate-800 dark:text-slate-200" : "text-rose-700"}>
                        {t.available ? "✓" : "✗"} <strong>{catalog.tests.find((c) => c.testCode === t.testCode)?.testName || t.testCode}</strong>
                      </span>
                      {t.available && t.pricedRupees !== undefined && <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{fmtINR(t.pricedRupees)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* My orders */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition ring-1 ring-slate-200 dark:ring-slate-800">
        <p className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">My lab orders</p>
        {orders.length === 0 ? (
          <div className="rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/20 p-8 text-center ring-1 ring-teal-200/60 dark:ring-teal-900/40">
            <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/40 dark:to-cyan-900/40 flex items-center justify-center text-3xl">🧪</div>
            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">No orders yet</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Pick tests above and book your first lab visit.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id} className="rounded-xl ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{o.labName}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {o.fulfilment === "home_collection" ? "Home collection" : "In-lab"} · Placed {new Date(o.createdAt).toLocaleString()}
                    </p>
                    <div className="mt-2 flex items-center gap-1">
                      {STAGES.map((s, i) => {
                        const reached = STAGES.indexOf(o.status) >= i || o.status === "reported";
                        const done = STAGES.indexOf(o.status) > i || o.status === "reported";
                        const cancelled = o.status === "cancelled";
                        return (
                          <div key={s} className="flex flex-1 items-center gap-1">
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${cancelled ? "bg-slate-200 text-slate-500 dark:text-slate-400" : done ? "bg-emerald-500 text-white" : reached ? "bg-indigo-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                              {done || (reached && o.status === s) ? "✓" : i + 1}
                            </span>
                            {i < STAGES.length - 1 && <div className={`h-0.5 flex-1 ${cancelled ? "bg-slate-200" : done ? "bg-emerald-300" : "bg-slate-200"}`} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${STATUS_PILL[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{fmtINR(o.totalRupees)}</p>
                    {(o.status === "placed" || o.status === "confirmed") && (
                      <button onClick={() => cancelOrder(o.id)} className="mt-1 text-[11px] font-semibold text-rose-600">Cancel</button>
                    )}
                  </div>
                </div>
                <ul className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
                  {o.lines.map((l, j) => (
                    <li key={j} className="flex justify-between rounded-md bg-slate-50 dark:bg-slate-900 px-2 py-1">
                      <span className="text-slate-700 dark:text-slate-300">{l.testName || l.testCode}</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{fmtINR(l.pricedRupees)}</span>
                    </li>
                  ))}
                </ul>
                {o.status === "reported" && (
                  <p className="mt-2 rounded-md bg-emerald-50 p-2 text-xs text-emerald-800">
                    ✓ Reports ready{o.reportUrl ? <> — <a href={o.reportUrl} className="underline">download</a></> : null}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Order confirm dialog */}
      {orderingFrom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setOrderingFrom(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl ring-1 ring-teal-200 dark:ring-teal-900/40" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Confirm booking</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{orderingFrom.labName}</p>

            <div className="mt-4 space-y-3">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fulfilment</p>
                <div className="flex gap-2">
                  {orderingFrom.homeCollection && (
                    <button onClick={() => setFulfilment("home_collection")} className={`flex-1 rounded-lg border-2 p-2 text-sm ${fulfilment === "home_collection" ? "border-indigo-500 bg-indigo-50" : "border-slate-200 dark:border-slate-800"}`}>
                      🏠 Home collection<br /><span className="text-[11px] text-slate-500 dark:text-slate-400">+{fmtINR(orderingFrom.homeCollectionFeeRupees)}</span>
                    </button>
                  )}
                  <button onClick={() => setFulfilment("in_lab")} className={`flex-1 rounded-lg border-2 p-2 text-sm ${fulfilment === "in_lab" ? "border-indigo-500 bg-indigo-50" : "border-slate-200 dark:border-slate-800"}`}>
                    🏥 Visit lab<br /><span className="text-[11px] text-slate-500 dark:text-slate-400">No collection fee</span>
                  </button>
                </div>
              </div>
              {fulfilment === "home_collection" && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Collection address</p>
                  <textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
              )}
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Preferred slot</p>
                <input type="datetime-local" value={slot} onChange={(e) => setSlot(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              {orderingFrom.fastingHoursMax !== undefined && orderingFrom.fastingHoursMax > 0 && (
                <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">⚠ Fast for {orderingFrom.fastingHoursMax}h before sample collection.</p>
              )}
              <div className="rounded-md bg-slate-50 dark:bg-slate-900 p-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">Subtotal</span><span className="font-mono">{fmtINR(orderingFrom.totalRupees)}</span></div>
                {fulfilment === "home_collection" && (
                  <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">Collection fee</span><span className="font-mono">{fmtINR(orderingFrom.homeCollectionFeeRupees)}</span></div>
                )}
                <div className="mt-1 flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1 text-base font-bold"><span>Total</span><span className="font-mono">{fmtINR(orderingFrom.totalRupees + (fulfilment === "home_collection" ? orderingFrom.homeCollectionFeeRupees : 0))}</span></div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setOrderingFrom(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Cancel</button>
              <button onClick={placeOrder} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Place order</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

export default function LabsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-6"><p className="text-sm text-slate-400">Loading…</p></div>}>
      <LabsContent />
    </Suspense>
  );
}
