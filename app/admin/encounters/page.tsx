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
      <div className="p-4 md:p-8 max-w-7xl">
        <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 p-6 text-white shadow-lg">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-accent-300/20 blur-3xl" />
          <div className="relative">
            <h1 className="text-2xl font-bold">Encounters</h1>
            <p className="mt-1 text-sm text-violet-50/90">
              Patient visits — OPD, IPD, emergency, follow-up, telemedicine.
            </p>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-rose-50 via-amber-50 to-rose-50 shadow-sm ring-1 ring-rose-200/60">
          <div className="h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500" />
          <div className="p-8 text-center">
            <div className="mb-3 text-5xl">🏥</div>
            <h2 className="text-lg font-bold text-rose-900">No active organization</h2>
            <p className="mt-2 text-sm text-rose-800/90">
              Select an organization from the switcher in the top bar to manage encounters.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl">
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-accent-300/20 blur-3xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-400" />
              </span>
              {encounters.length} encounter{encounters.length === 1 ? "" : "s"}
            </div>
            <h1 className="text-2xl font-bold">Encounters</h1>
            <p className="mt-1 text-sm text-violet-50/90">
              Patient visits — OPD, IPD, emergency, follow-up, telemedicine.
            </p>
          </div>
          <button
            onClick={() => (showForm ? resetForm() : setShowForm(true))}
            disabled={patients.length === 0}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showForm ? "Cancel" : "✨ + New encounter"}
          </button>
        </div>
      </div>

      {patients.length === 0 && (
        <div className="overflow-hidden rounded-xl bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 mb-6 ring-1 ring-rose-200/60">
          <div className="h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500" />
          <div className="p-4 text-sm text-rose-900">
            <span className="mr-1">⚠️</span>
            No patients in this org yet.{" "}
            <a href="/admin/patients" className="underline font-semibold">Add a patient</a>{" "}
            before creating encounters.
          </div>
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
              className="rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {editingId ? "💾 Save changes" : "✨ Create encounter"}
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
          {(["all", ...TYPES] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition hover:-translate-y-0.5 ${
                typeFilter === t
                  ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow"
                  : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"
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
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition hover:-translate-y-0.5 ${
                statusFilter === s
                  ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow"
                  : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
        {loading ? (
          <p className="py-16 text-center text-sm text-gray-400">Loading…</p>
        ) : encounters.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">
            🩺 No encounters match the current filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gradient-to-r from-violet-50/60 via-purple-50/40 to-fuchsia-50/60">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Doctor</th>
                  <th className="px-5 py-3">Diagnosis</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {encounters.map((e) => {
                  const p = patientsById.get(e.patientId);
                  const statusStyle =
                    e.status === "open"
                      ? { pill: "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" }
                      : e.status === "closed"
                      ? { pill: "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 ring-slate-200", dot: "bg-slate-500" }
                      : { pill: "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" };
                  return (
                    <tr key={e.id} className="transition-colors hover:bg-violet-50/30">
                      <td className="px-5 py-3 whitespace-nowrap text-xs text-gray-600">
                        {new Date(e.startedAt).toLocaleDateString()}
                        <br />
                        <span className="text-gray-400">
                          {new Date(e.startedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {p ? (
                          <>
                            <div className="font-medium text-gray-900">
                              {p.firstName} {p.lastName}
                            </div>
                            <div className="text-xs font-mono text-gray-400">{p.mrn}</div>
                          </>
                        ) : (
                          <span className="text-gray-400 italic">unknown</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex rounded-full bg-gradient-to-r from-violet-50 to-purple-50 px-2.5 py-1 text-xs font-semibold uppercase text-violet-700 ring-1 ring-violet-200">
                          {e.type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-700">{e.doctorName || "—"}</td>
                      <td className="px-5 py-3 max-w-xs truncate text-gray-700" title={e.diagnosis}>
                        {e.diagnosis || "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${statusStyle.pill}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                          {e.status}
                        </span>
                        <select
                          value={e.status}
                          onChange={(ev) =>
                            updateStatus(e, ev.target.value as EncounterStatus)
                          }
                          className="ml-2 text-xs px-2 py-1 border border-gray-200 rounded bg-white"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => loadForEdit(e)}
                            className="rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => remove(e)}
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
