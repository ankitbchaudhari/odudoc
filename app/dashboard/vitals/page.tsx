"use client";

// Vital signs dashboard.
//
// Layout: at-a-glance latest-reading cards across the top (BP,
// glucose, weight, HR, SpO2, temp), then a kind-filterable trend
// chart + log table beneath. "Log a reading" expands an inline form
// rather than a modal — fewer taps, better mobile.

import { useCallback, useEffect, useMemo, useState } from "react";

type VitalKind = "bp" | "weight" | "glucose" | "heart_rate" | "temperature" | "spo2" | "respiration";

interface Reading {
  id: string; userId: string; kind: VitalKind;
  value: number; value2?: number; unit: string;
  context?: string; note?: string; takenAt: string; createdAt: string;
  severity: "ok" | "warn" | "critical";
}

const KIND_LABEL: Record<VitalKind, string> = {
  bp: "Blood pressure", weight: "Weight", glucose: "Blood glucose",
  heart_rate: "Heart rate", temperature: "Temperature", spo2: "Oxygen", respiration: "Respiration",
};
const KIND_EMOJI: Record<VitalKind, string> = {
  bp: "🩺", weight: "⚖️", glucose: "🩸", heart_rate: "❤️", temperature: "🌡️", spo2: "🫁", respiration: "💨",
};
const KIND_UNIT: Record<VitalKind, string> = {
  bp: "mmHg", weight: "kg", glucose: "mg/dL", heart_rate: "bpm", temperature: "°C", spo2: "%", respiration: "br/min",
};
const TONE: Record<Reading["severity"], string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-rose-300 bg-rose-50 text-rose-800",
};
const DOT: Record<Reading["severity"], string> = {
  ok: "bg-emerald-500", warn: "bg-amber-500", critical: "bg-rose-600",
};

const KIND_ORDER: VitalKind[] = ["bp", "glucose", "heart_rate", "spo2", "temperature", "weight", "respiration"];

const KIND_GRADIENT: Record<VitalKind, string> = {
  bp: "from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 ring-rose-200 dark:ring-rose-900",
  glucose: "from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 ring-amber-200 dark:ring-amber-900",
  heart_rate: "from-red-50 to-pink-50 dark:from-red-950/30 dark:to-pink-950/30 ring-red-200 dark:ring-red-900",
  spo2: "from-sky-50 to-cyan-50 dark:from-sky-950/30 dark:to-cyan-950/30 ring-sky-200 dark:ring-sky-900",
  temperature: "from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 ring-orange-200 dark:ring-orange-900",
  weight: "from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 ring-indigo-200 dark:ring-indigo-900",
  respiration: "from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 ring-teal-200 dark:ring-teal-900",
};
const KIND_NUMERAL: Record<VitalKind, string> = {
  bp: "text-rose-700 dark:text-rose-300",
  glucose: "text-amber-700 dark:text-amber-300",
  heart_rate: "text-red-700 dark:text-red-300",
  spo2: "text-sky-700 dark:text-sky-300",
  temperature: "text-orange-700 dark:text-orange-300",
  weight: "text-indigo-700 dark:text-indigo-300",
  respiration: "text-teal-700 dark:text-teal-300",
};
const KIND_ACTIVE_RING: Record<VitalKind, string> = {
  bp: "ring-2 ring-rose-400 dark:ring-rose-500",
  glucose: "ring-2 ring-amber-400 dark:ring-amber-500",
  heart_rate: "ring-2 ring-red-400 dark:ring-red-500",
  spo2: "ring-2 ring-sky-400 dark:ring-sky-500",
  temperature: "ring-2 ring-orange-400 dark:ring-orange-500",
  weight: "ring-2 ring-indigo-400 dark:ring-indigo-500",
  respiration: "ring-2 ring-teal-400 dark:ring-teal-500",
};

function fmtVal(r: { kind: VitalKind; value: number; value2?: number }): string {
  if (r.kind === "bp") return `${r.value}/${r.value2 ?? "?"}`;
  if (r.kind === "weight") return r.value.toFixed(1);
  if (r.kind === "temperature") return r.value.toFixed(1);
  return String(r.value);
}
function timeAgo(iso: string): string {
  const m = (Date.now() - new Date(iso).getTime()) / 60000;
  if (m < 1) return "just now";
  if (m < 60) return `${Math.floor(m)}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

export default function VitalsPage() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [latest, setLatest] = useState<Partial<Record<VitalKind, Reading>>>({});
  const [activeKind, setActiveKind] = useState<VitalKind>("bp");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/vitals", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setReadings(d.readings || []);
        setLatest(d.latest || {});
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const trend = useMemo(() => {
    const list = readings.filter((r) => r.kind === activeKind);
    list.sort((a, b) => (a.takenAt < b.takenAt ? -1 : 1));
    return list;
  }, [readings, activeKind]);

  const removeReading = async (id: string) => {
    await fetch(`/api/vitals?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-3xl shadow-lg shadow-indigo-500/30">
              ❤️
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">My vitals</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Self-reported readings. Track trends between consults — your doctor sees the same chart.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition"
          >
            {showForm ? "Cancel" : "+ Log a reading"}
          </button>
        </div>

        {showForm && <LogForm onSaved={() => { setShowForm(false); load(); }} />}

        {/* At-a-glance cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {KIND_ORDER.map((k) => {
            const r = latest[k];
            const isActive = activeKind === k;
            return (
              <button
                key={k}
                onClick={() => setActiveKind(k)}
                className={`text-left rounded-2xl p-4 ring-1 shadow-sm hover:shadow-md transition-all bg-gradient-to-br ${KIND_GRADIENT[k]} ${isActive ? KIND_ACTIVE_RING[k] + " shadow-md" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">{KIND_LABEL[k]}</p>
                  <span className="text-2xl">{KIND_EMOJI[k]}</span>
                </div>
                {r ? (
                  <>
                    <p className={`mt-2 text-2xl font-extrabold tracking-tight ${KIND_NUMERAL[k]}`}>
                      {fmtVal(r)}
                      <span className="ml-1 text-xs font-medium text-slate-500 dark:text-slate-400">{KIND_UNIT[k]}</span>
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                      <span className={`h-1.5 w-1.5 rounded-full ${DOT[r.severity]}`} />
                      <span className="text-slate-500 dark:text-slate-400">{timeAgo(r.takenAt)}</span>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">No reading yet</p>
                )}
              </button>
            );
          })}
        </div>

      {/* Trend + table */}
      <section className="mt-8 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition ring-1 ring-slate-200 dark:ring-slate-800">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{KIND_LABEL[activeKind]} trend</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{trend.length} reading{trend.length === 1 ? "" : "s"}</p>
        </div>
        <Sparkline readings={trend} kind={activeKind} />
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : trend.length === 0 ? (
            <p className="rounded-lg bg-slate-50 dark:bg-slate-900 p-4 text-sm text-slate-500 dark:text-slate-400">
              No {KIND_LABEL[activeKind].toLowerCase()} readings yet. Log one above.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {[...trend].reverse().map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${TONE[r.severity]}`}>{r.severity}</span>
                      <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{fmtVal(r)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{r.unit}</span></p>
                      {r.context && <p className="text-[10px] uppercase tracking-wider text-slate-400">{r.context.replace(/_/g, " ")}</p>}
                    </div>
                    {r.note && <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{r.note}</p>}
                    <p className="text-[10px] text-slate-400">{new Date(r.takenAt).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => removeReading(r.id)}
                    aria-label="Delete reading"
                    className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}

function LogForm({ onSaved }: { onSaved: () => void }) {
  const [kind, setKind] = useState<VitalKind>("bp");
  const [value, setValue] = useState("");
  const [value2, setValue2] = useState("");
  const [context, setContext] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!value.trim()) { setError("Enter a value."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/vitals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          value: Number(value),
          value2: kind === "bp" ? Number(value2) : undefined,
          context: context || undefined,
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b.error || `Failed (${res.status})`);
        return;
      }
      setValue(""); setValue2(""); setContext(""); setNote("");
      onSaved();
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-6 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Log a reading</p>
      {error && <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Type
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as VitalKind)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-normal"
          >
            {KIND_ORDER.map((k) => (
              <option key={k} value={k}>{KIND_EMOJI[k]} {KIND_LABEL[k]}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Context (optional)
          <select
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-normal"
          >
            <option value="">—</option>
            <option value="fasting">Fasting</option>
            <option value="post_meal">Post-meal</option>
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
            <option value="before_med">Before medication</option>
            <option value="after_med">After medication</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {kind === "bp" ? "Systolic" : "Value"} ({KIND_UNIT[kind]})
          <input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={kind === "bp" ? "120" : kind === "glucose" ? "95" : kind === "weight" ? "68.5" : kind === "temperature" ? "36.7" : kind === "spo2" ? "98" : "72"}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-normal tabular-nums"
          />
        </label>
        {kind === "bp" && (
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Diastolic (mmHg)
            <input
              type="number"
              inputMode="decimal"
              value={value2}
              onChange={(e) => setValue2(e.target.value)}
              placeholder="80"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-normal tabular-nums"
            />
          </label>
        )}
        <label className="sm:col-span-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          Note (optional)
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="After a long walk, slightly nervous, etc."
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-normal"
          />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save reading"}
        </button>
      </div>
    </div>
  );
}

// Tiny inline SVG sparkline. Avoids pulling a charting lib for a
// dashboard preview — when this graduates to a real chart we can
// swap in recharts without changing the API.
function Sparkline({ readings, kind }: { readings: Reading[]; kind: VitalKind }) {
  if (readings.length < 2) {
    return (
      <div className="mt-3 flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
        Log at least 2 readings to see a trend.
      </div>
    );
  }
  const W = 600, H = 120, pad = 8;
  const xs = readings.map((_, i) => pad + (i * (W - pad * 2)) / (readings.length - 1));
  const ys = readings.map((r) => r.value);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const range = max - min || 1;
  const points = readings.map((r, i) => {
    const y = H - pad - ((r.value - min) / range) * (H - pad * 2);
    return `${xs[i]},${y}`;
  }).join(" ");

  // For BP also draw the diastolic line.
  let diastolicPath = "";
  if (kind === "bp" && readings.every((r) => typeof r.value2 === "number")) {
    const allYs = [...ys, ...readings.map((r) => r.value2 as number)];
    const dMin = Math.min(...allYs);
    const dMax = Math.max(...allYs);
    const dRange = dMax - dMin || 1;
    diastolicPath = readings.map((r, i) => {
      const y = H - pad - (((r.value2 as number) - dMin) / dRange) * (H - pad * 2);
      return `${xs[i]},${y}`;
    }).join(" ");
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-50/40 via-white to-emerald-50/40 p-3 ring-1 ring-slate-200 dark:ring-slate-800">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        <polyline fill="none" stroke="#4f46e5" strokeWidth="2.5" points={points} strokeLinejoin="round" strokeLinecap="round" />
        {diastolicPath && (
          <polyline fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4 3" points={diastolicPath} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {readings.map((r, i) => (
          <circle key={r.id} cx={xs[i]} cy={H - pad - ((r.value - min) / range) * (H - pad * 2)} r="3" fill="#4f46e5" />
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <span>{new Date(readings[0].takenAt).toLocaleDateString()}</span>
        <span>min {min} · max {max}</span>
        <span>{new Date(readings[readings.length - 1].takenAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
