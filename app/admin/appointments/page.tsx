"use client";

import { useEffect, useMemo, useState } from "react";

export const dynamic = "force-dynamic";

type AppointmentType =
  | "consultation"
  | "follow_up"
  | "procedure"
  | "telemedicine"
  | "vaccination"
  | "lab_review"
  | "other";

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

interface Appointment {
  id: string;
  appointmentNumber: string;
  patientId: string;
  providerId: string;
  type: AppointmentType;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
  room?: string;
  notes?: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn?: string;
}

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  specialty?: string;
  department?: string;
  status: string;
}

const TYPE_LABEL: Record<AppointmentType, string> = {
  consultation: "Consultation",
  follow_up: "Follow-up",
  procedure: "Procedure",
  telemedicine: "Telemedicine",
  vaccination: "Vaccination",
  lab_review: "Lab Review",
  other: "Other",
};

const TYPE_COLOR: Record<AppointmentType, string> = {
  consultation: "bg-blue-50 text-blue-700 border-blue-200",
  follow_up: "bg-sky-50 text-sky-700 border-sky-200",
  procedure: "bg-red-50 text-red-700 border-red-200",
  telemedicine: "bg-violet-50 text-violet-700 border-violet-200",
  vaccination: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lab_review: "bg-amber-50 text-amber-700 border-amber-200",
  other: "bg-slate-50 text-slate-700 border-slate-200",
};

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  scheduled: "bg-slate-100 text-slate-700 border-slate-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  checked_in: "bg-amber-100 text-amber-700 border-amber-200",
  in_progress: "bg-violet-100 text-violet-700 border-violet-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
  no_show: "bg-gray-200 text-gray-700 border-gray-300",
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AppointmentsPage() {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentStatus>(
    "all"
  );

  const [form, setForm] = useState({
    patientId: "",
    providerId: "",
    type: "consultation" as AppointmentType,
    date: todayISO(),
    startTime: "10:00",
    durationMin: "15",
    endTime: "",
    reason: "",
    room: "",
    notes: "",
  });

  const resetForm = () => {
    setForm({
      patientId: "",
      providerId: "",
      type: "consultation",
      date: date,
      startTime: "10:00",
      durationMin: "15",
      endTime: "",
      reason: "",
      room: "",
      notes: "",
    });
    setEditingId(null);
  };

  async function loadAll() {
    setLoading(true);
    try {
      const [aRes, pRes, sRes] = await Promise.all([
        fetch(`/api/hospital/appointments?dateFrom=${date}&dateTo=${date}`),
        fetch("/api/patients"),
        fetch("/api/hospital/staff"),
      ]);
      const aJson = await aRes.json();
      const pJson = await pRes.json();
      const sJson = await sRes.json();
      setAppts(aJson.appointments || []);
      setPatients(pJson.patients || []);
      setStaff(sJson.staff || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const providers = useMemo(
    () =>
      staff.filter(
        (s) =>
          s.status === "active" &&
          (s.role === "doctor" ||
            s.role === "resident" ||
            s.role === "nurse")
      ),
    [staff]
  );

  const patientLabel = (id: string) => {
    const p = patients.find((x) => x.id === id);
    return p ? `${p.firstName} ${p.lastName}${p.mrn ? ` (${p.mrn})` : ""}` : id;
  };

  const providerLabel = (id: string) => {
    const s = staff.find((x) => x.id === id);
    return s
      ? `${s.role === "doctor" ? "Dr. " : ""}${s.firstName} ${s.lastName}${s.specialty ? ` · ${s.specialty}` : ""}`
      : id;
  };

  const filtered = useMemo(() => {
    return appts.filter((a) => {
      if (providerFilter !== "all" && a.providerId !== providerFilter)
        return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      return true;
    });
  }, [appts, providerFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: appts.length,
      scheduled: appts.filter(
        (a) => a.status === "scheduled" || a.status === "confirmed"
      ).length,
      checkedIn: appts.filter((a) => a.status === "checked_in").length,
      completed: appts.filter((a) => a.status === "completed").length,
      noShow: appts.filter((a) => a.status === "no_show").length,
    };
  }, [appts]);

  async function submit() {
    const payload: any = {
      patientId: form.patientId,
      providerId: form.providerId,
      type: form.type,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime || undefined,
      durationMin: form.durationMin ? Number(form.durationMin) : undefined,
      reason: form.reason || undefined,
      room: form.room || undefined,
      notes: form.notes || undefined,
    };
    if (editingId) payload.id = editingId;

    const res = await fetch("/api/hospital/appointments", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    if (res.ok) {
      resetForm();
      setShowForm(false);
      loadAll();
    } else if (j.error === "slot_conflict" && j.conflict) {
      alert(
        `Slot conflict with appointment ${j.conflict.appointmentNumber} at ${j.conflict.startTime}–${j.conflict.endTime}`
      );
    } else if (j.error === "invalid_time_range") {
      alert("End time must be after start time.");
    } else {
      alert(j.error || "Failed");
    }
  }

  function startEdit(a: Appointment) {
    setEditingId(a.id);
    setShowForm(true);
    setForm({
      patientId: a.patientId,
      providerId: a.providerId,
      type: a.type,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
      durationMin: "",
      reason: a.reason || "",
      room: a.room || "",
      notes: a.notes || "",
    });
  }

  async function del(id: string) {
    if (!confirm("Delete this appointment?")) return;
    const res = await fetch("/api/hospital/appointments", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) loadAll();
  }

  async function setStatus(id: string, status: AppointmentStatus) {
    await fetch("/api/hospital/appointments", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    loadAll();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="text-sm text-slate-500">
            OPD scheduling with provider conflict detection.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {showForm ? "Close" : "+ New Appointment"}
        </button>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Today total" value={stats.total} />
        <StatCard label="Scheduled" value={stats.scheduled} accent="blue" />
        <StatCard label="Checked-in" value={stats.checkedIn} accent="amber" />
        <StatCard label="Completed" value={stats.completed} accent="emerald" />
        <StatCard label="No-show" value={stats.noShow} accent="rose" />
      </div>

      {/* date nav */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setDate(shiftDate(date, -1))}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          ← Prev
        </button>
        <button
          onClick={() => setDate(todayISO())}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Today
        </button>
        <button
          onClick={() => setDate(shiftDate(date, 1))}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Next →
        </button>
        <input
          type="date"
          className="input max-w-[180px]"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <select
          className="input max-w-[220px]"
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
        >
          <option value="all">All providers</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {providerLabel(p.id)}
            </option>
          ))}
        </select>
        <select
          className="input max-w-[180px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
          <option value="all">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked-in</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No-show</option>
        </select>
      </div>

      {/* form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            {editingId ? "Edit appointment" : "New appointment"}
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Patient *">
              <select
                className="input"
                value={form.patientId}
                onChange={(e) =>
                  setForm({ ...form, patientId: e.target.value })
                }
              >
                <option value="">— select —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} {p.mrn ? `(${p.mrn})` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Provider *">
              <select
                className="input"
                value={form.providerId}
                onChange={(e) =>
                  setForm({ ...form, providerId: e.target.value })
                }
              >
                <option value="">— select —</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {providerLabel(p.id)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Type">
              <select
                className="input"
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as AppointmentType })
                }
              >
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date *">
              <input
                type="date"
                className="input"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
            <Field label="Start time *">
              <input
                type="time"
                className="input"
                value={form.startTime}
                onChange={(e) =>
                  setForm({ ...form, startTime: e.target.value })
                }
              />
            </Field>
            <Field label={editingId ? "End time" : "Duration (min)"}>
              {editingId ? (
                <input
                  type="time"
                  className="input"
                  value={form.endTime}
                  onChange={(e) =>
                    setForm({ ...form, endTime: e.target.value })
                  }
                />
              ) : (
                <select
                  className="input"
                  value={form.durationMin}
                  onChange={(e) =>
                    setForm({ ...form, durationMin: e.target.value })
                  }
                >
                  <option value="10">10 min</option>
                  <option value="15">15 min</option>
                  <option value="20">20 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                </select>
              )}
            </Field>
            <Field label="Room">
              <input
                className="input"
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                placeholder="OPD-3"
              />
            </Field>
            <Field label="Reason" className="md:col-span-2">
              <input
                className="input"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Chest pain review, post-op f/u..."
              />
            </Field>
            <Field label="Notes" className="md:col-span-3">
              <textarea
                className="input min-h-[70px]"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={submit}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              {editingId ? "Save changes" : "Book appointment"}
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* list */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
          Schedule — {date}
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No appointments for this date. Click &ldquo;+ New Appointment&rdquo; to book one.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-[90px] font-mono text-sm font-semibold text-slate-900">
                  {a.startTime}
                  <span className="text-slate-400"> – </span>
                  {a.endTime}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      {patientLabel(a.patientId)}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${TYPE_COLOR[a.type]}`}
                    >
                      {TYPE_LABEL[a.type]}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_COLOR[a.status]}`}
                    >
                      {a.status.replace("_", " ")}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {a.appointmentNumber}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {providerLabel(a.providerId)}
                    {a.room ? ` · Room ${a.room}` : ""}
                    {a.reason ? ` · ${a.reason}` : ""}
                  </div>
                </div>
                <select
                  className="input max-w-[150px] text-xs"
                  value={a.status}
                  onChange={(e) =>
                    setStatus(a.id, e.target.value as AppointmentStatus)
                  }
                >
                  <option value="scheduled">scheduled</option>
                  <option value="confirmed">confirmed</option>
                  <option value="checked_in">checked-in</option>
                  <option value="in_progress">in progress</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                  <option value="no_show">no-show</option>
                </select>
                <button
                  onClick={() => startEdit(a)}
                  className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => del(a.id)}
                  className="rounded-lg border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(203 213 225);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: white;
          color: rgb(15 23 42);
        }
        :global(.input:focus) {
          outline: none;
          border-color: rgb(71 85 105);
          box-shadow: 0 0 0 2px rgb(148 163 184 / 0.2);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: "blue" | "amber" | "emerald" | "rose";
}) {
  const color =
    accent === "blue"
      ? "text-blue-700"
      : accent === "amber"
      ? "text-amber-700"
      : accent === "emerald"
      ? "text-emerald-700"
      : accent === "rose"
      ? "text-rose-700"
      : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
