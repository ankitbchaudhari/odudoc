"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  GasAsset, GasLog, GasType, AssetType, AssetStatus, LogKind, AlarmSeverity,
} from "@/lib/hospital/medical-gas-store";
// Inlined from medical-gas-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const GAS_TYPE_LABEL: Record<GasType, string> = {
  o2: "Oxygen (O₂)", n2o: "Nitrous oxide (N₂O)", medical_air: "Medical air",
  vacuum: "Vacuum", co2: "CO₂", n2: "Nitrogen", helium_o2: "Heliox", entonox: "Entonox",
};
const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  cylinder: "Cylinder", manifold: "Manifold", liquid_tank: "Liquid tank (LMO)",
  pipeline_zone: "Pipeline zone", concentrator: "Concentrator",
  compressor: "Compressor", vacuum_pump: "Vacuum pump",
};
const STATUS_LABEL: Record<AssetStatus, string> = {
  in_service: "In service", empty: "Empty", refilling: "Refilling",
  maintenance: "Maintenance", alarm: "Alarm", out_of_service: "Out of service", condemned: "Condemned",
};
const LOG_KIND_LABEL: Record<LogKind, string> = {
  pressure_check: "Pressure check", level_check: "Level check",
  refill: "Refill", swap: "Swap", alarm: "Alarm",
  maintenance: "Maintenance", test: "Test", purity_check: "Purity check",
};
const SEVERITY_LABEL: Record<AlarmSeverity, string> = {
  info: "Info", low: "Low", high: "High", critical: "Critical",
};

const GAS_TYPES: GasType[] = ["o2", "n2o", "medical_air", "vacuum", "co2", "n2", "helium_o2", "entonox"];
const ASSET_TYPES: AssetType[] = ["cylinder", "manifold", "liquid_tank", "pipeline_zone", "concentrator", "compressor", "vacuum_pump"];
const STATUSES: AssetStatus[] = ["in_service", "empty", "refilling", "maintenance", "alarm", "out_of_service", "condemned"];
const LOG_KINDS: LogKind[] = ["pressure_check", "level_check", "refill", "swap", "alarm", "maintenance", "test", "purity_check"];
const SEVERITIES: AlarmSeverity[] = ["info", "low", "high", "critical"];
const UNITS = ["L", "m3", "kg", "bar", "psi", "percent"] as const;

export default function MedicalGasPage() {
  const [tab, setTab] = useState<"assets" | "logs">("assets");
  const [assets, setAssets] = useState<GasAsset[]>([]);
  const [logs, setLogs] = useState<GasLog[]>([]);
  const [stats, setStats] = useState<{ totalAssets: number; inService: number; empty: number; alarmActive: number; refillsDueSoon: number; maintenanceDueSoon: number; contractExpiringSoon: number; criticalAlarms30d: number; refillsMonth: number } | null>(null);
  const [showA, setShowA] = useState(false);
  const [showL, setShowL] = useState(false);
  const [editA, setEditA] = useState<GasAsset | null>(null);
  const [editL, setEditL] = useState<GasLog | null>(null);
  const [fGas, setFGas] = useState<GasType | "">("");
  const [fStatus, setFStatus] = useState<AssetStatus | "">("");

  async function load() {
    const res = await fetch("/api/hospital/medical-gas", { cache: "no-store" });
    const data = await res.json();
    setAssets(data.assets || []);
    setLogs(data.logs || []);
    setStats(data.stats || null);
  }
  useEffect(() => { load(); }, []);

  async function del(id: string, recordKind?: string) {
    if (!confirm("Delete?")) return;
    await fetch("/api/hospital/medical-gas", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, recordKind }) });
    load();
  }

  const filteredAssets = useMemo(
    () => assets.filter((a) => (fGas ? a.gasType === fGas : true)).filter((a) => (fStatus ? a.status === fStatus : true)),
    [assets, fGas, fStatus],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Medical Gas Management</h1>
          <p className="text-sm text-slate-500">O₂ · N₂O · Medical air · Vacuum · Pipelines & cylinders</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditA(null); setShowA(true); }} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">+ Asset</button>
          <button onClick={() => { setEditL(null); setShowL(true); }} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Log</button>
        </div>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5 lg:grid-cols-9">
          <StatTile label="Total assets" value={stats.totalAssets} tone="slate" />
          <StatTile label="In service" value={stats.inService} tone="emerald" />
          <StatTile label="Empty" value={stats.empty} tone="amber" />
          <StatTile label="Alarm active" value={stats.alarmActive} tone="rose" />
          <StatTile label="Refill ≤7d" value={stats.refillsDueSoon} tone="amber" />
          <StatTile label="PM ≤7d" value={stats.maintenanceDueSoon} tone="amber" />
          <StatTile label="Contract ≤7d" value={stats.contractExpiringSoon} tone="amber" />
          <StatTile label="Critical alarms 30d" value={stats.criticalAlarms30d} tone="rose" />
          <StatTile label="Refills (month)" value={stats.refillsMonth} tone="slate" />
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <TabBtn active={tab === "assets"} onClick={() => setTab("assets")}>Assets ({assets.length})</TabBtn>
        <TabBtn active={tab === "logs"} onClick={() => setTab("logs")}>Logs ({logs.length})</TabBtn>
      </div>

      {tab === "assets" && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <FilterPill active={fGas === ""} onClick={() => setFGas("")}>All gas</FilterPill>
            {GAS_TYPES.map((g) => <FilterPill key={g} active={fGas === g} onClick={() => setFGas(g)}>{GAS_TYPE_LABEL[g]}</FilterPill>)}
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <FilterPill active={fStatus === ""} onClick={() => setFStatus("")}>All status</FilterPill>
            {STATUSES.map((s) => <FilterPill key={s} active={fStatus === s} onClick={() => setFStatus(s)}>{STATUS_LABEL[s]}</FilterPill>)}
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Gas</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Level / Pressure</th>
                  <th className="px-4 py-3">Refill due</th>
                  <th className="px-4 py-3">PM due</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs font-semibold text-slate-900">{a.serialNumber}</div>
                      <div className="text-xs text-slate-500">{a.id}{a.manufacturer ? ` · ${a.manufacturer}` : ""}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-indigo-700">{GAS_TYPE_LABEL[a.gasType]}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{ASSET_TYPE_LABEL[a.assetType]}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{a.location}{a.servingZone ? <div className="text-slate-500">→ {a.servingZone}</div> : null}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {a.currentLevel !== undefined && <div>{a.currentLevel} {a.capacityUnit}</div>}
                      {a.currentPressureBar !== undefined && <div className={a.alarmLowBar !== undefined && a.currentPressureBar < a.alarmLowBar ? "font-semibold text-rose-700" : ""}>{a.currentPressureBar} bar</div>}
                      {a.purityPct !== undefined && <div className="text-slate-500">{a.purityPct}% purity</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{a.nextRefillDueAt ? new Date(a.nextRefillDueAt).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{a.nextMaintenanceDueAt ? new Date(a.nextMaintenanceDueAt).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3"><Pill status={a.status}>{STATUS_LABEL[a.status]}</Pill></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditA(a); setShowA(true); }} className="mr-2 text-xs font-semibold text-primary-600 hover:text-primary-700">Edit</button>
                      <button onClick={() => del(a.id)} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Delete</button>
                    </td>
                  </tr>
                ))}
                {filteredAssets.length === 0 && <tr><td colSpan={9}><Empty>No assets yet.</Empty></td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "logs" && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Reading</th>
                <th className="px-4 py-3">Alarm</th>
                <th className="px-4 py-3">By</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs text-slate-600">{new Date(l.recordedAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs">
                    <div className="font-mono font-semibold text-slate-900">{l.assetSerial}</div>
                    <div className="text-slate-500">{GAS_TYPE_LABEL[l.gasType]}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">{LOG_KIND_LABEL[l.kind]}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">
                    {l.pressureBar !== undefined && <div>{l.pressureBar} bar</div>}
                    {l.level !== undefined && <div>Level: {l.level}</div>}
                    {l.purityPct !== undefined && <div>Purity: {l.purityPct}%</div>}
                    {l.refillVolume !== undefined && <div>Refill: {l.refillVolume}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {l.alarmSeverity && <span className={`rounded px-2 py-0.5 font-semibold ${l.alarmSeverity === "critical" ? "bg-rose-100 text-rose-700" : l.alarmSeverity === "high" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>{SEVERITY_LABEL[l.alarmSeverity]}</span>}
                    {l.alarmDescription && <div className="mt-1 text-slate-600">{l.alarmDescription}</div>}
                    {l.resolvedAt && <div className="mt-1 text-emerald-700">Resolved {new Date(l.resolvedAt).toLocaleString()}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{l.recordedBy}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEditL(l); setShowL(true); }} className="mr-2 text-xs font-semibold text-primary-600 hover:text-primary-700">Edit</button>
                    <button onClick={() => del(l.id, "log")} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Delete</button>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={7}><Empty>No logs yet.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showA && <AssetModal initial={editA} onClose={() => { setShowA(false); setEditA(null); }} onSaved={() => { setShowA(false); setEditA(null); load(); }} />}
      {showL && <LogModal assets={assets} initial={editL} onClose={() => { setShowL(false); setEditL(null); }} onSaved={() => { setShowL(false); setEditL(null); load(); }} />}
    </div>
  );
}

function AssetModal({ initial, onClose, onSaved }: { initial: GasAsset | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<GasAsset>>(
    initial ?? { assetType: "cylinder", gasType: "o2", status: "in_service", capacityUnit: "bar" },
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/medical-gas", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }

  return (
    <Modal title={initial ? "Edit gas asset" : "New gas asset"} onClose={onClose} onSave={submit} busy={busy} err={err}>
      <Field label="Serial number *"><input className="inp" value={form.serialNumber || ""} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} /></Field>
      <Field label="Manufacturer"><input className="inp" value={form.manufacturer || ""} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></Field>
      <Field label="Asset type *"><select className="inp" value={form.assetType || "cylinder"} onChange={(e) => setForm({ ...form, assetType: e.target.value as AssetType })}>{ASSET_TYPES.map((t) => <option key={t} value={t}>{ASSET_TYPE_LABEL[t]}</option>)}</select></Field>
      <Field label="Gas type *"><select className="inp" value={form.gasType || "o2"} onChange={(e) => setForm({ ...form, gasType: e.target.value as GasType })}>{GAS_TYPES.map((g) => <option key={g} value={g}>{GAS_TYPE_LABEL[g]}</option>)}</select></Field>
      <Field label="Capacity unit"><select className="inp" value={form.capacityUnit || "bar"} onChange={(e) => setForm({ ...form, capacityUnit: e.target.value as GasAsset["capacityUnit"] })}>{UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select></Field>
      <Field label="Capacity value"><input type="number" className="inp" value={form.capacityValue ?? ""} onChange={(e) => setForm({ ...form, capacityValue: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
      <Field label="Current level"><input type="number" className="inp" value={form.currentLevel ?? ""} onChange={(e) => setForm({ ...form, currentLevel: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
      <Field label="Current pressure (bar)"><input type="number" step="0.1" className="inp" value={form.currentPressureBar ?? ""} onChange={(e) => setForm({ ...form, currentPressureBar: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
      <Field label="Location *"><input className="inp" value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
      <Field label="Serving zone"><input className="inp" value={form.servingZone || ""} onChange={(e) => setForm({ ...form, servingZone: e.target.value })} /></Field>
      <Field label="Status"><select className="inp" value={form.status || "in_service"} onChange={(e) => setForm({ ...form, status: e.target.value as AssetStatus })}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></Field>
      <Field label="Purity %"><input type="number" step="0.1" className="inp" value={form.purityPct ?? ""} onChange={(e) => setForm({ ...form, purityPct: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
      <Field label="Alarm low (bar)"><input type="number" step="0.1" className="inp" value={form.alarmLowBar ?? ""} onChange={(e) => setForm({ ...form, alarmLowBar: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
      <Field label="Alarm high (bar)"><input type="number" step="0.1" className="inp" value={form.alarmHighBar ?? ""} onChange={(e) => setForm({ ...form, alarmHighBar: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
      <Field label="Installed"><input type="date" className="inp" value={(form.installedAt || "").slice(0, 10)} onChange={(e) => setForm({ ...form, installedAt: e.target.value })} /></Field>
      <Field label="Last refill"><input type="date" className="inp" value={(form.lastRefillAt || "").slice(0, 10)} onChange={(e) => setForm({ ...form, lastRefillAt: e.target.value })} /></Field>
      <Field label="Next refill due"><input type="date" className="inp" value={(form.nextRefillDueAt || "").slice(0, 10)} onChange={(e) => setForm({ ...form, nextRefillDueAt: e.target.value })} /></Field>
      <Field label="Last maintenance"><input type="date" className="inp" value={(form.lastMaintenanceAt || "").slice(0, 10)} onChange={(e) => setForm({ ...form, lastMaintenanceAt: e.target.value })} /></Field>
      <Field label="Next PM due"><input type="date" className="inp" value={(form.nextMaintenanceDueAt || "").slice(0, 10)} onChange={(e) => setForm({ ...form, nextMaintenanceDueAt: e.target.value })} /></Field>
      <Field label="Vendor"><input className="inp" value={form.vendor || ""} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /></Field>
      <Field label="Vendor phone"><input className="inp" value={form.vendorPhone || ""} onChange={(e) => setForm({ ...form, vendorPhone: e.target.value })} /></Field>
      <Field label="Contract end"><input type="date" className="inp" value={(form.contractEndDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, contractEndDate: e.target.value })} /></Field>
      <Field label="Remark" full><textarea className="inp" rows={2} value={form.remark || ""} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></Field>
    </Modal>
  );
}

function LogModal({ assets, initial, onClose, onSaved }: { assets: GasAsset[]; initial: GasLog | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<GasLog>>(
    initial ?? { kind: "pressure_check", recordedAt: new Date().toISOString().slice(0, 16) },
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form, recordKind: "log" };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/medical-gas", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }

  return (
    <Modal title={initial ? "Edit log" : "New log entry"} onClose={onClose} onSave={submit} busy={busy} err={err}>
      <Field label="Asset *" full>
        <select className="inp" value={form.assetId || ""} onChange={(e) => setForm({ ...form, assetId: e.target.value })}>
          <option value="">-- Select --</option>
          {assets.map((a) => <option key={a.id} value={a.id}>{a.serialNumber} · {GAS_TYPE_LABEL[a.gasType]} · {a.location}</option>)}
        </select>
      </Field>
      <Field label="Kind"><select className="inp" value={form.kind || "pressure_check"} onChange={(e) => setForm({ ...form, kind: e.target.value as LogKind })}>{LOG_KINDS.map((k) => <option key={k} value={k}>{LOG_KIND_LABEL[k]}</option>)}</select></Field>
      <Field label="Recorded at"><input type="datetime-local" className="inp" value={(form.recordedAt || "").slice(0, 16)} onChange={(e) => setForm({ ...form, recordedAt: e.target.value })} /></Field>
      <Field label="Recorded by *"><input className="inp" value={form.recordedBy || ""} onChange={(e) => setForm({ ...form, recordedBy: e.target.value })} /></Field>
      <Field label="Pressure (bar)"><input type="number" step="0.1" className="inp" value={form.pressureBar ?? ""} onChange={(e) => setForm({ ...form, pressureBar: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
      <Field label="Level"><input type="number" className="inp" value={form.level ?? ""} onChange={(e) => setForm({ ...form, level: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
      <Field label="Purity %"><input type="number" step="0.1" className="inp" value={form.purityPct ?? ""} onChange={(e) => setForm({ ...form, purityPct: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
      <Field label="Refill volume"><input type="number" className="inp" value={form.refillVolume ?? ""} onChange={(e) => setForm({ ...form, refillVolume: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
      <Field label="Refill vendor"><input className="inp" value={form.refillVendor || ""} onChange={(e) => setForm({ ...form, refillVendor: e.target.value })} /></Field>
      <Field label="Alarm severity"><select className="inp" value={form.alarmSeverity || ""} onChange={(e) => setForm({ ...form, alarmSeverity: (e.target.value || undefined) as AlarmSeverity | undefined })}><option value="">-</option>{SEVERITIES.map((s) => <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>)}</select></Field>
      <Field label="Alarm description"><input className="inp" value={form.alarmDescription || ""} onChange={(e) => setForm({ ...form, alarmDescription: e.target.value })} /></Field>
      <Field label="Acknowledged by"><input className="inp" value={form.acknowledgedBy || ""} onChange={(e) => setForm({ ...form, acknowledgedBy: e.target.value })} /></Field>
      <Field label="Acknowledged at"><input type="datetime-local" className="inp" value={(form.acknowledgedAt || "").slice(0, 16)} onChange={(e) => setForm({ ...form, acknowledgedAt: e.target.value })} /></Field>
      <Field label="Resolved at"><input type="datetime-local" className="inp" value={(form.resolvedAt || "").slice(0, 16)} onChange={(e) => setForm({ ...form, resolvedAt: e.target.value })} /></Field>
      <Field label="Maintenance notes" full><textarea className="inp" rows={2} value={form.maintenanceNotes || ""} onChange={(e) => setForm({ ...form, maintenanceNotes: e.target.value })} /></Field>
      <Field label="Attachments URL"><input className="inp" value={form.attachmentsUrl || ""} onChange={(e) => setForm({ ...form, attachmentsUrl: e.target.value })} /></Field>
    </Modal>
  );
}

function Modal({ title, onClose, onSave, busy, err, children }: { title: string; onClose: () => void; onSave: () => void; busy: boolean; err: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{title}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
        {err && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={onSave} disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">{busy ? "Saving..." : "Save"}</button>
        </div>
      </div>
      <style jsx>{`.inp { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }`}</style>
    </div>
  );
}
function StatTile({ label, value, tone }: { label: string; value: number; tone: "slate" | "amber" | "rose" | "emerald" | "indigo" }) {
  const t: Record<string, string> = { slate: "bg-slate-50 text-slate-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", emerald: "bg-emerald-50 text-emerald-700", indigo: "bg-indigo-50 text-indigo-700" };
  return <div className={`rounded-xl p-4 ${t[tone]}`}><div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>;
}
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-semibold ${active ? "bg-primary-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{children}</button>;
}
function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-primary-600 bg-primary-50 text-primary-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{children}</button>;
}
function Pill({ status, children }: { status: string; children: React.ReactNode }) {
  const map: Record<string, string> = {
    in_service: "bg-emerald-100 text-emerald-700", empty: "bg-amber-100 text-amber-700",
    refilling: "bg-indigo-100 text-indigo-700", maintenance: "bg-indigo-100 text-indigo-700",
    alarm: "bg-rose-100 text-rose-700", out_of_service: "bg-rose-100 text-rose-700",
    condemned: "bg-slate-100 text-slate-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] || "bg-slate-100 text-slate-700"}`}>{children}</span>;
}
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <label className={`block ${full ? "md:col-span-2" : ""}`}><div className="mb-1 text-xs font-semibold text-slate-600">{label}</div>{children}</label>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="p-8 text-center text-sm text-slate-500">{children}</div>;
}
