"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

type WasteColor = "yellow" | "red" | "white" | "blue" | "black";
type WasteStatus = "collected" | "handed_over" | "disposed" | "rejected";
type WasteCategory =
  | "pathological" | "contaminated" | "expired_meds" | "microbiology"
  | "chemical_liquid" | "infected_plastic" | "sharps" | "glass_metal" | "general";

interface Vendor {
  id: string;
  vendorCode: string;
  name: string;
  authorizationNumber?: string;
  authorizationExpiresAt?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  active: boolean;
}

interface WasteRecord {
  id: string;
  recordNumber: string;
  collectionDate: string;
  category: WasteCategory;
  color: WasteColor;
  source: string;
  weightKg: number;
  bagCount: number;
  collectedBy: string;
  vendorId?: string;
  manifestNumber?: string;
  handedOverAt?: string;
  handedOverBy?: string;
  driverName?: string;
  vehicleNumber?: string;
  status: WasteStatus;
  disposedAt?: string;
  rejectedReason?: string;
  notes?: string;
}

const CATEGORIES: { v: WasteCategory; l: string; default: WasteColor }[] = [
  { v: "pathological", l: "Pathological", default: "yellow" },
  { v: "contaminated", l: "Contaminated (dressings/linen)", default: "yellow" },
  { v: "expired_meds", l: "Expired Medicines", default: "yellow" },
  { v: "microbiology", l: "Microbiology / Biotech", default: "yellow" },
  { v: "chemical_liquid", l: "Chemical & Liquid", default: "yellow" },
  { v: "infected_plastic", l: "Infected Plastic", default: "red" },
  { v: "sharps", l: "Sharps", default: "white" },
  { v: "glass_metal", l: "Glass / Metallic Implants", default: "blue" },
  { v: "general", l: "General (non-BMW)", default: "black" },
];

const COLOR_SWATCH: Record<WasteColor, string> = {
  yellow: "bg-yellow-400",
  red: "bg-red-500",
  white: "bg-slate-100 ring-1 ring-slate-300",
  blue: "bg-blue-500",
  black: "bg-slate-800",
};
const COLOR_LABEL: Record<WasteColor, string> = {
  yellow: "Yellow", red: "Red", white: "White (sharps)", blue: "Blue", black: "Black",
};

const STATUSES: { v: WasteStatus; l: string; cls: string }[] = [
  { v: "collected", l: "Collected", cls: "bg-slate-100 text-slate-700" },
  { v: "handed_over", l: "Handed Over", cls: "bg-amber-100 text-amber-700" },
  { v: "disposed", l: "Disposed", cls: "bg-emerald-100 text-emerald-700" },
  { v: "rejected", l: "Rejected", cls: "bg-red-100 text-red-700" },
];

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
function statusPill(s: WasteStatus): string {
  return STATUSES.find((x) => x.v === s)?.cls || "";
}

export default function BioWastePage() {
  const [tab, setTab] = useState<"records" | "vendors">("records");
  const [records, setRecords] = useState<WasteRecord[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  const [showRecordForm, setShowRecordForm] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [recordForm, setRecordForm] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const [showVendorForm, setShowVendorForm] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [vendorForm, setVendorForm] = useState<Record<string, string>>({});

  const [filterStatus, setFilterStatus] = useState<WasteStatus | "">("");
  const [filterCategory, setFilterCategory] = useState<WasteCategory | "">("");
  const [filterColor, setFilterColor] = useState<WasteColor | "">("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filterStatus) qs.set("status", filterStatus);
      if (filterCategory) qs.set("category", filterCategory);
      if (filterColor) qs.set("color", filterColor);
      if (filterFrom) qs.set("from", filterFrom);
      if (filterTo) qs.set("to", filterTo);
      const [rRes, vRes] = await Promise.all([
        fetch(`/api/hospital/biowaste?${qs}`, { cache: "no-store" }),
        fetch(`/api/hospital/biowaste/vendors`, { cache: "no-store" }),
      ]);
      if (rRes.ok) setRecords((await rRes.json()).records || []);
      if (vRes.ok) setVendors((await vRes.json()).vendors || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterCategory, filterColor, filterFrom, filterTo]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayKg = records
      .filter((r) => r.collectionDate === today)
      .reduce((s, r) => s + r.weightKg, 0);
    const pending = records.filter((r) => r.status === "collected").length;
    const thisMonth = today.slice(0, 7);
    const monthKg = records
      .filter((r) => r.collectionDate.startsWith(thisMonth))
      .reduce((s, r) => s + r.weightKg, 0);
    const expiringVendors = vendors.filter((v) => {
      if (!v.authorizationExpiresAt) return false;
      const d = daysUntil(v.authorizationExpiresAt);
      return d !== null && d >= 0 && d <= 30;
    }).length;
    return {
      todayKg: Math.round(todayKg * 100) / 100,
      pending,
      monthKg: Math.round(monthKg * 100) / 100,
      expiringVendors,
    };
  }, [records, vendors]);

  // Records -----------------------------------------------------------

  function openCreateRecord() {
    setEditingRecordId(null);
    setRecordForm({
      collectionDate: new Date().toISOString().slice(0, 10),
      category: "contaminated",
      color: "yellow",
      source: "",
      weightKg: "",
      bagCount: "1",
      collectedBy: "",
      status: "collected",
    });
    setShowRecordForm(true);
  }
  function openEditRecord(r: WasteRecord) {
    setEditingRecordId(r.id);
    setRecordForm({
      collectionDate: r.collectionDate,
      category: r.category,
      color: r.color,
      source: r.source,
      weightKg: String(r.weightKg),
      bagCount: String(r.bagCount),
      collectedBy: r.collectedBy,
      vendorId: r.vendorId || "",
      manifestNumber: r.manifestNumber || "",
      handedOverAt: r.handedOverAt?.slice(0, 16) || "",
      handedOverBy: r.handedOverBy || "",
      driverName: r.driverName || "",
      vehicleNumber: r.vehicleNumber || "",
      status: r.status,
      notes: r.notes || "",
    });
    setShowRecordForm(true);
  }
  function onCategoryChange(v: string) {
    const cat = CATEGORIES.find((c) => c.v === v);
    setRecordForm({ ...recordForm, category: v, color: cat?.default || recordForm.color });
  }
  async function submitRecord() {
    const payload: Record<string, unknown> = {
      ...recordForm,
      weightKg: recordForm.weightKg ? Number(recordForm.weightKg) : 0,
      bagCount: recordForm.bagCount ? Number(recordForm.bagCount) : 0,
      handedOverAt: recordForm.handedOverAt
        ? new Date(recordForm.handedOverAt).toISOString()
        : undefined,
    };
    const method = editingRecordId ? "PATCH" : "POST";
    if (editingRecordId) payload.id = editingRecordId;
    const res = await fetch("/api/hospital/biowaste", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowRecordForm(false);
      setEditingRecordId(null);
      await load();
    } else alert("Save failed");
  }
  async function removeRecord(id: string) {
    if (!confirm("Delete this waste record?")) return;
    const res = await fetch("/api/hospital/biowaste", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) await load();
  }
  async function changeStatus(r: WasteRecord, status: WasteStatus) {
    let rejectedReason: string | undefined;
    if (status === "rejected") {
      rejectedReason = prompt("Rejection reason?") || "";
      if (!rejectedReason) return;
    }
    const res = await fetch("/api/hospital/biowaste", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: r.id, status, rejectedReason }),
    });
    if (res.ok) await load();
  }

  // Vendors -----------------------------------------------------------

  function openCreateVendor() {
    setEditingVendorId(null);
    setVendorForm({ name: "", active: "true" });
    setShowVendorForm(true);
  }
  function openEditVendor(v: Vendor) {
    setEditingVendorId(v.id);
    setVendorForm({
      name: v.name,
      authorizationNumber: v.authorizationNumber || "",
      authorizationExpiresAt: v.authorizationExpiresAt?.slice(0, 10) || "",
      contactName: v.contactName || "",
      phone: v.phone || "",
      email: v.email || "",
      address: v.address || "",
      active: v.active ? "true" : "false",
    });
    setShowVendorForm(true);
  }
  async function submitVendor() {
    if (!vendorForm.name) return;
    const payload: Record<string, unknown> = {
      ...vendorForm,
      active: vendorForm.active === "true",
    };
    const method = editingVendorId ? "PATCH" : "POST";
    if (editingVendorId) payload.id = editingVendorId;
    const res = await fetch("/api/hospital/biowaste/vendors", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowVendorForm(false);
      setEditingVendorId(null);
      await load();
    } else alert("Save failed");
  }
  async function removeVendor(id: string) {
    if (!confirm("Delete this vendor? Waste records will retain manifest numbers but lose vendor link.")) return;
    const res = await fetch("/api/hospital/biowaste/vendors", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) await load();
  }

  function vendorLabel(id?: string) {
    if (!id) return "—";
    return vendors.find((v) => v.id === id)?.name || "(deleted)";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Biomedical Waste</h1>
          <p className="mt-1 text-sm text-slate-500">
            BMW 2016 color-coded segregation, vendor handover, and manifest register.
          </p>
        </div>
        <div className="flex gap-2">
          {tab === "records" ? (
            <button onClick={openCreateRecord} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
              + Record Waste
            </button>
          ) : (
            <button onClick={openCreateVendor} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
              + Add Vendor
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Collected Today (kg)" value={stats.todayKg} tone="slate" />
        <Stat label="Awaiting Handover" value={stats.pending} tone="amber" />
        <Stat label="This Month (kg)" value={stats.monthKg} tone="slate" />
        <Stat label="Vendor Auth Expiring ≤30d" value={stats.expiringVendors} tone="red" />
      </div>

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
        {(["records", "vendors"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition ${
              tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "records" ? `Waste Records (${records.length})` : `Vendors (${vendors.length})`}
          </button>
        ))}
      </div>

      {/* RECORDS */}
      {tab === "records" && (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="rounded-md border border-slate-200 px-2 py-1.5 text-sm" />
            <span className="text-xs text-slate-400">to</span>
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="rounded-md border border-slate-200 px-2 py-1.5 text-sm" />
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as WasteCategory | "")} className="rounded-md border border-slate-200 px-2 py-1.5 text-sm">
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
            <select value={filterColor} onChange={(e) => setFilterColor(e.target.value as WasteColor | "")} className="rounded-md border border-slate-200 px-2 py-1.5 text-sm">
              <option value="">All colors</option>
              {(["yellow", "red", "white", "blue", "black"] as WasteColor[]).map((c) => (
                <option key={c} value={c}>{COLOR_LABEL[c]}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as WasteStatus | "")} className="rounded-md border border-slate-200 px-2 py-1.5 text-sm">
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </div>

          {showRecordForm && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">
                  {editingRecordId ? "Edit Record" : "Record Waste Collection"}
                </h2>
                <button onClick={() => { setShowRecordForm(false); setEditingRecordId(null); }} className="text-xs text-slate-500 hover:text-slate-700">
                  Cancel
                </button>
              </div>

              <Section title="Collection">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Field label="Collection date">
                    <input type="date" value={recordForm.collectionDate || ""} onChange={(e) => setRecordForm({ ...recordForm, collectionDate: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Category">
                    <select value={recordForm.category || "contaminated"} onChange={(e) => onCategoryChange(e.target.value)} className="inp">
                      {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
                    </select>
                  </Field>
                  <Field label="Color bag">
                    <select value={recordForm.color || "yellow"} onChange={(e) => setRecordForm({ ...recordForm, color: e.target.value })} className="inp">
                      {(["yellow", "red", "white", "blue", "black"] as WasteColor[]).map((c) => (
                        <option key={c} value={c}>{COLOR_LABEL[c]}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Source">
                    <input value={recordForm.source || ""} onChange={(e) => setRecordForm({ ...recordForm, source: e.target.value })} className="inp" placeholder="OT-1 / Ward 3B / Lab" />
                  </Field>
                  <Field label="Weight (kg)">
                    <input type="number" step="0.01" value={recordForm.weightKg || ""} onChange={(e) => setRecordForm({ ...recordForm, weightKg: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Bag count">
                    <input type="number" value={recordForm.bagCount || ""} onChange={(e) => setRecordForm({ ...recordForm, bagCount: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Collected by">
                    <input value={recordForm.collectedBy || ""} onChange={(e) => setRecordForm({ ...recordForm, collectedBy: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Status">
                    <select value={recordForm.status || "collected"} onChange={(e) => setRecordForm({ ...recordForm, status: e.target.value })} className="inp">
                      {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                    </select>
                  </Field>
                </div>
              </Section>

              <Section title="Handover to CBWTF">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Field label="Vendor">
                    <select value={recordForm.vendorId || ""} onChange={(e) => setRecordForm({ ...recordForm, vendorId: e.target.value })} className="inp">
                      <option value="">—</option>
                      {vendors.filter((v) => v.active).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Manifest / Challan #">
                    <input value={recordForm.manifestNumber || ""} onChange={(e) => setRecordForm({ ...recordForm, manifestNumber: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Handover at">
                    <input type="datetime-local" value={recordForm.handedOverAt || ""} onChange={(e) => setRecordForm({ ...recordForm, handedOverAt: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Handed over by">
                    <input value={recordForm.handedOverBy || ""} onChange={(e) => setRecordForm({ ...recordForm, handedOverBy: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Driver name">
                    <input value={recordForm.driverName || ""} onChange={(e) => setRecordForm({ ...recordForm, driverName: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Vehicle number">
                    <input value={recordForm.vehicleNumber || ""} onChange={(e) => setRecordForm({ ...recordForm, vehicleNumber: e.target.value })} className="inp" />
                  </Field>
                </div>
              </Section>

              <Field label="Notes">
                <textarea rows={2} value={recordForm.notes || ""} onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })} className="inp" />
              </Field>

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => { setShowRecordForm(false); setEditingRecordId(null); }} className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                  Cancel
                </button>
                <button onClick={submitRecord} className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                  {editingRecordId ? "Save" : "Record"}
                </button>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 text-left">Record / Date</th>
                  <th className="px-4 py-2.5 text-left">Category</th>
                  <th className="px-4 py-2.5 text-left">Source</th>
                  <th className="px-4 py-2.5 text-right">Weight</th>
                  <th className="px-4 py-2.5 text-right">Bags</th>
                  <th className="px-4 py-2.5 text-left">Vendor / Manifest</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>}
                {!loading && records.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No records.</td></tr>}
                {records.map((r) => {
                  const isOpen = expanded === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr onClick={() => setExpanded(isOpen ? null : r.id)} className="cursor-pointer hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs text-slate-500">{r.recordNumber}</div>
                          <div className="text-slate-900">{fmtDate(r.collectionDate)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block h-3 w-3 rounded-full ${COLOR_SWATCH[r.color]}`} />
                            <span className="text-xs text-slate-700">{CATEGORIES.find((c) => c.v === r.category)?.l}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700">{r.source || "—"}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{r.weightKg} kg</td>
                        <td className="px-4 py-3 text-right text-slate-700">{r.bagCount}</td>
                        <td className="px-4 py-3 text-xs text-slate-700">
                          {vendorLabel(r.vendorId)}
                          {r.manifestNumber && <div className="text-[10px] font-mono text-slate-500">#{r.manifestNumber}</div>}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={r.status}
                            onChange={(e) => changeStatus(r, e.target.value as WasteStatus)}
                            className={`rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold ${statusPill(r.status)}`}
                          >
                            {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => openEditRecord(r)} className="mr-2 text-xs font-medium text-slate-600 hover:text-slate-900">Edit</button>
                          <button onClick={() => removeRecord(r.id)} className="text-xs font-medium text-red-600 hover:text-red-700">Delete</button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                              <KV k="Collected by" v={r.collectedBy || "—"} />
                              <KV k="Handed over by" v={r.handedOverBy || "—"} />
                              <KV k="Handover at" v={r.handedOverAt ? new Date(r.handedOverAt).toLocaleString() : "—"} />
                              <KV k="Driver" v={r.driverName || "—"} />
                              <KV k="Vehicle" v={r.vehicleNumber || "—"} />
                              <KV k="Disposed at" v={r.disposedAt ? new Date(r.disposedAt).toLocaleString() : "—"} />
                            </div>
                            {r.rejectedReason && (
                              <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200">
                                <span className="font-semibold">Rejected:</span> {r.rejectedReason}
                              </div>
                            )}
                            {r.notes && (
                              <div className="mt-3 rounded-md bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
                                <span className="font-semibold">Notes:</span> {r.notes}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* VENDORS */}
      {tab === "vendors" && (
        <>
          {showVendorForm && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">
                  {editingVendorId ? "Edit Vendor" : "Add CBWTF Vendor"}
                </h2>
                <button onClick={() => { setShowVendorForm(false); setEditingVendorId(null); }} className="text-xs text-slate-500 hover:text-slate-700">
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field label="Name *">
                  <input value={vendorForm.name || ""} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} className="inp" />
                </Field>
                <Field label="SPCB Authorization #">
                  <input value={vendorForm.authorizationNumber || ""} onChange={(e) => setVendorForm({ ...vendorForm, authorizationNumber: e.target.value })} className="inp" />
                </Field>
                <Field label="Authorization expires">
                  <input type="date" value={vendorForm.authorizationExpiresAt || ""} onChange={(e) => setVendorForm({ ...vendorForm, authorizationExpiresAt: e.target.value })} className="inp" />
                </Field>
                <Field label="Contact person">
                  <input value={vendorForm.contactName || ""} onChange={(e) => setVendorForm({ ...vendorForm, contactName: e.target.value })} className="inp" />
                </Field>
                <Field label="Phone">
                  <input value={vendorForm.phone || ""} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} className="inp" />
                </Field>
                <Field label="Email">
                  <input value={vendorForm.email || ""} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} className="inp" />
                </Field>
                <div className="md:col-span-3">
                  <Field label="Address">
                    <textarea rows={2} value={vendorForm.address || ""} onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })} className="inp" />
                  </Field>
                </div>
                <Field label="Active">
                  <select value={vendorForm.active || "true"} onChange={(e) => setVendorForm({ ...vendorForm, active: e.target.value })} className="inp">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </Field>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => { setShowVendorForm(false); setEditingVendorId(null); }} className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                  Cancel
                </button>
                <button onClick={submitVendor} className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                  {editingVendorId ? "Save" : "Add"}
                </button>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 text-left">Code</th>
                  <th className="px-4 py-2.5 text-left">Name</th>
                  <th className="px-4 py-2.5 text-left">Authorization</th>
                  <th className="px-4 py-2.5 text-left">Contact</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>}
                {!loading && vendors.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No vendors.</td></tr>}
                {vendors.map((v) => {
                  const d = daysUntil(v.authorizationExpiresAt);
                  const expiring = d !== null && d >= 0 && d <= 30;
                  const expired = d !== null && d < 0;
                  return (
                    <tr key={v.id}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{v.vendorCode}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{v.name}</div>
                        {v.address && <div className="text-[11px] text-slate-500">{v.address}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {v.authorizationNumber ? (
                          <div>
                            <div className="font-mono text-slate-700">{v.authorizationNumber}</div>
                            {v.authorizationExpiresAt && (
                              <div className={expired ? "text-red-600 font-semibold" : expiring ? "text-amber-600 font-semibold" : "text-slate-500"}>
                                exp {fmtDate(v.authorizationExpiresAt)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {v.contactName && <div>{v.contactName}</div>}
                        {v.phone && <div className="text-slate-500">{v.phone}</div>}
                        {v.email && <div className="text-slate-500">{v.email}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${v.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                          {v.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEditVendor(v)} className="mr-2 text-xs font-medium text-slate-600 hover:text-slate-900">Edit</button>
                        <button onClick={() => removeVendor(v.id)} className="text-xs font-medium text-red-600 hover:text-red-700">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

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
        .inp:focus { border-color: rgb(99 102 241); box-shadow: 0 0 0 2px rgb(224 231 255); }
      `}</style>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "slate" | "amber" | "red" }) {
  const tones: Record<string, string> = { slate: "text-slate-900", amber: "text-amber-600", red: "text-red-600" };
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
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</div>
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
