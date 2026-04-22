"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

type Method = "steam" | "ethylene_oxide" | "plasma" | "dry_heat" | "chemical";
type SetStatus = "active" | "retired";
type BatchStatus = "loaded" | "sterilizing" | "sterilized" | "issued" | "failed" | "recalled";
type IndicatorResult = "pass" | "fail" | "pending";

interface InstrumentSet {
  id: string;
  setCode: string;
  name: string;
  department: string;
  itemCount: number;
  description?: string;
  status: SetStatus;
}

interface BatchItem {
  setId: string;
  setCode: string;
  setName: string;
  issued?: boolean;
  issuedTo?: string;
  issuedAt?: string;
}

interface Batch {
  id: string;
  loadNumber: string;
  method: Method;
  machineId?: string;
  operator: string;
  temperatureC?: number;
  pressureKpa?: number;
  exposureMin?: number;
  chemicalIndicator: IndicatorResult;
  biologicalIndicator: IndicatorResult;
  biologicalReadAt?: string;
  validDays: number;
  expiresAt?: string;
  items: BatchItem[];
  status: BatchStatus;
  startedAt: string;
  completedAt?: string;
  failedReason?: string;
  recalledAt?: string;
  recalledReason?: string;
  notes?: string;
}

const METHODS: { v: Method; l: string }[] = [
  { v: "steam", l: "Steam / Autoclave" },
  { v: "ethylene_oxide", l: "Ethylene Oxide (ETO)" },
  { v: "plasma", l: "Plasma (H₂O₂)" },
  { v: "dry_heat", l: "Dry Heat" },
  { v: "chemical", l: "Chemical" },
];

const BATCH_STATUSES: { v: BatchStatus; l: string; cls: string }[] = [
  { v: "loaded", l: "Loaded", cls: "bg-slate-100 text-slate-700" },
  { v: "sterilizing", l: "Sterilizing", cls: "bg-amber-100 text-amber-700" },
  { v: "sterilized", l: "Sterilized", cls: "bg-emerald-100 text-emerald-700" },
  { v: "issued", l: "Issued", cls: "bg-blue-100 text-blue-700" },
  { v: "failed", l: "Failed", cls: "bg-red-100 text-red-700" },
  { v: "recalled", l: "Recalled", cls: "bg-red-200 text-red-800" },
];

const INDICATOR_CLS: Record<IndicatorResult, string> = {
  pass: "bg-emerald-100 text-emerald-700",
  fail: "bg-red-100 text-red-700",
  pending: "bg-slate-100 text-slate-600",
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
function batchPill(s: BatchStatus): string {
  return BATCH_STATUSES.find((x) => x.v === s)?.cls || "";
}

export default function CssdPage() {
  const [tab, setTab] = useState<"batches" | "sets">("batches");
  const [sets, setSets] = useState<InstrumentSet[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  // sets form
  const [showSetForm, setShowSetForm] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [setForm, setSetForm] = useState<Record<string, string>>({});

  // batch form
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [batchForm, setBatchForm] = useState<Record<string, string>>({});
  const [selectedSets, setSelectedSets] = useState<string[]>([]);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  // batch filters
  const [filterStatus, setFilterStatus] = useState<BatchStatus | "">("");
  const [filterMethod, setFilterMethod] = useState<Method | "">("");

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filterStatus) qs.set("status", filterStatus);
      if (filterMethod) qs.set("method", filterMethod);
      const [sRes, bRes] = await Promise.all([
        fetch(`/api/hospital/cssd/sets`, { cache: "no-store" }),
        fetch(`/api/hospital/cssd/batches?${qs}`, { cache: "no-store" }),
      ]);
      if (sRes.ok) setSets((await sRes.json()).sets || []);
      if (bRes.ok) setBatches((await bRes.json()).batches || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterMethod]);

  const stats = useMemo(() => {
    const inFlight = batches.filter((b) => b.status === "loaded" || b.status === "sterilizing").length;
    const biPending = batches.filter((b) => b.biologicalIndicator === "pending" && b.status !== "failed" && b.status !== "recalled").length;
    const failed = batches.filter((b) => b.status === "failed" || b.status === "recalled").length;
    const now = Date.now();
    const expiring = batches.filter((b) => {
      if (!b.expiresAt) return false;
      const d = new Date(b.expiresAt).getTime();
      return d >= now && d - now <= 7 * 86400000 && b.status !== "failed" && b.status !== "recalled";
    }).length;
    return { inFlight, biPending, failed, expiring };
  }, [batches]);

  // Sets --------------------------------------------------------------

  function openCreateSet() {
    setEditingSetId(null);
    setSetForm({ name: "", department: "", itemCount: "0", status: "active" });
    setShowSetForm(true);
  }
  function openEditSet(s: InstrumentSet) {
    setEditingSetId(s.id);
    setSetForm({
      name: s.name,
      department: s.department,
      itemCount: String(s.itemCount),
      description: s.description || "",
      status: s.status,
    });
    setShowSetForm(true);
  }
  async function submitSet() {
    if (!setForm.name) return;
    const payload: Record<string, unknown> = {
      ...setForm,
      itemCount: setForm.itemCount ? Number(setForm.itemCount) : 0,
    };
    const method = editingSetId ? "PATCH" : "POST";
    if (editingSetId) payload.id = editingSetId;
    const res = await fetch("/api/hospital/cssd/sets", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowSetForm(false);
      setEditingSetId(null);
      await load();
    } else alert("Save failed");
  }
  async function removeSet(id: string) {
    if (!confirm("Delete this set?")) return;
    const res = await fetch("/api/hospital/cssd/sets", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) await load();
  }

  // Batches -----------------------------------------------------------

  function openCreateBatch() {
    setEditingBatchId(null);
    setBatchForm({
      method: "steam",
      operator: "",
      startedAt: new Date().toISOString().slice(0, 16),
      status: "loaded",
      chemicalIndicator: "pending",
      biologicalIndicator: "pending",
      validDays: "30",
      temperatureC: "134",
      pressureKpa: "210",
      exposureMin: "4",
    });
    setSelectedSets([]);
    setShowBatchForm(true);
  }
  function openEditBatch(b: Batch) {
    setEditingBatchId(b.id);
    setBatchForm({
      method: b.method,
      machineId: b.machineId || "",
      operator: b.operator,
      temperatureC: b.temperatureC != null ? String(b.temperatureC) : "",
      pressureKpa: b.pressureKpa != null ? String(b.pressureKpa) : "",
      exposureMin: b.exposureMin != null ? String(b.exposureMin) : "",
      chemicalIndicator: b.chemicalIndicator,
      biologicalIndicator: b.biologicalIndicator,
      biologicalReadAt: b.biologicalReadAt?.slice(0, 16) || "",
      validDays: String(b.validDays),
      status: b.status,
      startedAt: b.startedAt.slice(0, 16),
      completedAt: b.completedAt?.slice(0, 16) || "",
      failedReason: b.failedReason || "",
      notes: b.notes || "",
    });
    setSelectedSets(b.items.map((i) => i.setId));
    setShowBatchForm(true);
  }
  function toggleSet(id: string) {
    setSelectedSets((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }
  async function submitBatch() {
    const payload: Record<string, unknown> = {
      ...batchForm,
      items: selectedSets.map((id) => ({ setId: id })),
      temperatureC: batchForm.temperatureC ? Number(batchForm.temperatureC) : undefined,
      pressureKpa: batchForm.pressureKpa ? Number(batchForm.pressureKpa) : undefined,
      exposureMin: batchForm.exposureMin ? Number(batchForm.exposureMin) : undefined,
      validDays: batchForm.validDays ? Number(batchForm.validDays) : 30,
      startedAt: batchForm.startedAt ? new Date(batchForm.startedAt).toISOString() : undefined,
      completedAt: batchForm.completedAt ? new Date(batchForm.completedAt).toISOString() : undefined,
      biologicalReadAt: batchForm.biologicalReadAt ? new Date(batchForm.biologicalReadAt).toISOString() : undefined,
    };
    const method = editingBatchId ? "PATCH" : "POST";
    if (editingBatchId) payload.id = editingBatchId;
    const res = await fetch("/api/hospital/cssd/batches", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowBatchForm(false);
      setEditingBatchId(null);
      await load();
    } else alert("Save failed");
  }
  async function removeBatch(id: string) {
    if (!confirm("Delete this sterilization record?")) return;
    const res = await fetch("/api/hospital/cssd/batches", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) await load();
  }
  async function changeBatchStatus(b: Batch, status: BatchStatus) {
    let failedReason: string | undefined;
    let recalledReason: string | undefined;
    if (status === "failed" && !b.failedReason) {
      failedReason = prompt("Reason for failure?") || "";
      if (!failedReason) return;
    }
    if (status === "recalled") {
      recalledReason = prompt("Recall reason?") || "";
      if (!recalledReason) return;
    }
    const res = await fetch("/api/hospital/cssd/batches", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: b.id, status, failedReason, recalledReason }),
    });
    if (res.ok) await load();
  }
  async function issueSet(b: Batch, setId: string) {
    const issuedTo = prompt("Issue to (department / person)?");
    if (!issuedTo) return;
    const res = await fetch("/api/hospital/cssd/batches", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: b.id, action: "issue", setId, issuedTo }),
    });
    if (res.ok) await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CSSD — Sterilization</h1>
          <p className="mt-1 text-sm text-slate-500">
            Instrument set catalog and autoclave / ETO cycle register.
          </p>
        </div>
        <div className="flex gap-2">
          {tab === "sets" ? (
            <button onClick={openCreateSet} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
              + New Set
            </button>
          ) : (
            <button onClick={openCreateBatch} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
              + New Load
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="In Progress" value={stats.inFlight} tone="amber" />
        <Stat label="BI Pending" value={stats.biPending} tone="slate" />
        <Stat label="Failed / Recalled" value={stats.failed} tone="red" />
        <Stat label="Expiring ≤7d" value={stats.expiring} tone="orange" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
        {(["batches", "sets"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition ${
              tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "batches" ? `Sterilization Loads (${batches.length})` : `Instrument Sets (${sets.length})`}
          </button>
        ))}
      </div>

      {/* SETS TAB */}
      {tab === "sets" && (
        <>
          {showSetForm && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">
                  {editingSetId ? "Edit Set" : "New Instrument Set"}
                </h2>
                <button onClick={() => { setShowSetForm(false); setEditingSetId(null); }} className="text-xs text-slate-500 hover:text-slate-700">
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field label="Name *">
                  <input value={setForm.name || ""} onChange={(e) => setSetForm({ ...setForm, name: e.target.value })} className="inp" placeholder="General Surgery Tray" />
                </Field>
                <Field label="Department">
                  <input value={setForm.department || ""} onChange={(e) => setSetForm({ ...setForm, department: e.target.value })} className="inp" placeholder="OT-1" />
                </Field>
                <Field label="Item count">
                  <input type="number" value={setForm.itemCount || ""} onChange={(e) => setSetForm({ ...setForm, itemCount: e.target.value })} className="inp" />
                </Field>
                <Field label="Status">
                  <select value={setForm.status || "active"} onChange={(e) => setSetForm({ ...setForm, status: e.target.value })} className="inp">
                    <option value="active">Active</option>
                    <option value="retired">Retired</option>
                  </select>
                </Field>
                <div className="md:col-span-3">
                  <Field label="Description">
                    <textarea rows={2} value={setForm.description || ""} onChange={(e) => setSetForm({ ...setForm, description: e.target.value })} className="inp" />
                  </Field>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => { setShowSetForm(false); setEditingSetId(null); }} className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                  Cancel
                </button>
                <button onClick={submitSet} className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                  {editingSetId ? "Save" : "Create"}
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
                  <th className="px-4 py-2.5 text-left">Department</th>
                  <th className="px-4 py-2.5 text-right">Items</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>}
                {!loading && sets.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No sets.</td></tr>}
                {sets.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.setCode}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{s.name}</div>
                      {s.description && <div className="text-[11px] text-slate-500">{s.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{s.department || "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{s.itemCount}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEditSet(s)} className="mr-2 text-xs font-medium text-slate-600 hover:text-slate-900">Edit</button>
                      <button onClick={() => removeSet(s.id)} className="text-xs font-medium text-red-600 hover:text-red-700">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* BATCHES TAB */}
      {tab === "batches" && (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as BatchStatus | "")} className="rounded-md border border-slate-200 px-2 py-1.5 text-sm">
              <option value="">All statuses</option>
              {BATCH_STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
            <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value as Method | "")} className="rounded-md border border-slate-200 px-2 py-1.5 text-sm">
              <option value="">All methods</option>
              {METHODS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>

          {showBatchForm && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">
                  {editingBatchId ? "Edit Load" : "New Sterilization Load"}
                </h2>
                <button onClick={() => { setShowBatchForm(false); setEditingBatchId(null); }} className="text-xs text-slate-500 hover:text-slate-700">
                  Cancel
                </button>
              </div>

              <Section title="Cycle details">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Field label="Method">
                    <select value={batchForm.method || "steam"} onChange={(e) => setBatchForm({ ...batchForm, method: e.target.value })} className="inp">
                      {METHODS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
                    </select>
                  </Field>
                  <Field label="Machine ID / Tag">
                    <input value={batchForm.machineId || ""} onChange={(e) => setBatchForm({ ...batchForm, machineId: e.target.value })} className="inp" placeholder="BIO-… or Autoclave #1" />
                  </Field>
                  <Field label="Operator">
                    <input value={batchForm.operator || ""} onChange={(e) => setBatchForm({ ...batchForm, operator: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Temperature (°C)">
                    <input type="number" value={batchForm.temperatureC || ""} onChange={(e) => setBatchForm({ ...batchForm, temperatureC: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Pressure (kPa)">
                    <input type="number" value={batchForm.pressureKpa || ""} onChange={(e) => setBatchForm({ ...batchForm, pressureKpa: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Exposure (min)">
                    <input type="number" value={batchForm.exposureMin || ""} onChange={(e) => setBatchForm({ ...batchForm, exposureMin: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Started at">
                    <input type="datetime-local" value={batchForm.startedAt || ""} onChange={(e) => setBatchForm({ ...batchForm, startedAt: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Completed at">
                    <input type="datetime-local" value={batchForm.completedAt || ""} onChange={(e) => setBatchForm({ ...batchForm, completedAt: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Status">
                    <select value={batchForm.status || "loaded"} onChange={(e) => setBatchForm({ ...batchForm, status: e.target.value })} className="inp">
                      {BATCH_STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                    </select>
                  </Field>
                </div>
              </Section>

              <Section title="Indicators & validity">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <Field label="Chemical Indicator">
                    <select value={batchForm.chemicalIndicator || "pending"} onChange={(e) => setBatchForm({ ...batchForm, chemicalIndicator: e.target.value })} className="inp">
                      <option value="pending">Pending</option>
                      <option value="pass">Pass</option>
                      <option value="fail">Fail</option>
                    </select>
                  </Field>
                  <Field label="Biological Indicator">
                    <select value={batchForm.biologicalIndicator || "pending"} onChange={(e) => setBatchForm({ ...batchForm, biologicalIndicator: e.target.value })} className="inp">
                      <option value="pending">Pending</option>
                      <option value="pass">Pass</option>
                      <option value="fail">Fail</option>
                    </select>
                  </Field>
                  <Field label="BI Read At">
                    <input type="datetime-local" value={batchForm.biologicalReadAt || ""} onChange={(e) => setBatchForm({ ...batchForm, biologicalReadAt: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Sterile valid (days)">
                    <input type="number" value={batchForm.validDays || ""} onChange={(e) => setBatchForm({ ...batchForm, validDays: e.target.value })} className="inp" />
                  </Field>
                </div>
              </Section>

              <Section title={`Sets in this load (${selectedSets.length})`}>
                {sets.length === 0 ? (
                  <div className="text-xs text-slate-400">No sets in catalog. Create sets first.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {sets.filter((s) => s.status === "active").map((s) => {
                      const on = selectedSets.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSet(s.id)}
                          className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                            on ? "border-primary-300 bg-primary-50 text-primary-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span className="font-mono text-[10px] mr-1.5 opacity-60">{s.setCode}</span>
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Section>

              <Section title="Notes">
                <Field label="Notes">
                  <textarea rows={2} value={batchForm.notes || ""} onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })} className="inp" />
                </Field>
                {batchForm.status === "failed" && (
                  <Field label="Failure reason">
                    <input value={batchForm.failedReason || ""} onChange={(e) => setBatchForm({ ...batchForm, failedReason: e.target.value })} className="inp" />
                  </Field>
                )}
              </Section>

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => { setShowBatchForm(false); setEditingBatchId(null); }} className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                  Cancel
                </button>
                <button onClick={submitBatch} className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                  {editingBatchId ? "Save" : "Create load"}
                </button>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 text-left">Load #</th>
                  <th className="px-4 py-2.5 text-left">Method</th>
                  <th className="px-4 py-2.5 text-left">Sets</th>
                  <th className="px-4 py-2.5 text-left">Indicators</th>
                  <th className="px-4 py-2.5 text-left">Expires</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>}
                {!loading && batches.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No loads recorded.</td></tr>}
                {batches.map((b) => {
                  const isOpen = expandedBatch === b.id;
                  const expDays = daysUntil(b.expiresAt);
                  const expiring = expDays !== null && expDays >= 0 && expDays <= 7;
                  const expired = expDays !== null && expDays < 0;
                  const allIssued = b.items.length > 0 && b.items.every((i) => i.issued);
                  return (
                    <Fragment key={b.id}>
                      <tr onClick={() => setExpandedBatch(isOpen ? null : b.id)} className="cursor-pointer hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs text-slate-500">{b.loadNumber}</div>
                          <div className="text-[11px] text-slate-500">{b.operator || "—"} · {fmtDate(b.startedAt)}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700">
                          {METHODS.find((m) => m.v === b.method)?.l}
                          {b.machineId && <div className="text-[10px] text-slate-500">{b.machineId}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700">
                          {b.items.length} set{b.items.length === 1 ? "" : "s"}
                          {allIssued && <div className="text-[10px] text-emerald-600">all issued</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${INDICATOR_CLS[b.chemicalIndicator]}`}>
                              CI·{b.chemicalIndicator}
                            </span>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${INDICATOR_CLS[b.biologicalIndicator]}`}>
                              BI·{b.biologicalIndicator}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {b.expiresAt ? (
                            <div className={expired ? "text-red-600 font-semibold" : expiring ? "text-amber-600 font-semibold" : "text-slate-600"}>
                              {fmtDate(b.expiresAt)}
                              {expDays !== null && (
                                <div className="text-[10px] text-slate-400">
                                  {expired ? `${Math.abs(expDays)}d expired` : `${expDays}d left`}
                                </div>
                              )}
                            </div>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={b.status}
                            onChange={(e) => changeBatchStatus(b, e.target.value as BatchStatus)}
                            className={`rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold ${batchPill(b.status)}`}
                          >
                            {BATCH_STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => openEditBatch(b)} className="mr-2 text-xs font-medium text-slate-600 hover:text-slate-900">Edit</button>
                          <button onClick={() => removeBatch(b.id)} className="text-xs font-medium text-red-600 hover:text-red-700">Delete</button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                              <KV k="Temperature" v={b.temperatureC != null ? `${b.temperatureC} °C` : "—"} />
                              <KV k="Pressure" v={b.pressureKpa != null ? `${b.pressureKpa} kPa` : "—"} />
                              <KV k="Exposure" v={b.exposureMin != null ? `${b.exposureMin} min` : "—"} />
                              <KV k="BI read at" v={fmtDate(b.biologicalReadAt)} />
                              <KV k="Started" v={b.startedAt ? new Date(b.startedAt).toLocaleString() : "—"} />
                              <KV k="Completed" v={b.completedAt ? new Date(b.completedAt).toLocaleString() : "—"} />
                              <KV k="Valid for" v={`${b.validDays}d`} />
                              <KV k="Expires" v={fmtDate(b.expiresAt)} />
                            </div>
                            {b.failedReason && (
                              <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200">
                                <span className="font-semibold">Failed:</span> {b.failedReason}
                              </div>
                            )}
                            {b.recalledReason && (
                              <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200">
                                <span className="font-semibold">Recalled {fmtDate(b.recalledAt)}:</span> {b.recalledReason}
                              </div>
                            )}
                            {b.notes && (
                              <div className="mt-3 rounded-md bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
                                <span className="font-semibold">Notes:</span> {b.notes}
                              </div>
                            )}
                            <div className="mt-4">
                              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                Items in this load
                              </div>
                              {b.items.length === 0 ? (
                                <div className="text-xs text-slate-400">No sets attached.</div>
                              ) : (
                                <div className="overflow-hidden rounded-md ring-1 ring-slate-200">
                                  <table className="w-full text-xs">
                                    <thead className="bg-white text-[10px] uppercase tracking-wider text-slate-500">
                                      <tr>
                                        <th className="px-2 py-1.5 text-left">Set</th>
                                        <th className="px-2 py-1.5 text-left">Issued to</th>
                                        <th className="px-2 py-1.5 text-left">Issued at</th>
                                        <th className="px-2 py-1.5 text-right">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                      {b.items.map((i) => (
                                        <tr key={i.setId}>
                                          <td className="px-2 py-1.5">
                                            <span className="font-mono text-[10px] opacity-60 mr-1">{i.setCode}</span>
                                            <span className="text-slate-700">{i.setName}</span>
                                          </td>
                                          <td className="px-2 py-1.5 text-slate-700">{i.issuedTo || "—"}</td>
                                          <td className="px-2 py-1.5 text-slate-600">{i.issuedAt ? new Date(i.issuedAt).toLocaleString() : "—"}</td>
                                          <td className="px-2 py-1.5 text-right">
                                            {!i.issued && (b.status === "sterilized" || b.status === "issued") ? (
                                              <button onClick={() => issueSet(b, i.setId)} className="rounded bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-700 hover:bg-primary-100">
                                                Issue
                                              </button>
                                            ) : i.issued ? (
                                              <span className="text-[10px] text-emerald-600">✓ issued</span>
                                            ) : (
                                              <span className="text-[10px] text-slate-400">—</span>
                                            )}
                                          </td>
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

function Stat({ label, value, tone }: { label: string; value: number; tone: "slate" | "red" | "amber" | "orange" }) {
  const tones: Record<string, string> = {
    slate: "text-slate-900", red: "text-red-600", amber: "text-amber-600", orange: "text-orange-600",
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
