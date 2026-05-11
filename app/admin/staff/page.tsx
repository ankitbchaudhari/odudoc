"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  StaffMember,
  StaffRole,
  StaffStatus,
  StaffModuleAccess,
} from "@/lib/hospital/staff-store";

// Inlined from staff-store — importing runtime values from that file
// pulls persistent-array → Postgres into the client bundle (server-
// only deps like `tls` and `fs` then break the build). Keep these
// duplicates 1:1 with the store; if the store grows new modules,
// mirror them here.
const STAFF_MODULE_LABELS: Record<StaffModuleAccess, string> = {
  patients: "Patients",
  appointments: "Appointments",
  opd: "OPD Queue",
  ipd: "Admissions / IPD",
  ot: "Surgery / OT",
  pharmacy: "Pharmacy",
  lab: "Lab Orders",
  radiology: "Radiology",
  billing: "Invoices & Billing",
  inventory: "Inventory",
  telemedicine: "Telemedicine",
  physio: "Physiotherapy",
  dental: "Dental",
  cardiology: "Cardiology",
  icu: "ICU / Critical Care",
  wards: "Wards & Beds",
  ambulance: "Ambulance",
  "blood-bank": "Blood Bank",
  mortuary: "Mortuary",
  housekeeping: "Housekeeping",
  reports: "Reports & Audit",
};

const STAFF_ROLE_DEFAULT_ACCESS: Record<StaffRole, StaffModuleAccess[]> = {
  doctor: [
    "patients", "appointments", "opd", "ipd", "ot", "lab", "radiology",
    "telemedicine", "cardiology", "icu", "wards",
  ],
  resident: [
    "patients", "appointments", "opd", "ipd", "lab", "radiology", "wards",
  ],
  nurse: ["patients", "wards", "ipd", "icu", "appointments"],
  technician: ["lab", "radiology", "inventory"],
  pharmacist: ["pharmacy", "inventory"],
  radiographer: ["radiology"],
  admin: [
    "patients", "appointments", "opd", "ipd", "ot", "pharmacy", "lab",
    "radiology", "billing", "inventory", "telemedicine", "physio", "dental",
    "cardiology", "icu", "wards", "ambulance", "blood-bank", "mortuary",
    "housekeeping", "reports",
  ],
  housekeeping: ["housekeeping"],
  other: [],
};

function effectiveModuleAccess(s: Pick<StaffMember, "moduleAccess" | "role">): StaffModuleAccess[] {
  if (Array.isArray(s.moduleAccess)) return s.moduleAccess;
  return STAFF_ROLE_DEFAULT_ACCESS[s.role] ?? [];
}

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
  // Per-module access picks — admin ticks the boxes that match this
  // person's job. A physiotherapist gets ["physio"]; a pharmacist gets
  // ["pharmacy", "inventory"]; an admin gets the lot.
  moduleAccess: StaffModuleAccess[];
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
  moduleAccess: STAFF_ROLE_DEFAULT_ACCESS["doctor"] ?? [],
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

  // Auto-open the create form when arriving from the dashboard
  // Quick add card (deep-links here with ?new=1). Saves the admin a
  // click and keeps the "Add staff" flow at one tap.
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams?.get("new") === "1") {
      setShowForm(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Credentials panel: API surfaces `{ tempPassword, expiresAt,
  // delivery }` on staff create when an email was provided. We hold
  // it here briefly so the admin can copy the password before it
  // disappears — it's only ever in memory, never persisted.
  const [credentials, setCredentials] = useState<{
    email: string;
    tempPassword: string;
    expiresAt: string;
    userCreated: boolean;
    delivery: {
      email: { sent: boolean; reason?: string };
      sms: { sent: boolean; reason?: string };
    };
  } | null>(null);

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
    // Capture credentials surfaced by POST when the new staff record
    // had an email — these include the one-time temp password the
    // admin may need to relay if SMS/email delivery silently fails.
    if (!editingId && data.credentials) {
      setCredentials(data.credentials);
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
      moduleAccess: effectiveModuleAccess(s),
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

      {credentials && (
        <CredentialsPanel
          credentials={credentials}
          onDismiss={() => setCredentials(null)}
        />
      )}

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
            <div className="md:col-span-3">
              <ModuleAccessPicker
                role={form.role}
                value={form.moduleAccess}
                onChange={(next) => setForm({ ...form, moduleAccess: next })}
              />
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
                    <td className="px-4 py-3 text-slate-700">
                      <div>{s.department || "—"}</div>
                      <AccessSummary modules={effectiveModuleAccess(s)} />
                    </td>
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

// Per-staff module access picker. Admin ticks which sections of the
// hospital console this person can use — a physiotherapist gets only
// "Physiotherapy"; a pharmacist gets "Pharmacy + Inventory"; an admin
// gets everything. The role-default + clear-all shortcuts make bulk
// onboarding fast.
function ModuleAccessPicker({
  role,
  value,
  onChange,
}: {
  role: StaffRole;
  value: StaffModuleAccess[];
  onChange: (next: StaffModuleAccess[]) => void;
}) {
  const allKeys = Object.keys(STAFF_MODULE_LABELS) as StaffModuleAccess[];
  const selected = new Set(value);
  function toggle(k: StaffModuleAccess) {
    const next = new Set(selected);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    onChange(Array.from(next));
  }
  function applyRoleDefault() {
    onChange(STAFF_ROLE_DEFAULT_ACCESS[role] ?? []);
  }
  function selectAll() {
    onChange(allKeys);
  }
  function clearAll() {
    onChange([]);
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-indigo-50/40 to-fuchsia-50/30 p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
            Module access · {value.length} of {allKeys.length}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Tick the systems this staff member can open. A physiotherapist needs only Physiotherapy; an admin can keep them all.
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={applyRoleDefault}
            className="rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-50"
          >
            Use role defaults
          </button>
          <button
            type="button"
            onClick={selectAll}
            className="rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-50"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-50"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
        {allKeys.map((k) => {
          const on = selected.has(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggle(k)}
              className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition ${
                on
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className="truncate">{STAFF_MODULE_LABELS[k]}</span>
              <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded ${
                on ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
              }`}>
                {on ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Compact chip that says "Physio + 2 more" for the table — one click
// opens edit so the admin can tweak the picks without scanning a wall
// of toggles. Renders a "Full access" pill when every module is granted.
function AccessSummary({ modules }: { modules: StaffModuleAccess[] }) {
  const allKeys = Object.keys(STAFF_MODULE_LABELS) as StaffModuleAccess[];
  if (modules.length === 0) {
    return (
      <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-500">
        🔒 No module access
      </div>
    );
  }
  if (modules.length >= allKeys.length) {
    return (
      <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
        🌐 Full access ({modules.length})
      </div>
    );
  }
  const first = STAFF_MODULE_LABELS[modules[0]] || modules[0];
  const more = modules.length - 1;
  return (
    <div
      className="mt-1 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-50 to-fuchsia-50 px-2 py-0.5 text-[10.5px] font-semibold text-indigo-700 ring-1 ring-indigo-200"
      title={modules.map((m) => STAFF_MODULE_LABELS[m] || m).join(", ")}
    >
      🛂 {first}{more > 0 ? ` +${more} more` : ""}
    </div>
  );
}

// One-time credentials panel shown immediately after the org admin
// creates a staff member who has an email on file. The new auth
// account auto-receives an email + SMS with the username (their
// email) and a 3-day temporary password; this panel surfaces the
// same temp password locally so the admin can copy it if the
// SMTP/Twilio delivery silently fails. Dismissable; never persisted.
function CredentialsPanel({
  credentials,
  onDismiss,
}: {
  credentials: {
    email: string;
    tempPassword: string;
    expiresAt: string;
    userCreated: boolean;
    delivery: {
      email: { sent: boolean; reason?: string };
      sms: { sent: boolean; reason?: string };
    };
  };
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  function copyTemp() {
    navigator.clipboard.writeText(credentials.tempPassword).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => {},
    );
  }
  const expiresLabel = new Date(credentials.expiresAt).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-700 p-5 text-white shadow-lg">
      <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-yellow-300/20 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.18em] backdrop-blur">
            🔑 Login credentials issued
          </div>
          <h2 className="mt-2 text-lg font-bold">
            {credentials.userCreated ? "Account created" : "Existing account refreshed"} for{" "}
            <span className="underline-offset-2">{credentials.email}</span>
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-white/85">
            Email + SMS with the username (their email) and the temporary password below have been dispatched. They must change this password within 3 days — expires <strong>{expiresLabel}</strong> — or login is blocked until you reissue.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15"
          aria-label="Dismiss credentials panel"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="relative mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/20 backdrop-blur">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-white/75">Username</p>
          <p className="mt-0.5 font-mono text-sm">{credentials.email}</p>
        </div>
        <div className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/20 backdrop-blur">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-white/75">Temporary password · 3-day TTL</p>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p className="font-mono text-sm">{credentials.tempPassword}</p>
            <button
              type="button"
              onClick={copyTemp}
              className="rounded-md bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow transition-transform hover:-translate-y-0.5"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>
      <div className="relative mt-3 flex flex-wrap gap-2 text-[11px]">
        <DeliveryChip kind="📧 Email" ok={credentials.delivery.email.sent} reason={credentials.delivery.email.reason} />
        <DeliveryChip kind="📱 SMS" ok={credentials.delivery.sms.sent} reason={credentials.delivery.sms.reason} />
      </div>
    </div>
  );
}

function DeliveryChip({
  kind,
  ok,
  reason,
}: {
  kind: string;
  ok: boolean;
  reason?: string;
}) {
  const cls = ok
    ? "bg-emerald-100/90 text-emerald-800 ring-emerald-200"
    : "bg-amber-100/90 text-amber-800 ring-amber-200";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-semibold ring-1 ${cls}`}
      title={reason || undefined}
    >
      {kind}
      <span>{ok ? "sent" : reason === "no_phone" ? "no phone" : "queued / skipped"}</span>
    </span>
  );
}
