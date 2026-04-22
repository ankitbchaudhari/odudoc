"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Encounter,
  EncounterStatus,
  EncounterType,
  Vitals,
} from "@/lib/encounters-store";
import type { Patient } from "@/lib/patients-store";

const TYPES: EncounterType[] = [
  "opd",
  "ipd",
  "emergency",
  "followup",
  "telemedicine",
];
const STATUSES: EncounterStatus[] = ["open", "closed", "cancelled"];

interface FormState {
  patientId: string;
  type: EncounterType;
  doctorName: string;
  department: string;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  examination: string;
  diagnosis: string;
  treatmentPlan: string;
  notes: string;
  bloodPressure: string;
  heartRate: string;
  temperatureC: string;
  respiratoryRate: string;
  spo2: string;
  weightKg: string;
  heightCm: string;
  painScore: string;
}

const EMPTY_FORM: FormState = {
  patientId: "",
  type: "opd",
  doctorName: "",
  department: "",
  chiefComplaint: "",
  historyOfPresentIllness: "",
  examination: "",
  diagnosis: "",
  treatmentPlan: "",
  notes: "",
  bloodPressure: "",
  heartRate: "",
  temperatureC: "",
  respiratoryRate: "",
  spo2: "",
  weightKg: "",
  heightCm: "",
  painScore: "",
};

function numOrUndef(s: string): number | undefined {
  if (!s.trim()) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function formVitals(f: FormState): Vitals {
  return {
    bloodPressure: f.bloodPressure.trim() || undefined,
    heartRate: numOrUndef(f.heartRate),
    temperatureC: numOrUndef(f.temperatureC),
    respiratoryRate: numOrUndef(f.respiratoryRate),
    spo2: numOrUndef(f.spo2),
    weightKg: numOrUndef(f.weightKg),
    heightCm: numOrUndef(f.heightCm),
    painScore: numOrUndef(f.painScore),
  };
}

export default function AdminEncountersPage() {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [statusFilter, setStatusFilter] = useState<EncounterStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<EncounterType | "all">("all");
  const [patientFilter, setPatientFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const patientsById = useMemo(() => {
    const m = new Map<string, Patient>();
    for (const p of patients) m.set(p.id, p);
    return m;
  }, [patients]);

  async function loadPatients() {
    const res = await fetch("/api/patients", { cache: "no-store" });
    const data = await res.json();
    if (res.ok) setPatients(data.patients || []);
  }

  async function loadEncounters() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (patientFilter !== "all") params.set("patientId", patientFilter);
      const res = await fetch(`/api/encounters?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "failed");
        setEncounters([]);
      } else {
        setError(null);
        setEncounters(data.encounters || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      await loadPatients();
      await loadEncounters();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadEncounters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter, patientFilter]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  }

  function loadForEdit(e: Encounter) {
    setEditingId(e.id);
    setForm({
      patientId: e.patientId,
      type: e.type,
      doctorName: e.doctorName || "",
      department: e.department || "",
      chiefComplaint: e.chiefComplaint || "",
      historyOfPresentIllness: e.historyOfPresentIllness || "",
      examination: e.examination || "",
      diagnosis: e.diagnosis || "",
      treatmentPlan: e.treatmentPlan || "",
      notes: e.notes || "",
      bloodPressure: e.vitals.bloodPressure || "",
      heartRate: e.vitals.heartRate?.toString() || "",
      temperatureC: e.vitals.temperatureC?.toString() || "",
      respiratoryRate: e.vitals.respiratoryRate?.toString() || "",
      spo2: e.vitals.spo2?.toString() || "",
      weightKg: e.vitals.weightKg?.toString() || "",
      heightCm: e.vitals.heightCm?.toString() || "",
      painScore: e.vitals.painScore?.toString() || "",
    });
    setShowForm(true);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.patientId) {
      alert("Please select a patient.");
      return;
    }
    const payload = {
      patientId: form.patientId,
      type: form.type,
      doctorName: form.doctorName,
      department: form.department,
      chiefComplaint: form.chiefComplaint,
      historyOfPresentIllness: form.historyOfPresentIllness,
      examination: form.examination,
      diagnosis: form.diagnosis,
      treatmentPlan: form.treatmentPlan,
      notes: form.notes,
      vitals: formVitals(form),
    };
    const res = await fetch("/api/encounters", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
    });
    if (res.ok) {
      resetForm();
      loadEncounters();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Save failed");
    }
  }

  async function updateStatus(e: Encounter, status: EncounterStatus) {
    await fetch("/api/encounters", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: e.id, status }),
    });
    loadEncounters();
  }

  async function remove(e: Encounter) {
    if (!confirm("Delete this encounter? This cannot be undone.")) return;
    await fetch("/api/encounters", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: e.id }),
    });
    loadEncounters();
  }

  if (error === "no_active_org") {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-2">Encounters</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mt-4">
          <p className="text-amber-900 font-medium mb-1">No active organization</p>
          <p className="text-sm text-amber-800">
            Select an organization from the switcher in the top bar to manage encounters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Encounters</h1>
          <p className="text-sm text-gray-500">
            Patient visits — OPD, IPD, emergency, follow-up, telemedicine.
          </p>
        </div>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          disabled={patients.length === 0}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {showForm ? "Cancel" : "+ New encounter"}
        </button>
      </div>

      {patients.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-900">
          No patients in this org yet.{" "}
          <a href="/admin/patients" className="underline font-medium">Add a patient</a>{" "}
          before creating encounters.
        </div>
      )}

      {showForm && (
        <form
          onSubmit={submit}
          className="bg-white border border-gray-200 rounded-xl p-5 mb-8 shadow-sm space-y-4"
        >
          <h2 className="font-semibold text-lg">
            {editingId ? "Edit encounter" : "New encounter"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Patient *</label>
              <select
                value={form.patientId}
                onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                required
                disabled={!!editingId}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100"
              >
                <option value="">— Select patient —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} · {p.mrn}
                  </option>
                ))}
              </select>
            </div>
            <Select
              label="Type *"
              value={form.type}
              options={TYPES}
              onChange={(v) => setForm({ ...form, type: v as EncounterType })}
            />
            <Input
              label="Department"
              value={form.department}
              onChange={(v) => setForm({ ...form, department: v })}
            />
            <Input
              label="Doctor"
              value={form.doctorName}
              onChange={(v) => setForm({ ...form, doctorName: v })}
            />
            <Input
              label="Chief complaint"
              value={form.chiefComplaint}
              onChange={(v) => setForm({ ...form, chiefComplaint: v })}
            />
            <Input
              label="Diagnosis"
              value={form.diagnosis}
              onChange={(v) => setForm({ ...form, diagnosis: v })}
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 mt-2">Vitals</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input
                label="BP (e.g. 120/80)"
                value={form.bloodPressure}
                onChange={(v) => setForm({ ...form, bloodPressure: v })}
              />
              <Input
                label="HR (bpm)"
                value={form.heartRate}
                onChange={(v) => setForm({ ...form, heartRate: v })}
              />
              <Input
                label="Temp (°C)"
                value={form.temperatureC}
                onChange={(v) => setForm({ ...form, temperatureC: v })}
              />
              <Input
                label="SpO₂ (%)"
                value={form.spo2}
                onChange={(v) => setForm({ ...form, spo2: v })}
              />
              <Input
                label="RR"
                value={form.respiratoryRate}
                onChange={(v) => setForm({ ...form, respiratoryRate: v })}
              />
              <Input
                label="Weight (kg)"
                value={form.weightKg}
                onChange={(v) => setForm({ ...form, weightKg: v })}
              />
              <Input
                label="Height (cm)"
                value={form.heightCm}
                onChange={(v) => setForm({ ...form, heightCm: v })}
              />
              <Input
                label="Pain (0–10)"
                value={form.painScore}
                onChange={(v) => setForm({ ...form, painScore: v })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextArea
              label="History of present illness"
              value={form.historyOfPresentIllness}
              onChange={(v) => setForm({ ...form, historyOfPresentIllness: v })}
            />
            <TextArea
              label="Examination"
              value={form.examination}
              onChange={(v) => setForm({ ...form, examination: v })}
            />
            <TextArea
              label="Treatment plan"
              value={form.treatmentPlan}
              onChange={(v) => setForm({ ...form, treatmentPlan: v })}
            />
            <TextArea
              label="Notes"
              value={form.notes}
              onChange={(v) => setForm({ ...form, notes: v })}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
            >
              {editingId ? "Save changes" : "Create encounter"}
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
        <div className="flex gap-1 flex-wrap">
          {(["all", ...TYPES] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                typeFilter === t
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                statusFilter === s
                  ? "bg-emerald-600 text-white"
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
        ) : encounters.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No encounters match the current filters.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Patient</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Doctor</th>
                <th className="px-4 py-2">Diagnosis</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {encounters.map((e) => {
                const p = patientsById.get(e.patientId);
                return (
                  <tr
                    key={e.id}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                      {new Date(e.startedAt).toLocaleDateString()}
                      <br />
                      <span className="text-gray-400">
                        {new Date(e.startedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {p ? (
                        <>
                          <div className="font-medium">
                            {p.firstName} {p.lastName}
                          </div>
                          <div className="text-xs font-mono text-gray-400">{p.mrn}</div>
                        </>
                      ) : (
                        <span className="text-gray-400 italic">unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium uppercase">
                        {e.type}
                      </span>
                    </td>
                    <td className="px-4 py-2">{e.doctorName || "—"}</td>
                    <td className="px-4 py-2 max-w-xs truncate" title={e.diagnosis}>
                      {e.diagnosis || "—"}
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={e.status}
                        onChange={(ev) =>
                          updateStatus(e, ev.target.value as EncounterStatus)
                        }
                        className="text-xs px-2 py-1 border border-gray-200 rounded"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => loadForEdit(e)}
                        className="text-blue-600 hover:underline mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(e)}
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
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

function Select({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function TextArea({
  label, value, onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
      />
    </div>
  );
}
