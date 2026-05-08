"use client";

// Biomedical equipment registry + maintenance log.

import { useCallback, useEffect, useState } from "react";
import DepartmentShell, { StatTile } from "@/components/DepartmentShell";

interface Equipment {
  id: string;
  assetTag: string;
  name: string;
  manufacturer?: string;
  model?: string;
  location?: string;
  category?: string;
  amcVendor?: string;
  amcEnd?: string;
  nextMaintenanceDate?: string;
  nextCalibrationDate?: string;
  status: "active" | "under_maintenance" | "out_of_service" | "retired";
}

interface Summary {
  total: number;
  active: number;
  underMaintenance: number;
  outOfService: number;
  maintenanceDueSoon: number;
  calibrationDueSoon: number;
}

export default function EquipmentPage() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    assetTag: "", name: "", manufacturer: "", model: "", location: "",
    category: "", nextMaintenanceDate: "", amcVendor: "", amcEnd: "",
  });
  const [logFor, setLogFor] = useState<string | null>(null);
  const [logForm, setLogForm] = useState({
    kind: "preventive" as "preventive" | "corrective" | "calibration" | "inspection",
    performedBy: "",
    cost: "",
    notes: "",
    nextDueAt: "",
  });

  const load = useCallback(async () => {
    const r = await fetch("/api/emr/equipment", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setItems(d.items || []);
      setSummary(d.summary || null);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    await fetch("/api/emr/equipment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ ...form, assetTag: "", name: "", model: "", location: "" });
    setShowNew(false);
    await load(); setBusy(false);
  };

  const submitLog = async (e: React.FormEvent) => {
    e.preventDefault(); if (!logFor) return; setBusy(true);
    await fetch(`/api/emr/equipment/${logFor}/maintenance`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...logForm,
        cost: logForm.cost ? Number(logForm.cost) : undefined,
      }),
    });
    setLogFor(null);
    setLogForm({ kind: "preventive", performedBy: "", cost: "", notes: "", nextDueAt: "" });
    await load(); setBusy(false);
  };

  return (
    <DepartmentShell
      eyebrow="Hospital · Biomedical · Equipment"
      glyph="🧰"
      title="Equipment registry"
      subtitle="Asset tags, AMC contracts, preventive maintenance, calibration log."
      gradient="from-amber-600 via-orange-600 to-rose-600"
      actions={<button onClick={() => setShowNew((v) => !v)} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-orange-700 shadow-md hover:-translate-y-0.5">+ Add equipment</button>}
    >
      {summary && (
        <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatTile label="Active" value={summary.active} emoji="🧰" tone="emerald" />
          <StatTile label="Under maintenance" value={summary.underMaintenance} emoji="🔧" tone="amber" />
          <StatTile label="Maintenance due" value={summary.maintenanceDueSoon} emoji="⏱️" tone="rose" hint="< 14 days" />
          <StatTile label="Calibration due" value={summary.calibrationDueSoon} emoji="📐" tone="cyan" hint="< 14 days" />
        </div>
      )}

      {showNew && (
        <form onSubmit={submit} className="mb-6 rounded-3xl border border-white/60 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Add equipment</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Inp label="Asset tag" required value={form.assetTag} onChange={(v) => setForm({ ...form, assetTag: v })} placeholder="EQ-001" />
            <Inp label="Name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Patient monitor" />
            <Inp label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="Monitor / Ventilator / Pump" />
            <Inp label="Manufacturer" value={form.manufacturer} onChange={(v) => setForm({ ...form, manufacturer: v })} />
            <Inp label="Model" value={form.model} onChange={(v) => setForm({ ...form, model: v })} />
            <Inp label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} placeholder="ICU bed 4" />
            <Inp label="AMC vendor" value={form.amcVendor} onChange={(v) => setForm({ ...form, amcVendor: v })} />
            <Inp label="AMC end" type="date" value={form.amcEnd} onChange={(v) => setForm({ ...form, amcEnd: v })} />
            <Inp label="Next maintenance" type="date" value={form.nextMaintenanceDate} onChange={(v) => setForm({ ...form, nextMaintenanceDate: v })} />
          </div>
          <button type="submit" disabled={busy} className="mt-4 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:-translate-y-0.5 disabled:opacity-50">
            {busy ? "Saving…" : "Add equipment"}
          </button>
        </form>
      )}

      {logFor && (
        <form onSubmit={submitLog} className="mb-6 rounded-3xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Log maintenance for {logFor}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Sel label="Kind" value={logForm.kind} onChange={(v) => setLogForm({ ...logForm, kind: v as typeof logForm.kind })}>
              <option value="preventive">Preventive</option>
              <option value="corrective">Corrective</option>
              <option value="calibration">Calibration</option>
              <option value="inspection">Inspection</option>
            </Sel>
            <Inp label="Performed by" value={logForm.performedBy} onChange={(v) => setLogForm({ ...logForm, performedBy: v })} />
            <Inp label="Cost" type="number" value={logForm.cost} onChange={(v) => setLogForm({ ...logForm, cost: v })} />
            <Inp label="Next due" type="date" value={logForm.nextDueAt} onChange={(v) => setLogForm({ ...logForm, nextDueAt: v })} />
            <div className="sm:col-span-2"><Inp label="Notes" value={logForm.notes} onChange={(v) => setLogForm({ ...logForm, notes: v })} /></div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={busy} className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:-translate-y-0.5 disabled:opacity-50">{busy ? "Logging…" : "Log entry"}</button>
            <button type="button" onClick={() => setLogFor(null)} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
          </div>
        </form>
      )}

      <section className="rounded-3xl border border-white/60 bg-white p-2 shadow-sm">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
            <span className="text-4xl">🧰</span>
            <p className="mt-3 text-sm font-semibold text-slate-900">No equipment yet</p>
            <p className="mt-1 text-xs text-slate-500">Add your first device above.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-wider text-slate-500">
              <tr className="border-b border-slate-100">
                <th className="px-3 py-2">Equipment</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Next maintenance</th>
                <th className="px-3 py-2">AMC ends</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((eq) => (
                <tr key={eq.id} className="border-b border-slate-50">
                  <td className="px-3 py-2">
                    <p className="font-semibold text-slate-900">{eq.name}</p>
                    <p className="text-[11px] text-slate-500">{eq.assetTag}{eq.manufacturer ? ` · ${eq.manufacturer}` : ""}{eq.model ? ` ${eq.model}` : ""}</p>
                  </td>
                  <td className="px-3 py-2 text-xs">{eq.location || "—"}</td>
                  <td className="px-3 py-2 text-xs">{eq.status.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2 text-xs">{eq.nextMaintenanceDate || "—"}</td>
                  <td className="px-3 py-2 text-xs">{eq.amcEnd || "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setLogFor(eq.id)} className="rounded-md bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:-translate-y-0.5">Log maintenance</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </DepartmentShell>
  );
}

function Inp(p: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">{p.label}{p.required && <span className="ml-0.5 text-rose-500">*</span>}</span>
      <input type={p.type || "text"} required={p.required} value={p.value} onChange={(e) => p.onChange(e.target.value)} placeholder={p.placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
    </label>
  );
}
function Sel(p: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">{p.label}</span>
      <select value={p.value} onChange={(e) => p.onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">{p.children}</select>
    </label>
  );
}
