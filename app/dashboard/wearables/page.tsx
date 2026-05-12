"use client";

// Wearable hub. Three sections:
//   1. Linked devices (link new, unlink existing, demo seed)
//   2. KPI tiles + 30-day trend charts (BP / HR / Glucose / steps / sleep)
//   3. Anomaly panel + the clinical-summary string ready to share

import { useCallback, useEffect, useState } from "react";

type WearableProvider = "fitbit" | "apple_health" | "google_fit" | "samsung_health" | "garmin" | "mi_fit" | "oura" | "whoop" | "manual";

interface Device {
  id: string; provider: WearableProvider; displayName: string;
  externalId?: string; linkedAt: string; lastSyncAt?: string; status: string;
}

interface KpiTile {
  kind: string; label: string; value: number; unit: string;
  trendPct?: number; status: "good" | "warn" | "critical" | "neutral"; note?: string;
}
interface DailyBucket { date: string; values: number[]; count: number; avg: number; min: number; max: number }
interface AnomalyFlag { label: string; severity: "info" | "warn" | "critical"; occurredAt: string; detail: string; recommendation: string }
interface InsightsBundle {
  windowDays: number;
  kpis: KpiTile[];
  daily: Record<string, DailyBucket[] | undefined>;
  anomalies: AnomalyFlag[];
  clinicalSummary: string;
}

const PROVIDER_EMOJI: Record<WearableProvider, string> = {
  fitbit: "🏃", apple_health: "🍎", google_fit: "🟢",
  samsung_health: "📱", garmin: "🧭", mi_fit: "⌚",
  oura: "💍", whoop: "🟣", manual: "✍️",
};
const PROVIDER_LABEL: Record<WearableProvider, string> = {
  fitbit: "Fitbit", apple_health: "Apple Health", google_fit: "Google Fit",
  samsung_health: "Samsung Health", garmin: "Garmin", mi_fit: "Mi Fit",
  oura: "Oura", whoop: "Whoop", manual: "Manual upload",
};

const TILE_TONE: Record<KpiTile["status"], string> = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-rose-300 bg-rose-50 text-rose-900",
  neutral: "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100",
};
const SEV_TONE: Record<AnomalyFlag["severity"], string> = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-rose-300 bg-rose-50 text-rose-900",
};

const CHART_KINDS: Array<{ kind: string; label: string; unit: string; tone: string }> = [
  { kind: "hr_resting", label: "Resting HR", unit: "bpm", tone: "#0ea5e9" },
  { kind: "bp_systolic", label: "BP Systolic", unit: "mmHg", tone: "#e11d48" },
  { kind: "blood_glucose", label: "Glucose", unit: "mg/dL", tone: "#7c3aed" },
  { kind: "steps", label: "Daily steps", unit: "steps", tone: "#10b981" },
  { kind: "sleep_minutes", label: "Sleep (h)", unit: "h", tone: "#f59e0b" },
  { kind: "spo2", label: "SpO₂", unit: "%", tone: "#06b6d4" },
];

export default function WearablesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [insights, setInsights] = useState<InsightsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLink, setShowLink] = useState(false);
  const [linkForm, setLinkForm] = useState<{ provider: WearableProvider; displayName: string }>({ provider: "fitbit", displayName: "" });
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/wearables/devices", { cache: "no-store" }),
        fetch("/api/wearables/insights?windowDays=30", { cache: "no-store" }),
      ]);
      if (r1.ok) setDevices((await r1.json()).devices || []);
      if (r2.ok) setInsights(await r2.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const link = async () => {
    if (!linkForm.displayName.trim()) return;
    const r = await fetch("/api/wearables/devices", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(linkForm),
    });
    if (r.ok) {
      setToast({ kind: "ok", text: "Device linked." });
      setShowLink(false);
      setLinkForm({ provider: "fitbit", displayName: "" });
      await load();
    }
  };

  const unlink = async (id: string) => {
    if (!confirm("Unlink this device? Historical readings stay; future ones won't sync.")) return;
    const r = await fetch(`/api/wearables/devices?id=${id}`, { method: "DELETE" });
    if (r.ok) { setToast({ kind: "ok", text: "Unlinked." }); await load(); }
  };

  const seed = async (persona: string) => {
    const r = await fetch("/api/wearables/seed", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona }),
    });
    if (r.ok) {
      const d = await r.json();
      setToast({ kind: "ok", text: `Seeded ${d.inserted} ${persona.replace("_", " ")} readings.` });
      await load();
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {toast && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${toast.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Wearable health</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Connect your Fitbit, Apple Watch, Mi Band, or any wearable to share heart rate, BP, sleep, and glucose trends with your doctor at the next visit.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowLink(true)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-bold text-white">+ Link device</button>
        </div>
      </div>

      {/* Demo seed strip */}
      {devices.length === 0 && (
        <div className="mb-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 dark:bg-slate-900 p-4 text-sm">
          <p className="text-slate-700 dark:text-slate-300"><strong>Try a demo persona:</strong></p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => seed("diabetic_hypertensive")} className="rounded-md bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 ring-1 ring-slate-300 hover:bg-slate-100 dark:bg-slate-800">🩸 Diabetic + hypertensive (60yo)</button>
            <button onClick={() => seed("athlete")} className="rounded-md bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 ring-1 ring-slate-300 hover:bg-slate-100 dark:bg-slate-800">🏃 Athlete (28yo)</button>
            <button onClick={() => seed("post_op")} className="rounded-md bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 ring-1 ring-slate-300 hover:bg-slate-100 dark:bg-slate-800">🩺 Post-op recovery</button>
          </div>
        </div>
      )}

      {/* ── Devices ─────────────────────────────────── */}
      <section className="mb-6 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm">
        <p className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">Linked devices ({devices.length})</p>
        {devices.length === 0 ? (
          <p className="rounded-lg bg-slate-50 dark:bg-slate-900 p-4 text-sm text-slate-500 dark:text-slate-400">No devices linked yet. Use the seed buttons above for a demo, or link your own with the button at the top.</p>
        ) : (
          <ul className="space-y-2">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{PROVIDER_EMOJI[d.provider]}</span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{d.displayName}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {PROVIDER_LABEL[d.provider]} · linked {new Date(d.linkedAt).toLocaleDateString()}
                      {d.lastSyncAt ? ` · synced ${new Date(d.lastSyncAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                </div>
                <button onClick={() => unlink(d.id)} className="rounded-md border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-600">Unlink</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── KPIs + charts + anomalies ────────────────────────────── */}
      {insights && insights.kpis.length > 0 && (
        <>
          <section className="mb-6 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm">
            <p className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">Last {insights.windowDays} days</p>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {insights.kpis.map((k) => (
                <div key={k.kind} className={`rounded-xl border p-3 ${TILE_TONE[k.status]}`}>
                  <p className="text-[10px] uppercase tracking-wider opacity-70">{k.label}</p>
                  <p className="mt-1 text-2xl font-extrabold">
                    {k.value}{k.unit && <span className="ml-1 text-sm font-semibold opacity-60">{k.unit}</span>}
                  </p>
                  {k.trendPct !== undefined && (
                    <p className="text-[10px] opacity-70">
                      {k.trendPct >= 0 ? "↑" : "↓"} {Math.abs(k.trendPct)}% vs prior {insights.windowDays}d
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="mb-6 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm">
            <p className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">30-day trends</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CHART_KINDS.filter((c) => insights.daily[c.kind] && (insights.daily[c.kind] as DailyBucket[]).length > 0).map((c) => (
                <SparkChart key={c.kind} label={c.label} unit={c.unit} tone={c.tone} buckets={insights.daily[c.kind]!} />
              ))}
            </div>
          </section>
        </>
      )}

      {insights && insights.anomalies.length > 0 && (
        <section className="mb-6 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">Anomalies detected ({insights.anomalies.length})</p>
          <ul className="space-y-2">
            {insights.anomalies.map((a, i) => (
              <li key={i} className={`rounded-xl border-l-4 p-3 text-sm ${SEV_TONE[a.severity]}`}>
                <p className="font-bold">{a.severity === "critical" ? "🚨 " : a.severity === "warn" ? "⚠ " : "ℹ "}{a.label}</p>
                <p className="mt-0.5 text-[11px] opacity-70">{new Date(a.occurredAt).toLocaleString()}</p>
                <p className="mt-1 text-xs">{a.detail}</p>
                <p className="mt-1 text-xs"><strong>Action:</strong> {a.recommendation}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {insights && (
        <section className="mb-6 rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Clinical summary — share with your doctor</p>
          <p className="mt-2 text-sm text-slate-800 dark:text-slate-200">{insights.clinicalSummary}</p>
          <button onClick={() => navigator.clipboard?.writeText(insights.clinicalSummary)} className="mt-3 rounded-md border border-indigo-300 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-semibold text-indigo-700">Copy summary</button>
        </section>
      )}

      {loading && <p className="text-center text-sm text-slate-400">Loading…</p>}

      {/* Link device dialog */}
      {showLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowLink(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Link a wearable</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">In production this opens your device&apos;s OAuth flow. For the demo, name a device and we&apos;ll start tracking.</p>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Provider</label>
                <select value={linkForm.provider} onChange={(e) => setLinkForm({ ...linkForm, provider: e.target.value as WearableProvider })} className="w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
                  {Object.entries(PROVIDER_LABEL).map(([k, v]) => <option key={k} value={k}>{PROVIDER_EMOJI[k as WearableProvider]} {v}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</label>
                <input className="w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm" placeholder='e.g. "My Mi Band 7"' value={linkForm.displayName} onChange={(e) => setLinkForm({ ...linkForm, displayName: e.target.value })} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowLink(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Cancel</button>
              <button onClick={link} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Link</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SparkChart({ label, unit, tone, buckets }: { label: string; unit: string; tone: string; buckets: DailyBucket[] }) {
  if (buckets.length === 0) return null;
  // Special-case sleep_minutes → hours for the y-axis label.
  const transform = unit === "h" ? (n: number) => n / 60 : (n: number) => n;
  const values = buckets.map((b) => transform(b.avg));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 240;
  const h = 60;
  const step = w / Math.max(1, buckets.length - 1);
  const path = values.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`).join(" ");
  const last = values[values.length - 1];
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
        <p className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">{Math.round(last * 10) / 10}{unit}</p>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full">
        <path d={path} fill="none" stroke={tone} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="flex justify-between text-[9px] text-slate-400">
        <span>{Math.round(min * 10) / 10}</span>
        <span>{buckets.length}d</span>
        <span>{Math.round(max * 10) / 10}</span>
      </div>
    </div>
  );
}
