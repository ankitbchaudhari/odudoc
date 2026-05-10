"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";

type AssetCategory =
  | "imaging" | "ventilator" | "monitor" | "infusion_pump" | "defibrillator"
  | "anesthesia" | "dialysis" | "laboratory" | "surgical" | "dental" | "icu" | "other";
type AssetStatus =
  | "active" | "under_maintenance" | "under_repair" | "standby" | "retired" | "condemned";
type AssetRiskClass = "A" | "B" | "C" | "D";
type LogType =
  | "ppm" | "breakdown" | "repair" | "calibration" | "inspection" | "relocation" | "condemnation";

interface Asset {
  id: string;
  assetTag: string;
  name: string;
  category: AssetCategory;
  riskClass: AssetRiskClass;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  location: string;
  custodian?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyExpiresAt?: string;
  amcVendor?: string;
  amcStartAt?: string;
  amcExpiresAt?: string;
  amcType?: "AMC" | "CMC" | "none";
  lastCalibrationAt?: string;
  nextCalibrationDueAt?: string;
  ppmIntervalDays: number;
  lastPpmAt?: string;
  nextPpmDueAt?: string;
  status: AssetStatus;
  retiredAt?: string;
  retiredReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface MLog {
  id: string;
  assetId: string;
  type: LogType;
  performedAt: string;
  performedBy: string;
  vendor?: string;
  description: string;
  partsReplaced?: string;
  cost?: number;
  downtimeHours?: number;
  nextDueAt?: string;
  notes?: string;
}

const CATEGORIES: { v: AssetCategory; l: string }[] = [
  { v: "imaging", l: "Imaging" },
  { v: "ventilator", l: "Ventilator" },
  { v: "monitor", l: "Patient Monitor" },
  { v: "infusion_pump", l: "Infusion Pump" },
  { v: "defibrillator", l: "Defibrillator" },
  { v: "anesthesia", l: "Anesthesia" },
  { v: "dialysis", l: "Dialysis" },
  { v: "laboratory", l: "Laboratory" },
  { v: "surgical", l: "Surgical" },
  { v: "dental", l: "Dental" },
  { v: "icu", l: "ICU Equipment" },
  { v: "other", l: "Other" },
];

const STATUSES: { v: AssetStatus; l: string; cls: string }[] = [
  { v: "active", l: "Active", cls: "bg-emerald-100 text-emerald-700" },
  { v: "standby", l: "Standby", cls: "bg-slate-100 text-slate-700" },
  { v: "under_maintenance", l: "Maintenance", cls: "bg-amber-100 text-amber-700" },
  { v: "under_repair", l: "Repair", cls: "bg-orange-100 text-orange-700" },
  { v: "retired", l: "Retired", cls: "bg-slate-200 text-slate-600" },
  { v: "condemned", l: "Condemned", cls: "bg-red-100 text-red-700" },
];

const LOG_TYPES: { v: LogType; l: string }[] = [
  { v: "ppm", l: "PPM (Planned)" },
  { v: "breakdown", l: "Breakdown" },
  { v: "repair", l: "Repair" },
  { v: "calibration", l: "Calibration" },
  { v: "inspection", l: "Inspection" },
  { v: "relocation", l: "Relocation" },
  { v: "condemnation", l: "Condemnation" },
];

const RISK_CLS: Record<AssetRiskClass, string> = {
  A: "bg-red-100 text-red-700 border-red-200",
  B: "bg-orange-100 text-orange-700 border-orange-200",
  C: "bg-amber-100 text-amber-700 border-amber-200",
  D: "bg-slate-100 text-slate-600 border-slate-200",
};

function fmtDate(s?: string): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}
function daysUntil(s?: string): number | null {
  if (!s) return null;
  const d = new Date(s).getTime();
  if (Number.isNaN(d)) return null;
  return Math.round((d - Date.now()) / 86400000);
}
function statusPill(status: AssetStatus): string {
  return STATUSES.find((s) => s.v === status)?.cls || "bg-slate-100 text-slate-700";
}

export default function BiomedicalPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [logs, setLogs] = useState<MLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [logForAssetId, setLogForAssetId] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<AssetStatus | "">("");
  const [filterCategory, setFilterCategory] = useState<AssetCategory | "">("");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState<Record<string, string>>({});
  const [logForm, setLogForm] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filterStatus) qs.set("status", filterStatus);
      if (filterCategory) qs.set("category", filterCategory);
      if (search) qs.set("search", search);
      const [aRes, lRes] = await Promise.all([
        fetch(`/api/hospital/biomedical?${qs}`, { cache: "no-store" }),
        fetch(`/api/hospital/biomedical/logs`, { cache: "no-store" }),
      ]);
      if (aRes.ok) {
        const data = await aRes.json();
        setAssets(data.assets || []);
      }
      if (lRes.ok) {
        const data = await lRes.json();
        setLogs(data.logs || []);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterCategory]);

  const stats = useMemo(() => {
    const total = assets.length;
    const now = Date.now();
    const ppmOverdue = assets.filter(
      (a) =>
        a.nextPpmDueAt &&
        new Date(a.nextPpmDueAt).getTime() < now &&
        a.status !== "retired" &&
        a.status !== "condemned"
    ).length;
    const underRepair = assets.filter(
      (a) => a.status === "under_repair" || a.status === "under_maintenance"
    ).length;
    const amcExpiring = assets.filter((a) => {
      if (!a.amcExpiresAt) return false;
      const d = daysUntil(a.amcExpiresAt);
      return d !== null && d >= 0 && d <= 30;
    }).length;
    return { total, ppmOverdue, underRepair, amcExpiring };
  }, [assets]);

  function openCreate() {
    setEditingId(null);
    setForm({
      name: "",
      category: "other",
      riskClass: "C",
      location: "",
      ppmIntervalDays: "180",
      amcType: "none",
      status: "active",
    });
    setShowForm(true);
  }
  function openEdit(a: Asset) {
    setEditingId(a.id);
    setForm({
      name: a.name,
      category: a.category,
      riskClass: a.riskClass,
      manufacturer: a.manufacturer || "",
      model: a.model || "",
      serialNumber: a.serialNumber || "",
      location: a.location,
      custodian: a.custodian || "",
      purchaseDate: a.purchaseDate?.slice(0, 10) || "",
      purchasePrice: a.purchasePrice != null ? String(a.purchasePrice) : "",
      warrantyExpiresAt: a.warrantyExpiresAt?.slice(0, 10) || "",
      amcVendor: a.amcVendor || "",
      amcStartAt: a.amcStartAt?.slice(0, 10) || "",
      amcExpiresAt: a.amcExpiresAt?.slice(0, 10) || "",
      amcType: a.amcType || "none",
      lastCalibrationAt: a.lastCalibrationAt?.slice(0, 10) || "",
      nextCalibrationDueAt: a.nextCalibrationDueAt?.slice(0, 10) || "",
      ppmIntervalDays: String(a.ppmIntervalDays ?? 180),
      lastPpmAt: a.lastPpmAt?.slice(0, 10) || "",
      status: a.status,
      retiredReason: a.retiredReason || "",
      notes: a.notes || "",
    });
    setShowForm(true);
  }

  async function submit() {
    if (!form.name) return;
    const payload: Record<string, unknown> = {
      ...form,
      ppmIntervalDays: form.ppmIntervalDays ? Number(form.ppmIntervalDays) : 0,
      purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : undefined,
    };
    const method = editingId ? "PATCH" : "POST";
    if (editingId) payload.id = editingId;
    const res = await fetch("/api/hospital/biomedical", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowForm(false);
      setEditingId(null);
      await load();
    } else {
      alert("Save failed");
    }
  }

  async function removeAsset(id: string) {
    if (!confirm("Delete this asset and its entire maintenance history?")) return;
    const res = await fetch("/api/hospital/biomedical", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) await load();
  }

  async function changeStatus(a: Asset, status: AssetStatus) {
    let retiredReason: string | undefined;
    if ((status === "retired" || status === "condemned") && !a.retiredReason) {
      retiredReason = prompt("Reason?") || "";
      if (!retiredReason) return;
    }
    const res = await fetch("/api/hospital/biomedical", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: a.id, status, retiredReason }),
    });
    if (res.ok) await load();
  }

  function openLog(assetId: string) {
    setLogForAssetId(assetId);
    setLogForm({
      type: "ppm",
      performedAt: new Date().toISOString().slice(0, 10),
      performedBy: "",
      description: "",
    });
  }
  async function submitLog() {
    if (!logForAssetId || !logForm.description) return;
    const payload: Record<string, unknown> = {
      ...logForm,
      assetId: logForAssetId,
      cost: logForm.cost ? Number(logForm.cost) : undefined,
      downtimeHours: logForm.downtimeHours ? Number(logForm.downtimeHours) : undefined,
    };
    const res = await fetch("/api/hospital/biomedical/logs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setLogForAssetId(null);
      setLogForm({});
      await load();
    } else {
      alert("Failed to log event");
    }
  }

  const filteredAssets = assets;

  return (
    <div className="space-y-6">
      <PageHero
        icon="🛠️"
        eyebrow="Asset Engineering"
        title="Biomedical Equipment"
        subtitle="Asset register, PPM schedules, AMC contracts, and maintenance logs"
        tone="indigo"
        primaryAction={{ label: "+ Register Asset", onClick: openCreate }}
      />

      <StatGrid cols={4}>
        <StatCard label="Total assets" value={stats.total} tone="indigo" icon="📦" />
        <StatCard label="PPM overdue" value={stats.ppmOverdue} tone={stats.ppmOverdue > 0 ? "rose" : "emerald"} icon="⏰" />
        <StatCard label="In repair / maint." value={stats.underRepair} tone={stats.underRepair > 0 ? "orange" : "slate"} icon="🔧" />
        <StatCard label="AMC expiring ≤30d" value={stats.amcExpiring} tone={stats.amcExpiring > 0 ? "amber" : "teal"} icon="📄" />
      </StatGrid>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
        <input
          className="flex-1 min-w-[180px] rounded-md border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          placeholder="Search name, tag, serial, manufacturer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") load(); }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as AssetStatus | "")}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s.v} value={s.v}>{s.l}</option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as AssetCategory | "")}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.v} value={c.v}>{c.l}</option>
          ))}
        </select>
        <button
          onClick={load}
          className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
        >
          Search
        </button>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              {editingId ? "Edit Asset" : "Register Asset"}
            </h2>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>

          <Section title="Identity">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Name *">
                <input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="inp" />
              </Field>
              <Field label="Category">
                <select value={form.category || "other"} onChange={(e) => setForm({ ...form, category: e.target.value })} className="inp">
                  {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
                </select>
              </Field>
              <Field label="Risk Class">
                <select value={form.riskClass || "C"} onChange={(e) => setForm({ ...form, riskClass: e.target.value })} className="inp">
                  <option value="A">A — Life-support</option>
                  <option value="B">B — High risk</option>
                  <option value="C">C — Medium risk</option>
                  <option value="D">D — Non-critical</option>
                </select>
              </Field>
              <Field label="Manufacturer">
                <input value={form.manufacturer || ""} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="inp" />
              </Field>
              <Field label="Model">
                <input value={form.model || ""} onChange={(e) => setForm({ ...form, model: e.target.value })} className="inp" />
              </Field>
              <Field label="Serial Number">
                <input value={form.serialNumber || ""} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} className="inp" />
              </Field>
              <Field label="Location">
                <input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} className="inp" placeholder="ICU-2 / OT-1 / Radiology" />
              </Field>
              <Field label="Custodian">
                <input value={form.custodian || ""} onChange={(e) => setForm({ ...form, custodian: e.target.value })} className="inp" placeholder="Biomed Dept. / Dr. X" />
              </Field>
              <Field label="Status">
                <select value={form.status || "active"} onChange={(e) => setForm({ ...form, status: e.target.value })} className="inp">
                  {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Procurement & Warranty">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Purchase Date">
                <input type="date" value={form.purchaseDate || ""} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} className="inp" />
              </Field>
              <Field label="Purchase Price">
                <input type="number" value={form.purchasePrice || ""} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} className="inp" />
              </Field>
              <Field label="Warranty Expires">
                <input type="date" value={form.warrantyExpiresAt || ""} onChange={(e) => setForm({ ...form, warrantyExpiresAt: e.target.value })} className="inp" />
              </Field>
            </div>
          </Section>

          <Section title="AMC / CMC Contract">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Field label="Contract Type">
                <select value={form.amcType || "none"} onChange={(e) => setForm({ ...form, amcType: e.target.value })} className="inp">
                  <option value="none">None</option>
                  <option value="AMC">AMC</option>
                  <option value="CMC">CMC</option>
                </select>
              </Field>
              <Field label="AMC Vendor">
                <input value={form.amcVendor || ""} onChange={(e) => setForm({ ...form, amcVendor: e.target.value })} className="inp" />
              </Field>
              <Field label="AMC Start">
                <input type="date" value={form.amcStartAt || ""} onChange={(e) => setForm({ ...form, amcStartAt: e.target.value })} className="inp" />
              </Field>
              <Field label="AMC Expires">
                <input type="date" value={form.amcExpiresAt || ""} onChange={(e) => setForm({ ...form, amcExpiresAt: e.target.value })} className="inp" />
              </Field>
            </div>
          </Section>

          <Section title="PPM & Calibration">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Field label="PPM Interval (days)">
                <input type="number" value={form.ppmIntervalDays || ""} onChange={(e) => setForm({ ...form, ppmIntervalDays: e.target.value })} className="inp" placeholder="0 = no PPM" />
              </Field>
              <Field label="Last PPM">
                <input type="date" value={form.lastPpmAt || ""} onChange={(e) => setForm({ ...form, lastPpmAt: e.target.value })} className="inp" />
              </Field>
              <Field label="Last Calibration">
                <input type="date" value={form.lastCalibrationAt || ""} onChange={(e) => setForm({ ...form, lastCalibrationAt: e.target.value })} className="inp" />
              </Field>
              <Field label="Next Calibration Due">
                <input type="date" value={form.nextCalibrationDueAt || ""} onChange={(e) => setForm({ ...form, nextCalibrationDueAt: e.target.value })} className="inp" />
              </Field>
            </div>
          </Section>

          <Section title="Notes">
            <Field label="Notes">
              <textarea rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="inp" />
            </Field>
            {(form.status === "retired" || form.status === "condemned") && (
              <Field label="Retire / Condemn reason">
                <input value={form.retiredReason || ""} onChange={(e) => setForm({ ...form, retiredReason: e.target.value })} className="inp" />
              </Field>
            )}
          </Section>

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
            <button onClick={submit} className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
              {editingId ? "Save changes" : "Register"}
            </button>
          </div>
        </div>
      )}

      {/* Log maintenance form */}
      {logForAssetId && (
        <div className="rounded-xl border border-primary-200 bg-primary-50/30 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Log maintenance event — {assets.find((a) => a.id === logForAssetId)?.assetTag}
            </h2>
            <button onClick={() => setLogForAssetId(null)} className="text-xs text-slate-500 hover:text-slate-700">
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Type">
              <select value={logForm.type || "ppm"} onChange={(e) => setLogForm({ ...logForm, type: e.target.value })} className="inp">
                {LOG_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </Field>
            <Field label="Performed At">
              <input type="date" value={logForm.performedAt || ""} onChange={(e) => setLogForm({ ...logForm, performedAt: e.target.value })} className="inp" />
            </Field>
            <Field label="Performed By">
              <input value={logForm.performedBy || ""} onChange={(e) => setLogForm({ ...logForm, performedBy: e.target.value })} className="inp" />
            </Field>
            <Field label="Vendor">
              <input value={logForm.vendor || ""} onChange={(e) => setLogForm({ ...logForm, vendor: e.target.value })} className="inp" />
            </Field>
            <Field label="Cost">
              <input type="number" value={logForm.cost || ""} onChange={(e) => setLogForm({ ...logForm, cost: e.target.value })} className="inp" />
            </Field>
            <Field label="Downtime (hrs)">
              <input type="number" value={logForm.downtimeHours || ""} onChange={(e) => setLogForm({ ...logForm, downtimeHours: e.target.value })} className="inp" />
            </Field>
            {(logForm.type === "calibration" || logForm.type === "inspection") && (
              <Field label="Next Due">
                <input type="date" value={logForm.nextDueAt || ""} onChange={(e) => setLogForm({ ...logForm, nextDueAt: e.target.value })} className="inp" />
              </Field>
            )}
            <div className="md:col-span-3">
              <Field label="Description *">
                <textarea rows={2} value={logForm.description || ""} onChange={(e) => setLogForm({ ...logForm, description: e.target.value })} className="inp" />
              </Field>
            </div>
            <div className="md:col-span-3">
              <Field label="Parts replaced">
                <input value={logForm.partsReplaced || ""} onChange={(e) => setLogForm({ ...logForm, partsReplaced: e.target.value })} className="inp" />
              </Field>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setLogForAssetId(null)} className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
            <button onClick={submitLog} className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
              Log event
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2.5 text-left">Tag / Name</th>
              <th className="px-4 py-2.5 text-left">Location</th>
              <th className="px-4 py-2.5 text-left">Category</th>
              <th className="px-4 py-2.5 text-left">Next PPM</th>
              <th className="px-4 py-2.5 text-left">AMC</th>
              <th className="px-4 py-2.5 text-left">Status</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            )}
            {!loading && filteredAssets.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No assets.</td></tr>
            )}
            {filteredAssets.map((a) => {
              const ppmDays = daysUntil(a.nextPpmDueAt);
              const ppmOverdue = ppmDays !== null && ppmDays < 0 && a.status !== "retired" && a.status !== "condemned";
              const amcDays = daysUntil(a.amcExpiresAt);
              const amcExpiring = amcDays !== null && amcDays >= 0 && amcDays <= 30;
              const amcExpired = amcDays !== null && amcDays < 0;
              const isOpen = expanded === a.id;
              const assetLogs = logs.filter((l) => l.assetId === a.id);
              return (
                <Fragment key={a.id}>
                  <tr
                    onClick={() => setExpanded(isOpen ? null : a.id)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex h-5 min-w-[22px] items-center justify-center rounded border px-1 text-[10px] font-bold ${RISK_CLS[a.riskClass]}`}>
                          {a.riskClass}
                        </span>
                        <div>
                          <div className="font-mono text-xs text-slate-500">{a.assetTag}</div>
                          <div className="font-medium text-slate-900">{a.name}</div>
                          {a.manufacturer && (
                            <div className="text-[11px] text-slate-500">
                              {a.manufacturer}{a.model ? ` · ${a.model}` : ""}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{a.location || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {CATEGORIES.find((c) => c.v === a.category)?.l}
                    </td>
                    <td className="px-4 py-3">
                      {a.ppmIntervalDays ? (
                        <div className={`text-xs ${ppmOverdue ? "font-semibold text-red-600" : "text-slate-600"}`}>
                          {fmtDate(a.nextPpmDueAt)}
                          {ppmDays !== null && (
                            <div className="text-[10px] text-slate-400">
                              {ppmOverdue ? `${Math.abs(ppmDays)}d overdue` : `${ppmDays}d left`}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {a.amcType && a.amcType !== "none" ? (
                        <div className={amcExpired ? "text-red-600 font-semibold" : amcExpiring ? "text-amber-600 font-semibold" : "text-slate-600"}>
                          {a.amcType}
                          <div className="text-[10px] text-slate-400">
                            {fmtDate(a.amcExpiresAt)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={a.status}
                        onChange={(e) => changeStatus(a, e.target.value as AssetStatus)}
                        className={`rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold ${statusPill(a.status)}`}
                      >
                        {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openLog(a.id)}
                        className="mr-2 rounded-md bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100"
                      >
                        + Log
                      </button>
                      <button
                        onClick={() => openEdit(a)}
                        className="mr-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeAsset(a.id)}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>

                  {isOpen && (
                    <tr className="bg-slate-50/60">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                          <KV k="Serial" v={a.serialNumber || "—"} />
                          <KV k="Custodian" v={a.custodian || "—"} />
                          <KV k="Purchase" v={fmtDate(a.purchaseDate)} />
                          <KV k="Warranty until" v={fmtDate(a.warrantyExpiresAt)} />
                          <KV k="AMC vendor" v={a.amcVendor || "—"} />
                          <KV k="Last PPM" v={fmtDate(a.lastPpmAt)} />
                          <KV k="Last Calib." v={fmtDate(a.lastCalibrationAt)} />
                          <KV k="Next Calib. Due" v={fmtDate(a.nextCalibrationDueAt)} />
                        </div>
                        {a.notes && (
                          <div className="mt-3 rounded-md bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
                            <span className="font-semibold">Notes:</span> {a.notes}
                          </div>
                        )}
                        {a.retiredAt && (
                          <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200">
                            <span className="font-semibold">Retired/Condemned {fmtDate(a.retiredAt)}:</span> {a.retiredReason || ""}
                          </div>
                        )}

                        <div className="mt-4">
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Maintenance history ({assetLogs.length})
                          </div>
                          {assetLogs.length === 0 ? (
                            <div className="text-xs text-slate-400">No events logged.</div>
                          ) : (
                            <div className="overflow-hidden rounded-md ring-1 ring-slate-200">
                              <table className="w-full text-xs">
                                <thead className="bg-white text-[10px] uppercase tracking-wider text-slate-500">
                                  <tr>
                                    <th className="px-2 py-1.5 text-left">Date</th>
                                    <th className="px-2 py-1.5 text-left">Type</th>
                                    <th className="px-2 py-1.5 text-left">By</th>
                                    <th className="px-2 py-1.5 text-left">Vendor</th>
                                    <th className="px-2 py-1.5 text-left">Description</th>
                                    <th className="px-2 py-1.5 text-right">Cost</th>
                                    <th className="px-2 py-1.5 text-right">Downtime</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                  {assetLogs.map((l) => (
                                    <tr key={l.id}>
                                      <td className="px-2 py-1.5 text-slate-600">{fmtDate(l.performedAt)}</td>
                                      <td className="px-2 py-1.5">
                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                                          {LOG_TYPES.find((t) => t.v === l.type)?.l}
                                        </span>
                                      </td>
                                      <td className="px-2 py-1.5 text-slate-600">{l.performedBy || "—"}</td>
                                      <td className="px-2 py-1.5 text-slate-600">{l.vendor || "—"}</td>
                                      <td className="px-2 py-1.5 text-slate-700">{l.description}</td>
                                      <td className="px-2 py-1.5 text-right text-slate-600">{l.cost != null ? l.cost : "—"}</td>
                                      <td className="px-2 py-1.5 text-right text-slate-600">{l.downtimeHours != null ? `${l.downtimeHours}h` : "—"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <style jsx global>{`
        .inp {
          width: 100%;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .inp:focus {
          border-color: rgb(99 102 241);
          box-shadow: 0 0 0 2px rgb(224 231 255);
        }
      `}</style>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "slate" | "red" | "orange" | "amber" }) {
  const tones: Record<string, string> = {
    slate: "text-slate-900",
    red: "text-red-600",
    orange: "text-orange-600",
    amber: "text-amber-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-medium text-slate-600">{label}</div>
      {children}
    </label>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{k}</div>
      <div className="mt-0.5 text-xs text-slate-700">{v}</div>
    </div>
  );
}
