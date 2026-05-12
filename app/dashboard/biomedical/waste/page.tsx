"use client";

// Biomedical waste log — BMW-2016 / OSHA / EU compliance.
// One screen for the biomedical engineer to log every bag, see the
// monthly summary, and export the manifest. Color codes match the
// canonical lib/clinical-tones palette.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { tone } from "@/lib/clinical-tones";

type WasteCategory = "yellow" | "red" | "blue" | "white" | "black";

interface Entry {
  id: string;
  category: WasteCategory;
  sourceDept: string;
  weightGrams: number;
  bagCount: number;
  vendorName?: string;
  manifestNo?: string;
  notes?: string;
  loggedBy: string;
  disposedAt: string;
}

interface Summary {
  month: string;
  totals: Record<WasteCategory, { weightGrams: number; bagCount: number }>;
  totalWeightGrams: number;
  totalBags: number;
  byDept: Record<string, number>;
}

const CATEGORY_TONE: Record<WasteCategory, "waste_yellow" | "waste_red" | "waste_blue" | "waste_white" | "waste_black"> = {
  yellow: "waste_yellow",
  red: "waste_red",
  blue: "waste_blue",
  white: "waste_white",
  black: "waste_black",
};

const CATEGORY_HINTS: Record<WasteCategory, string> = {
  yellow: "Anatomical, soiled dressings, infectious",
  red: "Contaminated plastics, IV tubing, gloves",
  blue: "Glass + metal sharps (broken vials)",
  white: "Sharps — needles, blades (puncture-proof)",
  black: "General municipal (non-biomedical)",
};

export default function WasteLogPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [filter, setFilter] = useState<WasteCategory | "All">("All");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{
    category: WasteCategory;
    sourceDept: string;
    weightGrams: string;
    bagCount: string;
    vendorName: string;
    manifestNo: string;
    notes: string;
  }>({
    category: "yellow",
    sourceDept: "",
    weightGrams: "",
    bagCount: "1",
    vendorName: "",
    manifestNo: "",
    notes: "",
  });

  const load = useCallback(async () => {
    const sp = new URLSearchParams({ month });
    if (filter !== "All") sp.set("category", filter);
    try {
      const r = await fetch(`/api/emr/waste?${sp}`, { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setEntries(d.entries || []);
        setSummary(d.summary || null);
      }
    } catch { /* noop */ }
  }, [month, filter]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/emr/waste", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        weightGrams: Number(form.weightGrams),
        bagCount: Number(form.bagCount) || 1,
      }),
    });
    setForm({ ...form, sourceDept: "", weightGrams: "", manifestNo: "", notes: "" });
    await load();
    setBusy(false);
  };

  const kg = (g: number) => (g / 1000).toFixed(2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/40 to-rose-50/40">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/dashboard/biomedical" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-amber-700">
          ← Biomedical
        </Link>

        {/* Hero */}
        <div className="relative mt-4 mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-600 via-orange-600 to-rose-600 p-8 text-white shadow-xl">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-yellow-300/30 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                Compliance · BMW-2016 / OSHA / EU
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Biomedical waste log</h1>
              <p className="mt-2 max-w-md text-sm text-white/90">
                Log every bag handed to your disposal vendor. Generates the
                monthly manifest for regulatory submission.
              </p>
            </div>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm ring-1 ring-white/30 focus:outline-none [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Summary tiles */}
        {summary && (
          <div className="mb-6 grid gap-3 grid-cols-2 lg:grid-cols-5">
            {(["yellow", "red", "blue", "white", "black"] as WasteCategory[]).map((c) => {
              const T = tone(CATEGORY_TONE[c]);
              const t = summary.totals[c];
              return (
                <div key={c} className={`rounded-2xl border bg-white dark:bg-slate-900 p-4 shadow-sm ${T.row}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{T.emoji}</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-700 dark:text-slate-300">{T.label}</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{kg(t.weightGrams)} kg</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.bagCount} bag(s)</p>
                </div>
              );
            })}
          </div>
        )}

        {/* New entry form */}
        <form onSubmit={submit} className="mb-6 rounded-3xl border border-white/60 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Log a disposal</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{CATEGORY_HINTS[form.category]}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(["yellow", "red", "blue", "white", "black"] as WasteCategory[]).map((c) => {
              const T = tone(CATEGORY_TONE[c]);
              const active = form.category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, category: c })}
                  className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ring-1 ${active ? T.pill + " ring-2 ring-offset-1" : "ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:-translate-y-0.5"}`}
                >
                  <span className="mr-1">{T.emoji}</span>{T.label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field label="Source department" required value={form.sourceDept} onChange={(v) => setForm({ ...form, sourceDept: v })} placeholder="OPD-2 / Pathology / OR-1" />
            <Field label="Weight (grams)" required type="number" value={form.weightGrams} onChange={(v) => setForm({ ...form, weightGrams: v })} placeholder="500" />
            <Field label="Bag count" type="number" value={form.bagCount} onChange={(v) => setForm({ ...form, bagCount: v })} />
            <Field label="Disposal vendor" value={form.vendorName} onChange={(v) => setForm({ ...form, vendorName: v })} />
            <Field label="Manifest no." value={form.manifestNo} onChange={(v) => setForm({ ...form, manifestNo: v })} />
            <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
          </div>
          <div className="mt-4">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 disabled:opacity-50"
            >
              {busy ? "Logging…" : "Log disposal"}
            </button>
          </div>
        </form>

        {/* Filters */}
        <div className="mb-3 flex flex-wrap gap-2">
          {(["All", "yellow", "red", "blue", "white", "black"] as Array<WasteCategory | "All">).map((c) => {
            const active = filter === c;
            const T = c === "All" ? null : tone(CATEGORY_TONE[c]);
            return (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-slate-900 text-white" : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:-translate-y-0.5"}`}
              >
                {T ? <span className="mr-1">{T.emoji}</span> : null}
                {c === "All" ? "All" : tone(CATEGORY_TONE[c]).label}
              </button>
            );
          })}
        </div>

        {/* Entries */}
        <div className="space-y-2">
          {entries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-12 text-center shadow-sm">
              <span className="text-4xl">🗑️</span>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No entries for this filter / month.</p>
            </div>
          ) : entries.map((e) => (
            <article key={e.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white dark:bg-slate-900 p-4 shadow-sm ${tone(CATEGORY_TONE[e.category]).row}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={CATEGORY_TONE[e.category]} />
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{e.sourceDept}</span>
                  {e.manifestNo && <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">M# {e.manifestNo}</span>}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {kg(e.weightGrams)} kg · {e.bagCount} bag(s)
                  {e.vendorName && <> · vendor: {e.vendorName}</>}
                  {e.loggedBy && <> · by {e.loggedBy}</>}
                  · {new Date(e.disposedAt).toLocaleString()}
                </p>
                {e.notes && <p className="mt-1 text-[11px] italic text-slate-500 dark:text-slate-400">{e.notes}</p>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, required, type = "text", placeholder,
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
        {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
      />
    </label>
  );
}
