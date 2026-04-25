"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  HospitalPrescription,
  PrescriptionItem,
  PrescriptionStatus,
} from "@/lib/hospital/prescriptions-store";
import type { Patient } from "@/lib/patients-store";
import type { Encounter } from "@/lib/encounters-store";

const STATUSES: PrescriptionStatus[] = [
  "active",
  "completed",
  "on_hold",
  "cancelled",
];

const EMPTY_ITEM: PrescriptionItem = {
  drugName: "",
  strength: "",
  form: "",
  dose: "",
  frequency: "",
  route: "",
};

export default function HospitalRxPage() {
  const [rxs, setRxs] = useState<HospitalPrescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [patientFilter, setPatientFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<PrescriptionStatus | "all">(
    "all"
  );
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [patientId, setPatientId] = useState("");
  const [encounterId, setEncounterId] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PrescriptionItem[]>([{ ...EMPTY_ITEM }]);

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
      const [rp, re, rx] = await Promise.all([
        fetch("/api/patients", { cache: "no-store" }),
        fetch("/api/encounters", { cache: "no-store" }),
        fetch(
          `/api/hospital/prescriptions?${new URLSearchParams({
            ...(patientFilter !== "all" ? { patientId: patientFilter } : {}),
            ...(statusFilter !== "all" ? { status: statusFilter } : {}),
          }).toString()}`,
          { cache: "no-store" }
        ),
      ]);
      const [dp, de, dx] = await Promise.all([rp.json(), re.json(), rx.json()]);
      if (!rx.ok) {
        setError(dx.error || "failed");
        setRxs([]);
      } else {
        setError(null);
        setRxs(dx.prescriptions || []);
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
  }, [patientFilter, statusFilter]);

  function resetForm() {
    setEditingId(null);
    setPatientId("");
    setEncounterId("");
    setDoctorName("");
    setDiagnosis("");
    setNotes("");
    setItems([{ ...EMPTY_ITEM }]);
    setShowForm(false);
  }

  function loadForEdit(rx: HospitalPrescription) {
    setEditingId(rx.id);
    setPatientId(rx.patientId);
    setEncounterId(rx.encounterId || "");
    setDoctorName(rx.doctorName || "");
    setDiagnosis(rx.diagnosis || "");
    setNotes(rx.notes || "");
    setItems(
      rx.items.length > 0
        ? rx.items.map((i) => ({ ...EMPTY_ITEM, ...i }))
        : [{ ...EMPTY_ITEM }]
    );
    setShowForm(true);
  }

  function setItem(idx: number, patch: Partial<PrescriptionItem>) {
    setItems((curr) => {
      const next = [...curr];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }
  function addItem() {
    setItems((curr) => [...curr, { ...EMPTY_ITEM }]);
  }
  function removeItem(idx: number) {
    setItems((curr) =>
      curr.length > 1 ? curr.filter((_, i) => i !== idx) : curr
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) {
      alert("Please select a patient.");
      return;
    }
    const validItems = items.filter((i) => i.drugName.trim());
    if (validItems.length === 0) {
      alert("Please add at least one medication.");
      return;
    }
    const payload = {
      patientId,
      encounterId: encounterId || undefined,
      doctorName,
      diagnosis,
      notes,
      items: validItems.map((i) => ({
        ...i,
        durationDays: i.durationDays ? Number(i.durationDays) : undefined,
        quantity: i.quantity ? Number(i.quantity) : undefined,
      })),
    };
    const res = await fetch("/api/hospital/prescriptions", {
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

  async function updateStatus(rx: HospitalPrescription, status: PrescriptionStatus) {
    await fetch("/api/hospital/prescriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rx.id, status }),
    });
    loadAll();
  }

  async function remove(rx: HospitalPrescription) {
    if (!confirm("Delete this prescription?")) return;
    await fetch("/api/hospital/prescriptions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rx.id }),
    });
    loadAll();
  }

  if (error === "no_active_org") {
    return (
      <div className="p-4 md:p-8 max-w-7xl">
        <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 p-6 text-white shadow-lg">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-accent-300/20 blur-3xl" />
          <div className="relative">
            <h1 className="text-2xl font-bold">Hospital Prescriptions</h1>
            <p className="mt-1 text-sm text-sky-50/90">
              Medication orders issued during encounters. Feeds pharmacy dispensing.
            </p>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-rose-50 via-amber-50 to-rose-50 shadow-sm ring-1 ring-rose-200/60">
          <div className="h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500" />
          <div className="p-8 text-center">
            <div className="mb-3 text-5xl">💊</div>
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
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-accent-300/20 blur-3xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-400" />
              </span>
              {rxs.length} prescription{rxs.length === 1 ? "" : "s"}
            </div>
            <h1 className="text-2xl font-bold">Hospital Prescriptions</h1>
            <p className="mt-1 text-sm text-sky-50/90">
              Medication orders issued during encounters. Feeds pharmacy dispensing.
            </p>
          </div>
          <button
            onClick={() => (showForm ? resetForm() : setShowForm(true))}
            disabled={patients.length === 0}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showForm ? "Cancel" : "💊 + New prescription"}
          </button>
        </div>
      </div>

      {patients.length === 0 && (
        <div className="overflow-hidden rounded-xl bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 mb-6 ring-1 ring-rose-200/60">
          <div className="h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500" />
          <div className="p-4 text-sm text-rose-900">
            <span className="mr-1">⚠️</span>
            No patients yet.{" "}
            <a href="/admin/patients" className="underline font-semibold">Add a patient</a>{" "}
            first.
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={submit}
          className="bg-white border border-gray-200 rounded-xl p-5 mb-8 shadow-sm space-y-4"
        >
          <h2 className="font-semibold text-lg">
            {editingId ? "Edit prescription" : "New prescription"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
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
              <label className="text-xs font-medium text-gray-600">Encounter (optional)</label>
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
                    {e.diagnosis ? ` · ${e.diagnosis}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <Input label="Doctor" value={doctorName} onChange={setDoctorName} />
            <Input label="Diagnosis" value={diagnosis} onChange={setDiagnosis} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Medications</h3>
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                + Add medication
              </button>
            </div>
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="border border-gray-200 rounded-lg p-3 grid grid-cols-2 md:grid-cols-6 gap-2"
                >
                  <div className="col-span-2">
                    <label className="text-[10px] font-medium text-gray-500">Drug name *</label>
                    <input
                      type="text"
                      value={it.drugName}
                      onChange={(e) => setItem(idx, { drugName: e.target.value })}
                      className="w-full mt-0.5 px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <MiniInput
                    label="Strength" value={it.strength || ""}
                    onChange={(v) => setItem(idx, { strength: v })}
                  />
                  <MiniInput
                    label="Form" value={it.form || ""}
                    onChange={(v) => setItem(idx, { form: v })}
                  />
                  <MiniInput
                    label="Dose" value={it.dose || ""}
                    onChange={(v) => setItem(idx, { dose: v })}
                  />
                  <MiniInput
                    label="Frequency" value={it.frequency || ""}
                    onChange={(v) => setItem(idx, { frequency: v })}
                  />
                  <MiniInput
                    label="Route" value={it.route || ""}
                    onChange={(v) => setItem(idx, { route: v })}
                  />
                  <MiniInput
                    label="Duration (days)" value={it.durationDays?.toString() || ""}
                    onChange={(v) => setItem(idx, { durationDays: v ? Number(v) : undefined })}
                  />
                  <MiniInput
                    label="Qty" value={it.quantity?.toString() || ""}
                    onChange={(v) => setItem(idx, { quantity: v ? Number(v) : undefined })}
                  />
                  <div className="col-span-2">
                    <label className="text-[10px] font-medium text-gray-500">Instructions</label>
                    <input
                      type="text"
                      value={it.instructions || ""}
                      onChange={(e) => setItem(idx, { instructions: e.target.value })}
                      className="w-full mt-0.5 px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {editingId ? "💾 Save changes" : "💊 Create prescription"}
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
                  ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow"
                  : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500" />
        {loading ? (
          <p className="py-16 text-center text-sm text-gray-400">Loading…</p>
        ) : rxs.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">
            💊 No prescriptions match the filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gradient-to-r from-sky-50/60 via-blue-50/40 to-indigo-50/60">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  <th className="px-5 py-3">Issued</th>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Doctor</th>
                  <th className="px-5 py-3">Medications</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rxs.map((rx) => {
                  const p = patientsById.get(rx.patientId);
                  const statusStyle =
                    rx.status === "active"
                      ? { pill: "bg-gradient-to-r from-sky-50 to-blue-50 text-blue-700 ring-blue-200", dot: "bg-blue-500" }
                      : rx.status === "completed"
                      ? { pill: "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" }
                      : rx.status === "on_hold"
                      ? { pill: "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" }
                      : { pill: "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" };
                  return (
                    <tr key={rx.id} className="align-top transition-colors hover:bg-sky-50/30">
                      <td className="px-5 py-3 whitespace-nowrap text-xs text-gray-600">
                        {new Date(rx.issuedAt).toLocaleDateString()}
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
                      <td className="px-5 py-3 text-gray-700">{rx.doctorName || "—"}</td>
                      <td className="px-5 py-3">
                        <div className="space-y-0.5">
                          {rx.items.map((i, idx) => (
                            <div key={idx} className="text-xs">
                              <span className="font-semibold text-gray-900">{i.drugName}</span>
                              {i.strength && <span className="text-gray-500"> · {i.strength}</span>}
                              {i.frequency && <span className="text-gray-500"> · {i.frequency}</span>}
                              {i.durationDays && <span className="text-gray-500"> · {i.durationDays}d</span>}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${statusStyle.pill}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                          {rx.status.replace("_", " ")}
                        </span>
                        <select
                          value={rx.status}
                          onChange={(e) => updateStatus(rx, e.target.value as PrescriptionStatus)}
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
                            onClick={() => loadForEdit(rx)}
                            className="rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => remove(rx)}
                            className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow"
                          >
                            ✕ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
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

function Input({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
      />
    </div>
  );
}

function MiniInput({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-gray-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-0.5 px-2 py-1.5 border border-gray-300 rounded text-sm"
      />
    </div>
  );
}
