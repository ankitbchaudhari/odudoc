"use client";

// Combined fleet + device registration admin.
// Three tabs: bell devices, ambulance vehicles, IV orders. Each
// posts to its own API and refreshes the local list.

import { useCallback, useEffect, useState } from "react";

type Tab = "bells" | "ambulance" | "iv-orders";

export default function FleetDevicesPage() {
  const [tab, setTab] = useState<Tab>("bells");

  return (
    <main className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Hospital operations</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Fleet &amp; devices</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Register bell devices, ambulance vehicles, and IV-order schedules. Each pushes data into the
          downstream consoles (/admin/bells, /admin/ambulance-dispatch, /admin/iv-mar).
        </p>
      </header>

      <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
        {(["bells", "ambulance", "iv-orders"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl px-3 py-1.5 text-sm font-bold ${
              tab === t
                ? "bg-white shadow text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            {t === "bells" ? "🔔 Bell devices" : t === "ambulance" ? "🚑 Ambulances" : "💉 IV orders"}
          </button>
        ))}
      </div>

      {tab === "bells" && <BellsPanel />}
      {tab === "ambulance" && <AmbulancePanel />}
      {tab === "iv-orders" && <IvOrdersPanel />}
    </main>
  );
}

// ── Bells ─────────────────────────────────────────────────────────
interface BellDevice {
  id: string;
  kind: "opd_phone" | "ipd_zigbee" | "ot_console";
  label: string;
  identifier: string;
  pairedAt: string;
  active: boolean;
}

function BellsPanel() {
  const [devices, setDevices] = useState<BellDevice[]>([]);
  const [form, setForm] = useState({ kind: "ipd_zigbee" as BellDevice["kind"], label: "", identifier: "" });
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/bells/devices", { cache: "no-store" });
    const j = await r.json();
    setDevices(j.devices || []);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const submit = async () => {
    setBusy(true);
    try {
      await fetch("/api/bells/devices", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm({ ...form, label: "", identifier: "" });
      refresh();
    } finally { setBusy(false); }
  };

  return (
    <Panel title="Bell devices" body="OPD phone-as-bell · IPD Sonoff Zigbee · OT consoles">
      <div className="grid gap-2 sm:grid-cols-3">
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as BellDevice["kind"] })}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="opd_phone">OPD phone</option>
          <option value="ipd_zigbee">IPD Zigbee</option>
          <option value="ot_console">OT console</option>
        </select>
        <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Label (e.g. Bed 12A)"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} placeholder="Identifier (MAC / phone)"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
      </div>
      <button onClick={submit} disabled={busy || !form.label || !form.identifier}
        className="mt-3 w-full rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
        Pair device
      </button>
      <ItemList>
        {devices.map((d) => (
          <li key={d.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800">
            <span><strong>{d.label}</strong> · {d.kind.replace(/_/g, " ")} · <code>{d.identifier}</code></span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${d.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
              {d.active ? "Active" : "Disabled"}
            </span>
          </li>
        ))}
      </ItemList>
    </Panel>
  );
}

// ── Ambulance ─────────────────────────────────────────────────────
interface Vehicle {
  id: string;
  reg: string;
  class: "BLS" | "ALS" | "ICU" | "MORTUARY";
  crew: string[];
  lat: number;
  lng: number;
  status: string;
  lastPingAt: string;
}

function AmbulancePanel() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState({
    reg: "", class: "BLS" as Vehicle["class"], crew: "", lat: "", lng: "",
  });
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/ambulance/vehicles", { cache: "no-store" });
    const j = await r.json();
    setVehicles(j.vehicles || []);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const submit = async () => {
    setBusy(true);
    try {
      await fetch("/api/ambulance/vehicles", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reg: form.reg,
          class: form.class,
          crew: form.crew.split(",").map((s) => s.trim()).filter(Boolean),
          lat: Number(form.lat),
          lng: Number(form.lng),
        }),
      });
      setForm({ ...form, reg: "", crew: "" });
      refresh();
    } finally { setBusy(false); }
  };

  return (
    <Panel title="Ambulance vehicles" body="BLS · ALS · ICU · Mortuary. GPS coords drive nearest-vehicle dispatch.">
      <div className="grid gap-2 sm:grid-cols-5">
        <input value={form.reg} onChange={(e) => setForm({ ...form, reg: e.target.value })} placeholder="Reg / plate"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <select value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value as Vehicle["class"] })}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="BLS">BLS</option>
          <option value="ALS">ALS</option>
          <option value="ICU">ICU</option>
          <option value="MORTUARY">Mortuary</option>
        </select>
        <input value={form.crew} onChange={(e) => setForm({ ...form, crew: e.target.value })} placeholder="Crew (comma-sep)"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <input value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} placeholder="Lat"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <input value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} placeholder="Lng"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
      </div>
      <button onClick={submit} disabled={busy || !form.reg || !form.lat || !form.lng}
        className="mt-3 w-full rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
        Add vehicle
      </button>
      <ItemList>
        {vehicles.map((v) => (
          <li key={v.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800">
            <strong>{v.reg}</strong> · {v.class} · {v.status} · ({v.lat.toFixed(3)}, {v.lng.toFixed(3)})
            <p className="text-[10px] text-slate-500">Crew: {v.crew.join(", ") || "—"} · Last ping {new Date(v.lastPingAt).toLocaleTimeString()}</p>
          </li>
        ))}
      </ItemList>
    </Panel>
  );
}

// ── IV orders ────────────────────────────────────────────────────
function IvOrdersPanel() {
  const [form, setForm] = useState({
    patientEmail: "",
    patientName: "",
    patientBedId: "",
    drug: "",
    dose: "",
    diluent: "100 mL NS",
    rate: "",
    frequency: "q8h",
    intervalHours: 8,
    durationHours: 72,
    startsAt: "",
    scheduleClass: "H" as "OTC" | "H" | "H1" | "X" | "G" | "K",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // POST to a new endpoint we add inline — there isn't a dedicated
  // POST /api/iv-mar/orders yet, so we re-purpose the iv-mar API's
  // POST which records a dose. Build a tiny helper that creates the
  // order via a placeholder endpoint /api/iv-mar/orders.
  const submit = async () => {
    setBusy(true); setError(null); setDone(null);
    try {
      const r = await fetch("/api/iv-mar/orders", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Failed"); return; }
      setDone(j.order?.id || "ok");
      setForm({ ...form, patientEmail: "", patientName: "", patientBedId: "", drug: "", dose: "" });
    } finally { setBusy(false); }
  };

  return (
    <Panel title="IV order" body="Creates a scheduled IV order; the MAR auto-generates the next 24h of due rows.">
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={form.patientEmail} onChange={(e) => setForm({ ...form, patientEmail: e.target.value })} placeholder="Patient email"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} placeholder="Patient name"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <input value={form.patientBedId} onChange={(e) => setForm({ ...form, patientBedId: e.target.value })} placeholder="Bed (optional)"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <input value={form.drug} onChange={(e) => setForm({ ...form, drug: e.target.value })} placeholder="Drug (e.g. ceftriaxone)"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder="Dose (e.g. 1 g)"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <input value={form.diluent} onChange={(e) => setForm({ ...form, diluent: e.target.value })} placeholder="Diluent"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <input value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="Rate (e.g. over 30 min)"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} placeholder="Frequency text"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <input type="number" value={form.intervalHours} onChange={(e) => setForm({ ...form, intervalHours: Number(e.target.value) })} placeholder="Interval (hours)"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <input type="number" value={form.durationHours} onChange={(e) => setForm({ ...form, durationHours: Number(e.target.value) })} placeholder="Duration (hours)"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <select value={form.scheduleClass} onChange={(e) => setForm({ ...form, scheduleClass: e.target.value as typeof form.scheduleClass })}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="OTC">OTC</option>
          <option value="H">H</option>
          <option value="H1">H1</option>
          <option value="X">X (NDPS — requires witness)</option>
          <option value="G">G (cold chain)</option>
          <option value="K">K (AYUSH)</option>
        </select>
      </div>
      {error && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
      {done && <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">Order created · {done}</p>}
      <button onClick={submit} disabled={busy || !form.patientEmail || !form.drug || !form.dose || !form.startsAt}
        className="mt-3 w-full rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
        Create IV order
      </button>
    </Panel>
  );
}

// ── Layout helpers ────────────────────────────────────────────────
function Panel({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      <p className="mt-0.5 mb-3 text-xs text-slate-600 dark:text-slate-300">{body}</p>
      {children}
    </section>
  );
}
function ItemList({ children }: { children: React.ReactNode }) {
  return <ul className="mt-4 space-y-1">{children}</ul>;
}
