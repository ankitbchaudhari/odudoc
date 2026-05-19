"use client";

// Ambulance dispatch console.
//
// Dispatcher enters pickup coords + severity → preview recommended
// vehicle (class, distance, ETA) → confirm to create the job. The
// store does class-aware nearest-vehicle ranking on Haversine.

import { useState } from "react";

interface Recommendation {
  vehicleId: string;
  reg: string;
  class: "BLS" | "ALS" | "ICU" | "MORTUARY";
  distanceKm: number;
  etaMin: number;
}

interface Job {
  id: string;
  callerName: string;
  callerPhone: string;
  severity: "stable" | "urgent" | "critical";
  status: string;
  vehicleId?: string;
  pickupAddress?: string;
  createdAt: string;
}

export default function AmbulanceDispatchPage() {
  const [form, setForm] = useState({
    callerName: "",
    callerPhone: "",
    pickupLat: "",
    pickupLng: "",
    pickupAddress: "",
    severity: "urgent" as "stable" | "urgent" | "critical",
    notes: "",
  });
  const [preview, setPreview] = useState<Recommendation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastJob, setLastJob] = useState<Job | null>(null);

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError("Browser doesn't support geolocation"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({ ...f, pickupLat: String(pos.coords.latitude), pickupLng: String(pos.coords.longitude) })),
      () => setError("Couldn't read your location"),
    );
  };

  const run = async (mode: "preview" | "dispatch") => {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/ambulance/dispatch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          callerName: form.callerName,
          callerPhone: form.callerPhone,
          pickupLat: Number(form.pickupLat),
          pickupLng: Number(form.pickupLng),
          pickupAddress: form.pickupAddress || undefined,
          severity: form.severity,
          notes: form.notes || undefined,
          mode,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Failed"); return; }
      if (mode === "preview") {
        setPreview(j.recommendation);
        setLastJob(null);
      } else {
        setLastJob(j.job);
        setPreview(null);
      }
    } finally { setBusy(false); }
  };

  return (
    <main className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600">Emergency · Dispatch</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Ambulance dispatch</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Nearest available vehicle, class-aware: critical → ICU / ALS, urgent → ALS / BLS, stable → BLS / ALS.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Call details</p>
          <div className="space-y-3">
            <Input label="Caller name" value={form.callerName} onChange={(v) => setForm({ ...form, callerName: v })} />
            <Input label="Phone" value={form.callerPhone} onChange={(v) => setForm({ ...form, callerPhone: v })} placeholder="+91…" />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Pickup latitude" value={form.pickupLat} onChange={(v) => setForm({ ...form, pickupLat: v })} />
              <Input label="Pickup longitude" value={form.pickupLng} onChange={(v) => setForm({ ...form, pickupLng: v })} />
            </div>
            <button type="button" onClick={useMyLocation} className="text-xs font-semibold text-rose-600 hover:underline">
              📍 Use my current location
            </button>
            <Input label="Pickup address" value={form.pickupAddress} onChange={(v) => setForm({ ...form, pickupAddress: v })} />
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Severity</span>
              <div className="flex gap-2">
                {(["stable", "urgent", "critical"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, severity: s })}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase ${
                      form.severity === s
                        ? s === "critical" ? "bg-rose-600 text-white" : s === "urgent" ? "bg-orange-500 text-white" : "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Notes</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
            {error && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => run("preview")}
                disabled={busy || !form.callerName || !form.pickupLat}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                Preview vehicle
              </button>
              <button
                onClick={() => run("dispatch")}
                disabled={busy || !form.callerName || !form.pickupLat || !form.callerPhone}
                className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-2 text-sm font-bold text-white shadow disabled:opacity-60"
              >
                {busy ? "Working…" : "Dispatch now"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Result</p>
          {!preview && !lastJob && (
            <p className="text-sm text-slate-500">Fill the form and tap <strong>Preview</strong> or <strong>Dispatch</strong>.</p>
          )}
          {preview && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-700 dark:bg-emerald-950/30">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Recommended unit</p>
              <p className="mt-2 text-2xl font-extrabold text-emerald-900 dark:text-emerald-100">{preview.reg}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <Stat label="Class" value={preview.class} />
                <Stat label="Distance" value={`${preview.distanceKm.toFixed(2)} km`} />
                <Stat label="ETA" value={`~${preview.etaMin} min`} />
              </div>
              <p className="mt-3 text-xs text-emerald-800 dark:text-emerald-200">
                This is the closest available unit that satisfies the severity class. Tap <strong>Dispatch</strong> to assign it.
              </p>
            </div>
          )}
          {lastJob && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-700 dark:bg-rose-950/30">
              <p className="text-2xl">🚑</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Dispatched</p>
              <p className="mt-2 text-base font-bold text-rose-900 dark:text-rose-100">Job #{lastJob.id}</p>
              <p className="mt-1 text-xs text-rose-800 dark:text-rose-200">
                Vehicle assigned · status: {lastJob.status}
              </p>
              <p className="mt-2 text-[11px] text-rose-700 dark:text-rose-300">
                Caller: {lastJob.callerName} ({lastJob.callerPhone})
                {lastJob.pickupAddress && <> · {lastJob.pickupAddress}</>}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-2 text-center dark:bg-slate-900">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
