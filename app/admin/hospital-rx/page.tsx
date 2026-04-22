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
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-2">Hospital Prescriptions</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mt-4">
          <p className="text-amber-900 font-medium">No active organization</p>
          <p className="text-sm text-amber-800 mt-1">
            Select an organization from the switcher in the top bar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Hospital Prescriptions</h1>
          <p className="text-sm text-gray-500">
            Medication orders issued during encounters. Feeds pharmacy dispensing.
          </p>
        </div>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          disabled={patients.length === 0}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {showForm ? "Cancel" : "+ New prescription"}
        </button>
      </div>

      {patients.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-900">
          No patients yet.{" "}
          <a href="/admin/patients" className="underline font-medium">Add a patient</a>{" "}
          first.
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
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
            >
              {editingId ? "Save changes" : "Create prescription"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
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
        <div className="flex gap-1">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                statusFilter === s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
        ) : rxs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No prescriptions match the filters.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2">Issued</th>
                <th className="px-4 py-2">Patient</th>
                <th className="px-4 py-2">Doctor</th>
                <th className="px-4 py-2">Medications</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rxs.map((rx) => {
                const p = patientsById.get(rx.patientId);
                return (
                  <tr key={rx.id} className="border-t border-gray-100 hover:bg-gray-50 align-top">
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                      {new Date(rx.issuedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      {p ? (
                        <>
                          <div className="font-medium">{p.firstName} {p.lastName}</div>
                          <div className="text-xs font-mono text-gray-400">{p.mrn}</div>
                        </>
                      ) : (
                        <span className="text-gray-400 italic">unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-2">{rx.doctorName || "—"}</td>
                    <td className="px-4 py-2">
                      <div className="space-y-0.5">
                        {rx.items.map((i, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-medium">{i.drugName}</span>
                            {i.strength && <span className="text-gray-500"> · {i.strength}</span>}
                            {i.frequency && <span className="text-gray-500"> · {i.frequency}</span>}
                            {i.durationDays && <span className="text-gray-500"> · {i.durationDays}d</span>}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={rx.status}
                        onChange={(e) => updateStatus(rx, e.target.value as PrescriptionStatus)}
                        className="text-xs px-2 py-1 border border-gray-200 rounded"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => loadForEdit(rx)}
                        className="text-blue-600 hover:underline mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(rx)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
