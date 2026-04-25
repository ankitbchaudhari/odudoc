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

const STATUS_STYLES: Record<StaffStatus, { pill: string; dot: string }> = {
  active: { pill: "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  on_leave: { pill: "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  inactive: { pill: "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
};

const ROLE_STYLES: Record<StaffRole, { pill: string; dot: string }> = {
  doctor: { pill: "bg-gradient-to-r from-rose-50 to-pink-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  resident: { pill: "bg-gradient-to-r from-fuchsia-50 to-pink-50 text-fuchsia-700 ring-fuchsia-200", dot: "bg-fuchsia-500" },
  nurse: { pill: "bg-gradient-to-r from-sky-50 to-blue-50 text-blue-700 ring-blue-200", dot: "bg-blue-500" },
  technician: { pill: "bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 ring-violet-200", dot: "bg-violet-500" },
  pharmacist: { pill: "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  radiographer: { pill: "bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-700 ring-cyan-200", dot: "bg-cyan-500" },
  admin: { pill: "bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 ring-indigo-200", dot: "bg-indigo-500" },
  housekeeping: { pill: "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  other: { pill: "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
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

  const TILE_THEMES: Array<{ label: string; value: number; gradient: string; ring: string; text: string; dot: string }> = [
    { label: "Total", value: counts.total, gradient: "from-rose-50 to-pink-50", ring: "ring-rose-200", text: "text-rose-700", dot: "bg-rose-500" },
    { label: "Active", value: counts.active, gradient: "from-emerald-50 to-green-50", ring: "ring-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
    { label: "On leave", value: counts.on_leave, gradient: "from-amber-50 to-yellow-50", ring: "ring-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
    { label: "Doctors", value: counts.doctors, gradient: "from-fuchsia-50 to-pink-50", ring: "ring-fuchsia-200", text: "text-fuchsia-700", dot: "bg-fuchsia-500" },
    { label: "Nurses", value: counts.nurses, gradient: "from-sky-50 to-blue-50", ring: "ring-sky-200", text: "text-sky-700", dot: "bg-sky-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-600 via-pink-600 to-fuchsia-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-yellow-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-400" />
              </span>
              {counts.active} active staff · {counts.total} total
            </div>
            <h1 className="text-2xl font-bold">Medical Staff</h1>
            <p className="mt-1 text-sm text-pink-50/90">
              Staff roster — doctors, nurses, technicians, pharmacy & admin.
            </p>
          </div>
          <button
            onClick={() => (showForm ? reset() : setShowForm(true))}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            {showForm ? "✕ Close" : "👥 New staff"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {TILE_THEMES.map((t) => (
          <div key={t.label} className={`rounded-xl bg-gradient-to-br ${t.gradient} p-4 ring-1 ${t.ring} shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}>
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">{t.label}</div>
            </div>
            <div className={`mt-1 text-2xl font-bold ${t.text}`}>{t.value}</div>
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
        <form onSubmit={submit} className="space-y-3 overflow-hidden rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="-mx-5 -mt-5 mb-2 h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500" />
          <h3 className="text-sm font-semibold text-slate-900">{editingId ? "Edit staff" : "New staff"}</h3>
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
            <button type="submit" className="rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md">{editingId ? "Save" : "Create"}</button>
            <button type="button" onClick={reset} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500" />
        <div className="flex flex-wrap items-end gap-3 p-4">
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
          <button onClick={load} className="rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md">Apply</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gradient-to-r from-rose-50/60 via-pink-50/40 to-fuchsia-50/60">
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                <th className="px-4 py-3">Staff</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center text-sm text-gray-400">Loading…</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-sm text-gray-400">👥 No staff.</td></tr>
              ) : (
                list.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-rose-50/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{s.firstName} {s.lastName}</div>
                      {s.specialty && <div className="text-[11px] text-slate-500">{s.specialty}</div>}
                      {s.qualifications && <div className="text-[11px] text-slate-500">{s.qualifications}</div>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.employeeCode}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${ROLE_STYLES[s.role].pill}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${ROLE_STYLES[s.role].dot}`} />
                        {s.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{s.department || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {s.phone || "—"}
                      {s.email && <div>{s.email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${STATUS_STYLES[s.status].pill}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLES[s.status].dot}`} />
                        {s.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => startEdit(s)} className="rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md">Edit</button>
                        <button onClick={() => remove(s.id)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow">Del</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
