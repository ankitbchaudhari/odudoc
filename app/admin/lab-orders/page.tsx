"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  LabOrder,
  LabOrderStatus,
  LabPriority,
  LabResultFlag,
  LabTestItem,
} from "@/lib/hospital/lab-orders-store";
import type { Patient } from "@/lib/patients-store";
import type { Encounter } from "@/lib/encounters-store";

const STATUSES: LabOrderStatus[] = [
  "ordered",
  "collected",
  "in_progress",
  "completed",
  "reported",
  "cancelled",
];
const PRIORITIES: LabPriority[] = ["routine", "urgent", "stat"];
const FLAGS: LabResultFlag[] = ["normal", "low", "high", "critical", "abnormal"];

// Common test panels for quick-add.
const COMMON_PANELS: Array<{ label: string; tests: string[] }> = [
  { label: "CBC", tests: ["Hemoglobin", "WBC", "Platelets", "RBC", "Hematocrit"] },
  { label: "LFT", tests: ["SGOT", "SGPT", "ALP", "Total Bilirubin", "Albumin"] },
  { label: "KFT", tests: ["Urea", "Creatinine", "Uric Acid", "Sodium", "Potassium"] },
  { label: "Lipid Profile", tests: ["Total Cholesterol", "HDL", "LDL", "Triglycerides"] },
  { label: "Thyroid", tests: ["TSH", "T3", "T4"] },
  { label: "HbA1c", tests: ["HbA1c"] },
];

type FormItem = Omit<LabTestItem, "id"> & { id?: string };

export default function LabOrdersPage() {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [statusFilter, setStatusFilter] = useState<LabOrderStatus | "all">("all");
  const [patientFilter, setPatientFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState("");
  const [encounterId, setEncounterId] = useState("");
  const [orderingDoctor, setOrderingDoctor] = useState("");
  const [priority, setPriority] = useState<LabPriority>("routine");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [items, setItems] = useState<FormItem[]>([
    { testName: "", sampleType: "blood" },
  ]);

  const [resultsFor, setResultsFor] = useState<string | null>(null);

  const patientsById = useMemo(() => {
    const m = new Map<string, Patient>();
    for (const p of patients) m.set(p.id, p);
    return m;
  }, [patients]);

  const patientEncounters = useMemo(
    () => encounters.filter((e) => e.patientId === patientId),
    [encounters, patientId]
  );

  async function loadAll() {
    setLoading(true);
    try {
      const [rp, re, ro] = await Promise.all([
        fetch("/api/patients", { cache: "no-store" }),
        fetch("/api/encounters", { cache: "no-store" }),
        fetch(
          `/api/hospital/lab-orders?${new URLSearchParams({
            ...(statusFilter !== "all" ? { status: statusFilter } : {}),
            ...(patientFilter !== "all" ? { patientId: patientFilter } : {}),
          }).toString()}`,
          { cache: "no-store" }
        ),
      ]);
      const [dp, de, dox] = await Promise.all([rp.json(), re.json(), ro.json()]);
      if (!ro.ok) {
        setError(dox.error || "failed");
        setOrders([]);
      } else {
        setError(null);
        setOrders(dox.orders || []);
      }
      setPatients(dp.patients || []);
      setEncounters(de.encounters || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, patientFilter]);

  function resetForm() {
    setEditingId(null);
    setPatientId("");
    setEncounterId("");
    setOrderingDoctor("");
    setPriority("routine");
    setClinicalNotes("");
    setItems([{ testName: "", sampleType: "blood" }]);
    setShowForm(false);
  }

  function loadForEdit(o: LabOrder) {
    setEditingId(o.id);
    setPatientId(o.patientId);
    setEncounterId(o.encounterId || "");
    setOrderingDoctor(o.orderingDoctor || "");
    setPriority(o.priority);
    setClinicalNotes(o.clinicalNotes || "");
    setItems(
      o.items.length > 0
        ? o.items.map((i) => ({ ...i }))
        : [{ testName: "", sampleType: "blood" }]
    );
    setShowForm(true);
  }

  function setItem(idx: number, patch: Partial<FormItem>) {
    setItems((curr) => {
      const next = [...curr];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }
  function addItem() {
    setItems((curr) => [...curr, { testName: "", sampleType: "blood" }]);
  }
  function removeItem(idx: number) {
    setItems((curr) =>
      curr.length > 1 ? curr.filter((_, i) => i !== idx) : curr
    );
  }
  function addPanel(tests: string[]) {
    setItems((curr) => {
      // Drop any empty trailing rows.
      const kept = curr.filter((i) => i.testName.trim());
      return [...kept, ...tests.map((t) => ({ testName: t, sampleType: "blood" }))];
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) {
      alert("Please select a patient.");
      return;
    }
    const validItems = items.filter((i) => i.testName.trim());
    if (validItems.length === 0) {
      alert("Please add at least one test.");
      return;
    }
    const payload = {
      patientId,
      encounterId: encounterId || undefined,
      orderingDoctor,
      priority,
      clinicalNotes,
      items: validItems,
    };
    const res = await fetch("/api/hospital/lab-orders", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
    });
    if (res.ok) {
      resetForm();
      loadAll();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Save failed");
    }
  }

  async function updateStatus(o: LabOrder, status: LabOrderStatus) {
    await fetch("/api/hospital/lab-orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: o.id, status }),
    });
    loadAll();
  }

  async function remove(o: LabOrder) {
    if (!confirm("Delete this lab order? Results will be lost.")) return;
    await fetch("/api/hospital/lab-orders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: o.id }),
    });
    loadAll();
  }

  async function submitResults(
    orderId: string,
    results: Array<{
      itemId: string;
      value?: string;
      unit?: string;
      referenceRange?: string;
      flag?: LabResultFlag;
      comment?: string;
    }>
  ) {
    await fetch("/api/hospital/lab-orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: orderId, results }),
    });
    setResultsFor(null);
    loadAll();
  }

  if (error === "no_active_org") {
    return (
      <div className="p-4 md:p-8 max-w-7xl">
        <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-600 via-pink-600 to-rose-700 p-6 text-white shadow-lg">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-accent-300/20 blur-3xl" />
          <div className="relative">
            <h1 className="text-2xl font-bold">Lab Orders</h1>
            <p className="mt-1 text-sm text-pink-50/90">
              Clinical lab investigations — order, collect, result, report.
            </p>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-rose-50 via-amber-50 to-rose-50 shadow-sm ring-1 ring-rose-200/60">
          <div className="h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500" />
          <div className="p-8 text-center">
            <div className="mb-3 text-5xl">🧪</div>
            <h2 className="text-lg font-bold text-rose-900">No active organization</h2>
            <p className="mt-2 text-sm text-rose-800/90">
              Select an organization from the switcher in the top bar.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl">
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-600 via-pink-600 to-rose-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-accent-300/20 blur-3xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-pink-400" />
              </span>
              {orders.length} order{orders.length === 1 ? "" : "s"}
            </div>
            <h1 className="text-2xl font-bold">Lab Orders</h1>
            <p className="mt-1 text-sm text-pink-50/90">
              Clinical lab investigations — order, collect, result, report.
            </p>
          </div>
          <button
            onClick={() => (showForm ? resetForm() : setShowForm(true))}
            disabled={patients.length === 0}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-pink-700 shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showForm ? "Cancel" : "🧪 + New lab order"}
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="bg-white border border-gray-200 rounded-xl p-5 mb-8 shadow-sm space-y-4"
        >
          <h2 className="font-semibold text-lg">
            {editingId ? "Edit lab order" : "New lab order"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-600">Patient *</label>
              <select
                value={patientId}
                onChange={(e) => {
                  setPatientId(e.target.value);
                  setEncounterId("");
                }}
                required
                disabled={!!editingId}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100"
              >
                <option value="">— Select —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} · {p.mrn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Encounter</label>
              <select
                value={encounterId}
                onChange={(e) => setEncounterId(e.target.value)}
                disabled={!patientId}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100"
              >
                <option value="">— Standalone —</option>
                {patientEncounters.map((e) => (
                  <option key={e.id} value={e.id}>
                    {new Date(e.startedAt).toLocaleDateString()} · {e.type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as LabPriority)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-600">Ordering doctor</label>
              <input
                type="text"
                value={orderingDoctor}
                onChange={(e) => setOrderingDoctor(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-600">Clinical notes / reason</label>
              <input
                type="text"
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Tests</h3>
              <div className="flex gap-1 flex-wrap">
                {COMMON_PANELS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => addPanel(p.tests)}
                    className="text-[11px] px-2 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100"
                  >
                    + {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={addItem}
                  className="text-[11px] px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200"
                >
                  + single
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center border border-gray-200 rounded-lg p-2"
                >
                  <input
                    className="col-span-5 px-2 py-1.5 border border-gray-300 rounded text-sm"
                    placeholder="Test name *"
                    value={it.testName}
                    onChange={(e) => setItem(idx, { testName: e.target.value })}
                  />
                  <input
                    className="col-span-3 px-2 py-1.5 border border-gray-300 rounded text-sm"
                    placeholder="Sample type"
                    value={it.sampleType || ""}
                    onChange={(e) => setItem(idx, { sampleType: e.target.value })}
                  />
                  <input
                    className="col-span-3 px-2 py-1.5 border border-gray-300 rounded text-sm"
                    placeholder="Test code (optional)"
                    value={it.testCode || ""}
                    onChange={(e) => setItem(idx, { testCode: e.target.value })}
                  />
                  <div className="col-span-1 text-right">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-red-600 text-xs hover:underline"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {editingId ? "💾 Save changes" : "🧪 Create lab order"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 transition hover:-translate-y-0.5 hover:shadow"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select
          value={patientFilter}
          onChange={(e) => setPatientFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white min-w-[200px]"
        >
          <option value="all">All patients</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName} · {p.mrn}
            </option>
          ))}
        </select>
        <div className="flex gap-1 flex-wrap">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition hover:-translate-y-0.5 ${
                statusFilter === s
                  ? "bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white shadow"
                  : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500" />
        {loading ? (
          <p className="py-16 text-center text-sm text-gray-400">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">
            🧪 No lab orders match the filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gradient-to-r from-fuchsia-50/60 via-pink-50/40 to-rose-50/60">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  <th className="px-5 py-3">Ordered</th>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Tests</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o) => {
                  const p = patientsById.get(o.patientId);
                  const resultedCount = o.items.filter((i) => i.value).length;
                  const priorityStyle =
                    o.priority === "stat"
                      ? "bg-gradient-to-r from-rose-500 to-red-600 text-white"
                      : o.priority === "urgent"
                      ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                      : "bg-gradient-to-r from-slate-100 to-gray-100 text-gray-700 ring-1 ring-gray-200";
                  const statusStyle =
                    o.status === "ordered"
                      ? { pill: "bg-gradient-to-r from-sky-50 to-blue-50 text-blue-700 ring-blue-200", dot: "bg-blue-500" }
                      : o.status === "collected" || o.status === "in_progress"
                      ? { pill: "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" }
                      : o.status === "completed" || o.status === "reported"
                      ? { pill: "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" }
                      : { pill: "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" };
                  return (
                    <>
                      <tr key={o.id} className="align-top transition-colors hover:bg-pink-50/30">
                        <td className="px-5 py-3 whitespace-nowrap text-xs text-gray-600">
                          {new Date(o.orderedAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3">
                          {p ? (
                            <>
                              <div className="font-medium text-gray-900">{p.firstName} {p.lastName}</div>
                              <div className="text-xs font-mono text-gray-400">{p.mrn}</div>
                            </>
                          ) : (
                            <span className="text-gray-400 italic">unknown</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase shadow ${priorityStyle}`}>
                            {o.priority}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-xs font-semibold text-gray-900">
                            {resultedCount}/{o.items.length} resulted
                          </div>
                          <div className="text-[11px] text-gray-500 truncate max-w-xs">
                            {o.items.map((i) => i.testName).join(", ")}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${statusStyle.pill}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                            {o.status.replace("_", " ")}
                          </span>
                          <select
                            value={o.status}
                            onChange={(e) => updateStatus(o, e.target.value as LabOrderStatus)}
                            className="ml-2 text-xs px-2 py-1 border border-gray-200 rounded bg-white"
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setResultsFor(resultsFor === o.id ? null : o.id)}
                              className="rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md"
                            >
                              📊 Results
                            </button>
                            <button
                              onClick={() => loadForEdit(o)}
                              className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-pink-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => remove(o)}
                              className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow"
                            >
                              ✕ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      {resultsFor === o.id && (
                        <tr className="bg-gradient-to-r from-fuchsia-50/40 via-pink-50/30 to-rose-50/40 border-t border-gray-100">
                          <td colSpan={6} className="px-5 py-4">
                            <ResultsEditor
                              order={o}
                              onSave={(rs) => submitResults(o.id, rs)}
                              onCancel={() => setResultsFor(null)}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultsEditor({
  order, onSave, onCancel,
}: {
  order: LabOrder;
  onSave: (
    results: Array<{
      itemId: string;
      value?: string;
      unit?: string;
      referenceRange?: string;
      flag?: LabResultFlag;
      comment?: string;
    }>
  ) => void;
  onCancel: () => void;
}) {
  const [rows, setRows] = useState(
    order.items.map((i) => ({
      itemId: i.id,
      testName: i.testName,
      value: i.value || "",
      unit: i.unit || "",
      referenceRange: i.referenceRange || "",
      flag: i.flag || ("normal" as LabResultFlag),
      comment: i.comment || "",
    }))
  );

  function set(i: number, patch: Partial<(typeof rows)[number]>) {
    setRows((curr) => {
      const next = [...curr];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-slate-800">Enter results</h4>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div
            key={r.itemId}
            className="grid grid-cols-12 gap-2 items-center bg-white border border-gray-200 rounded-lg p-2"
          >
            <div className="col-span-3 text-xs font-medium text-gray-800">
              {r.testName}
            </div>
            <input
              className="col-span-2 px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Value"
              value={r.value}
              onChange={(e) => set(i, { value: e.target.value })}
            />
            <input
              className="col-span-1 px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Unit"
              value={r.unit}
              onChange={(e) => set(i, { unit: e.target.value })}
            />
            <input
              className="col-span-2 px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Ref range"
              value={r.referenceRange}
              onChange={(e) => set(i, { referenceRange: e.target.value })}
            />
            <select
              className="col-span-1 px-2 py-1 border border-gray-300 rounded text-sm bg-white"
              value={r.flag}
              onChange={(e) => set(i, { flag: e.target.value as LabResultFlag })}
            >
              {FLAGS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <input
              className="col-span-3 px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Comment"
              value={r.comment}
              onChange={(e) => set(i, { comment: e.target.value })}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave(rows)}
          className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
        >
          Save results
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
