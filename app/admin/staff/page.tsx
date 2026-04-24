"use client";

import { useEffect, useState } from "react";
import type {
  StaffMember,
  StaffRole,
  StaffStatus,
} from "@/lib/hospital/staff-store";

const ROLES: StaffRole[] = [
  "doctor",
  "resident",
  "nurse",
  "technician",
  "pharmacist",
  "radiographer",
  "admin",
  "housekeeping",
  "other",
];
const STATUSES: StaffStatus[] = ["active", "on_leave", "inactive"];

const STATUS_COLOR: Record<StaffStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  on_leave: "bg-amber-100 text-amber-700",
  inactive: "bg-slate-200 text-slate-600",
};

interface StaffForm {
  firstName: string;
  lastName: string;
  role: StaffRole;
  specialty: string;
  department: string;
  phone: string;
  email: string;
  qualifications: string;
  licenseNumber: string;
  dateOfJoining: string;
  status: StaffStatus;
  notes: string;
}

const EMPTY: StaffForm = {
  firstName: "",
  lastName: "",
  role: "doctor",
  specialty: "",
  department: "",
  phone: "",
  email: "",
  qualifications: "",
  licenseNumber: "",
  dateOfJoining: "",
  status: "active",
  notes: "",
};

export default function StaffPage() {
  const [list, setList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<StaffForm>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (role) q.set("role", role);
      if (status) q.set("status", status);
      const res = await fetch(`/api/hospital/staff?${q.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "load_failed");
      setList(data.staff || []);
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reset() {
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
    };
    const res = await fetch("/api/hospital/staff", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    reset();
    load();
  }

  function startEdit(s: StaffMember) {
    setEditingId(s.id);
    setForm({
      firstName: s.firstName,
      lastName: s.lastName,
      role: s.role,
      specialty: s.specialty || "",
      department: s.department || "",
      phone: s.phone || "",
      email: s.email || "",
      qualifications: s.qualifications || "",
      licenseNumber: s.licenseNumber || "",
      dateOfJoining: s.dateOfJoining || "",
      status: s.status,
      notes: s.notes || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id: string) {
    if (!confirm("Delete this staff member? All their shift assignments will also be purged.")) return;
    const res = await fetch("/api/hospital/staff", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
  }

  const counts = {
    total: list.length,
    active: list.filter((s) => s.status === "active").length,
    on_leave: list.filter((s) => s.status === "on_leave").length,
    doctors: list.filter((s) => s.role === "doctor" || s.role === "resident").length,
    nurses: list.filter((s) => s.role === "nurse").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Medical Staff</h2>
          <p className="text-sm text-slate-500">
            Staff roster — doctors, nurses, technicians, pharmacy & admin.
          </p>
        </div>
        <button
          onClick={() => (showForm ? reset() : setShowForm(true))}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          {showForm ? "Close" : "+ New staff"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {([
          ["Total", counts.total],
          ["Active", counts.active, "text-emerald-600"],
          ["On leave", counts.on_leave, "text-amber-600"],
          ["Doctors", counts.doctors],
          ["Nurses", counts.nurses],
        ] as const).map(([lbl, v, accent]) => (
          <div key={lbl} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">{lbl}</div>
            <div className={`mt-1 text-2xl font-semibold ${accent || "text-slate-900"}`}>{v}</div>
          </div>
        ))}
      </div>

      {err && (
        err === "no_active_org" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">No organization selected.</p>
            <p className="mt-1 text-amber-700">
              Medical Staff is scoped to a hospital or clinic. Pick one from the
              <span className="mx-1 font-semibold">“No org selected”</span>
              dropdown at the top of the page, then come back to this screen.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
        )
      )}

      {showForm && (
        <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold">{editingId ? "Edit staff" : "New staff"}</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="First name*"><input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="input" /></Field>
            <Field label="Last name*"><input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="input" /></Field>
            <Field label="Role*">
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })} className="input">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Specialty"><input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} className="input" placeholder="Cardiology / ER…" /></Field>
            <Field label="Department"><input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="input" /></Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StaffStatus })} className="input">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></Field>
            <Field label="Email"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></Field>
            <Field label="License #"><input value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} className="input" /></Field>
            <Field label="Qualifications"><input value={form.qualifications} onChange={(e) => setForm({ ...form, qualifications: e.target.value })} className="input" placeholder="MBBS, MD" /></Field>
            <Field label="Date of joining"><input type="date" value={form.dateOfJoining} onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })} className="input" /></Field>
            <div className="md:col-span-3">
              <Field label="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input min-h-[50px]" /></Field>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white">{editingId ? "Save" : "Create"}</button>
            <button type="button" onClick={reset} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <Field label="Search"><input value={search} onChange={(e) => setSearch(e.target.value)} className="input w-60" placeholder="name / code / specialty" /></Field>
        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
            <option value="">All</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <button onClick={load} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white">Apply</button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">No staff.</td></tr>
            ) : (
              list.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{s.firstName} {s.lastName}</div>
                    {s.specialty && <div className="text-[11px] text-slate-500">{s.specialty}</div>}
                    {s.qualifications && <div className="text-[11px] text-slate-500">{s.qualifications}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.employeeCode}</td>
                  <td className="px-4 py-3 capitalize text-slate-700">{s.role}</td>
                  <td className="px-4 py-3 text-slate-700">{s.department || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {s.phone || "—"}
                    {s.email && <div>{s.email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLOR[s.status]}`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(s)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">Edit</button>
                      <button onClick={() => remove(s.id)} className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50">Del</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          background: white;
          outline: none;
        }
        .input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
