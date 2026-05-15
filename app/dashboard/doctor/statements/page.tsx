"use client";

// Doctor statements — monthly / quarterly / yearly view of every
// invoice issued at the doctor's clinics, with tax breakdown for
// filing. Read-only; invoices are created at the reception side.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Period = "month" | "quarter" | "year";

interface InvoiceRow {
  id: string;
  number: string;
  clinicId: string;
  patientName: string;
  issuedAt: string;
  status: "issued" | "paid" | "void";
  currency: string;
  tax: {
    countryIso2: string;
    regime: string;
    exemptSubtotal: number;
    taxableStandardSubtotal: number;
    taxableReducedSubtotal: number;
    cgstRupees?: number;
    sgstRupees?: number;
    igstRupees?: number;
    vatRupees?: number;
    salesTaxRupees?: number;
    totalTaxRupees: number;
    grandTotalRupees: number;
  };
}

interface StatementResp {
  period: Period;
  year: number;
  month: number;
  quarter: number;
  label: string;
  startIso: string;
  endIso: string;
  totals: {
    count: number;
    invoicedTotal: number;
    paidTotal: number;
    taxTotal: number;
    cgstTotal: number;
    sgstTotal: number;
    igstTotal: number;
    vatTotal: number;
    salesTaxTotal: number;
    byMonth: Array<{ month: string; count: number; invoiced: number; tax: number; paid: number }>;
  };
  invoices: InvoiceRow[];
}

export default function StatementsPage() {
  const [period, setPeriod] = useState<Period>("month");
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(now.getUTCMonth() / 3) + 1);

  const [data, setData] = useState<StatementResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams({
        period,
        year: String(year),
        month: String(month),
        quarter: String(quarter),
      });
      const r = await fetch(`/api/doctor/statements?${qs.toString()}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error || "Failed to load");
        return;
      }
      setData(d as StatementResp);
    } finally {
      setLoading(false);
    }
  }, [period, year, month, quarter]);

  useEffect(() => { load(); }, [load]);

  const years = useMemo(() => {
    const yr = now.getUTCFullYear();
    return [yr, yr - 1, yr - 2, yr - 3];
  }, [now]);

  const fmt = (n: number, code: string) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(n || 0);

  const currency = data?.invoices[0]?.currency || "INR";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/dashboard/doctor" className="text-xs text-gray-500 dark:text-slate-400 hover:underline">← Dashboard</Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">Statements</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Tax-ready summary of invoices issued at your clinics.
          </p>
        </div>
      </header>

      {/* Period selector */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
        <div className="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
          {(["month", "quarter", "year"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-full px-3 py-1.5 capitalize transition ${
                period === p
                  ? "bg-white dark:bg-slate-900 text-indigo-700 shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-sm">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        {period === "month" && (
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-sm">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleString("en-US", { month: "long" })}</option>
            ))}
          </select>
        )}
        {period === "quarter" && (
          <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} className="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-sm">
            {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}
          </select>
        )}
        <span className="ml-auto text-xs text-gray-500 dark:text-slate-400">
          {data?.label}
        </span>
      </div>

      {/* Totals cards */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Invoices" value={data?.totals.count ?? 0} tone="indigo" suffix="" />
        <Stat label="Invoiced" value={fmt(data?.totals.invoicedTotal || 0, currency)} tone="emerald" />
        <Stat label="Collected" value={fmt(data?.totals.paidTotal || 0, currency)} tone="violet" />
        <Stat label="Tax due" value={fmt(data?.totals.taxTotal || 0, currency)} tone="rose" />
      </div>

      {/* Tax breakdown by regime */}
      {data && (data.totals.cgstTotal || data.totals.sgstTotal || data.totals.igstTotal || data.totals.vatTotal || data.totals.salesTaxTotal) > 0 && (
        <div className="mb-6 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Tax breakdown</h3>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            {data.totals.cgstTotal > 0 && <TaxRow label="CGST" v={fmt(data.totals.cgstTotal, currency)} />}
            {data.totals.sgstTotal > 0 && <TaxRow label="SGST" v={fmt(data.totals.sgstTotal, currency)} />}
            {data.totals.igstTotal > 0 && <TaxRow label="IGST" v={fmt(data.totals.igstTotal, currency)} />}
            {data.totals.vatTotal > 0 && <TaxRow label="VAT" v={fmt(data.totals.vatTotal, currency)} />}
            {data.totals.salesTaxTotal > 0 && <TaxRow label="Sales tax" v={fmt(data.totals.salesTaxTotal, currency)} />}
          </dl>
        </div>
      )}

      {/* Invoice list */}
      <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="border-b border-gray-100 dark:border-slate-800 px-5 py-3 text-sm font-semibold text-gray-900 dark:text-slate-100">
          Invoices ({data?.invoices.length ?? 0})
        </div>
        {err && <p className="px-5 py-4 text-sm text-rose-600">{err}</p>}
        {loading && !data ? (
          <p className="px-5 py-4 text-sm text-gray-500 dark:text-slate-400">Loading…</p>
        ) : data?.invoices.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-gray-500 dark:text-slate-400">No invoices in this period.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-800">
            {data?.invoices.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-gray-400 dark:text-slate-500">{inv.number}</p>
                  <p className="font-medium text-gray-900 dark:text-slate-100 truncate">{inv.patientName}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {new Date(inv.issuedAt).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })} ·{" "}
                    <StatusPill status={inv.status} />
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-slate-100">{fmt(inv.tax.grandTotalRupees, inv.currency)}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">tax {fmt(inv.tax.totalTaxRupees, inv.currency)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value, tone, suffix }: { label: string; value: number | string; tone: "indigo" | "emerald" | "violet" | "rose"; suffix?: string }) {
  const tones: Record<string, string> = {
    indigo: "from-indigo-900/40 to-indigo-950/60 text-indigo-200 border-indigo-900/60",
    emerald: "from-emerald-900/40 to-emerald-950/60 text-emerald-200 border-emerald-900/60",
    violet: "from-violet-900/40 to-violet-950/60 text-violet-200 border-violet-900/60",
    rose: "from-rose-900/40 to-rose-950/60 text-rose-200 border-rose-900/60",
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${tones[tone]} p-5`}>
      <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}{suffix ?? ""}</p>
    </div>
  );
}

function TaxRow({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5">
      <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">{label}</dt>
      <dd className="font-mono font-semibold text-gray-900 dark:text-slate-100">{v}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: "issued" | "paid" | "void" }) {
  const cls =
    status === "paid" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
    : status === "void" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>{status}</span>;
}
