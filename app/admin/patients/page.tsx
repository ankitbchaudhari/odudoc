"use client";

import { useEffect, useState } from "react";
import type { Patient, Gender, BloodGroup } from "@/lib/patients-store";

const GENDERS: Gender[] = ["male", "female", "other", "unknown"];
const BLOODS: BloodGroup[] = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown",
];
const STATUSES: Patient["status"][] = ["active", "discharged", "deceased"];

interface FormState {
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string;
  phone: string;
  email: string;
  addressLine1: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  bloodGroup: BloodGroup;
  allergies: string;
  chronicConditions: string;
  currentMedications: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  gender: "unknown",
  dateOfBirth: "",
  phone: "",
  email: "",
  addressLine1: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  bloodGroup: "unknown",
  allergies: "",
  chronicConditions: "",
  currentMedications: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelation: "",
  insuranceProvider: "",
  insurancePolicyNumber: "",
  notes: "",
};

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Patient["status"] | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/patients?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "failed");
        setPatients([]);
      } else {
        setError(null);
        setPatients(data.patients || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  }

  function loadForEdit(p: Patient) {
    setEditingId(p.id);
    setForm({
      firstName: p.firstName,
      lastName: p.lastName,
      gender: p.gender,
      dateOfBirth: p.dateOfBirth || "",
      phone: p.phone || "",
      email: p.email || "",
      addressLine1: p.addressLine1 || "",
      city: p.city || "",
      state: p.state || "",
      country: p.country || "",
      postalCode: p.postalCode || "",
      bloodGroup: p.bloodGroup,
      allergies: p.allergies.join(", "),
      chronicConditions: p.chronicConditions.join(", "),
      currentMedications: p.currentMedications.join(", "),
      emergencyContactName: p.emergencyContactName || "",
      emergencyContactPhone: p.emergencyContactPhone || "",
      emergencyContactRelation: p.emergencyContactRelation || "",
      insuranceProvider: p.insuranceProvider || "",
      insurancePolicyNumber: p.insurancePolicyNumber || "",
      notes: p.notes || "",
    });
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      allergies: form.allergies.split(",").map((s) => s.trim()).filter(Boolean),
      chronicConditions: form.chronicConditions.split(",").map((s) => s.trim()).filter(Boolean),
      currentMedications: form.currentMedications.split(",").map((s) => s.trim()).filter(Boolean),
    };
    const res = await fetch("/api/patients", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
    });
    if (res.ok) {
      resetForm();
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Save failed");
    }
  }

  async function updateStatus(p: Patient, status: Patient["status"]) {
    await fetch("/api/patients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, status }),
    });
    load();
  }

  async function remove(p: Patient) {
    if (!confirm(`Delete patient ${p.firstName} ${p.lastName} (${p.mrn})?`)) return;
    await fetch("/api/patients", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id }),
    });
    load();
  }

  if (error === "no_active_org") {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-2">Patients</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mt-4">
          <p className="text-amber-900 font-medium mb-1">No active organization</p>
          <p className="text-sm text-amber-800">
            Select an organization from the org switcher (or create one under{" "}
            <a href="/admin/organizations" className="underline">Organizations</a>)
            to manage patients.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Patients</h1>
          <p className="text-sm text-gray-500">
            Tenant-scoped medical records. MRN is auto-assigned per organization.
          </p>
        </div>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "+ New patient"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="bg-white border border-gray-200 rounded-xl p-5 mb-8 shadow-sm space-y-4"
        >
          <h2 className="font-semibold text-lg">
            {editingId ? "Edit patient" : "New patient"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input label="First name *" value={form.firstName}
              onChange={(v) => setForm({ ...form, firstName: v })} required />
            <Input label="Last name *" value={form.lastName}
              onChange={(v) => setForm({ ...form, lastName: v })} required />
            <Select label="Gender *" value={form.gender} options={GENDERS}
              onChange={(v) => setForm({ ...form, gender: v as Gender })} />
            <Input type="date" label="Date of birth" value={form.dateOfBirth}
              onChange={(v) => setForm({ ...form, dateOfBirth: v })} />
            <Input label="Phone" value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })} />
            <Input type="email" label="Email" value={form.email}
              onChange={(v) => setForm({ ...form, email: v })} />
            <Select label="Blood group" value={form.bloodGroup} options={BLOODS}
              onChange={(v) => setForm({ ...form, bloodGroup: v as BloodGroup })} />
            <Input label="City" value={form.city}
              onChange={(v) => setForm({ ...form, city: v })} />
            <Input label="Country" value={form.country}
              onChange={(v) => setForm({ ...form, country: v })} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input label="Allergies (comma-separated)" value={form.allergies}
              onChange={(v) => setForm({ ...form, allergies: v })} />
            <Input label="Chronic conditions" value={form.chronicConditions}
              onChange={(v) => setForm({ ...form, chronicConditions: v })} />
            <Input label="Current medications" value={form.currentMedications}
              onChange={(v) => setForm({ ...form, currentMedications: v })} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input label="Emergency contact name" value={form.emergencyContactName}
              onChange={(v) => setForm({ ...form, emergencyContactName: v })} />
            <Input label="Emergency contact phone" value={form.emergencyContactPhone}
              onChange={(v) => setForm({ ...form, emergencyContactPhone: v })} />
            <Input label="Relationship" value={form.emergencyContactRelation}
              onChange={(v) => setForm({ ...form, emergencyContactRelation: v })} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Insurance provider" value={form.insuranceProvider}
              onChange={(v) => setForm({ ...form, insuranceProvider: v })} />
            <Input label="Policy number" value={form.insurancePolicyNumber}
              onChange={(v) => setForm({ ...form, insurancePolicyNumber: v })} />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Notes</label>
            <textarea
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-2">
            <button type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700">
              {editingId ? "Save changes" : "Create patient"}
            </button>
            <button type="button" onClick={resetForm}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search by name, MRN, phone, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1 min-w-[240px]"
        />
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
        ) : patients.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No patients yet. Click <span className="font-medium">+ New patient</span> to add one.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2">MRN</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Gender</th>
                <th className="px-4 py-2">DOB</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{p.mrn}</td>
                  <td className="px-4 py-2 font-medium">
                    {p.firstName} {p.lastName}
                  </td>
                  <td className="px-4 py-2 capitalize">{p.gender}</td>
                  <td className="px-4 py-2">{p.dateOfBirth || "—"}</td>
                  <td className="px-4 py-2">{p.phone || "—"}</td>
                  <td className="px-4 py-2">
                    <select
                      value={p.status}
                      onChange={(e) =>
                        updateStatus(p, e.target.value as Patient["status"])
                      }
                      className="text-xs px-2 py-1 border border-gray-200 rounded"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => loadForEdit(p)}
                      className="text-blue-600 hover:underline mr-3">Edit</button>
                    <button onClick={() => remove(p)}
                      className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Input({
  label, value, onChange, type = "text", required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        required={required}
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
