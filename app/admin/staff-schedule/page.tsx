"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  StaffMember, Shift, StaffRole, Department, ShiftStatus, ShiftType,
} from "@/lib/hospital/staff-schedule-store";
// Inlined from staff-schedule-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const ROLE_LABEL: Record<StaffRole, string> = {
  physician: "Physician", resident: "Resident", nurse: "Nurse", charge_nurse: "Charge nurse",
  cna: "CNA / aide", tech: "Technician", pharmacist: "Pharmacist", therapist: "Therapist",
  admin: "Administrative", support: "Support", other: "Other",
};
const DEPT_LABEL: Record<Department, string> = {
  ed: "Emergency", icu: "ICU", or: "OR / surgery", ward: "Inpatient ward",
  maternity: "Maternity", pediatrics: "Pediatrics", pharmacy: "Pharmacy",
  lab: "Lab", radiology: "Radiology", outpatient: "Outpatient", admin: "Admin", other: "Other",
};
const SHIFT_TYPE_LABEL: Record<ShiftType, string> = {
  day: "Day", evening: "Evening", night: "Night", on_call: "On call", standby: "Standby",
};
function shiftDurationHours(s: Shift): number {
  const ms = new Date(s.endAt).getTime() - new Date(s.startAt).getTime();
  return Math.max(0, Math.round((ms / 3_600_000) * 10) / 10);
}

const ROLES: StaffRole[] = ["physician","resident","nurse","charge_nurse","cna","tech","pharmacist","therapist","admin","support","other"];
const DEPTS: Department[] = ["ed","icu","or","ward","maternity","pediatrics","pharmacy","lab","radiology","outpatient","admin","other"];
const SHIFT_TYPES: ShiftType[] = ["day","evening","night","on_call","standby"];
const STATUSES: ShiftStatus[] = ["scheduled","confirmed","swap_requested","completed","absent","cancelled"];

const STATUS_STYLES: Record<ShiftStatus, { pill: string; dot: string }> = {
  scheduled: { pill: "bg-gradient-to-r from-sky-50 to-blue-50 text-blue-700 ring-blue-200", dot: "bg-blue-500" },
  confirmed: { pill: "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  swap_requested: { pill: "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  completed: { pill: "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
  absent: { pill: "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  cancelled: { pill: "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-500 ring-slate-200 line-through", dot: "bg-slate-400" },
};

const FILTER_THEMES_DEPT: Record<string, string> = {
  all: "from-slate-500 to-gray-600",
  ed: "from-rose-500 to-red-600",
  icu: "from-fuchsia-500 to-pink-600",
  or: "from-violet-500 to-purple-600",
  ward: "from-sky-500 to-blue-600",
  maternity: "from-pink-500 to-rose-600",
  pediatrics: "from-amber-500 to-orange-600",
  pharmacy: "from-emerald-500 to-green-600",
  lab: "from-indigo-500 to-blue-600",
  radiology: "from-cyan-500 to-sky-600",
  outpatient: "from-teal-500 to-cyan-600",
  admin: "from-slate-500 to-gray-600",
  other: "from-slate-500 to-gray-600",
};
const FILTER_THEMES_STATUS: Record<string, string> = {
  all: "from-slate-500 to-gray-600",
  scheduled: "from-sky-500 to-blue-600",
  confirmed: "from-emerald-500 to-green-600",
  swap_requested: "from-amber-500 to-orange-600",
  completed: "from-slate-500 to-gray-600",
  absent: "from-rose-500 to-red-600",
  cancelled: "from-slate-500 to-gray-600",
};

function toLocal(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmt(iso?: string) { return iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"; }

export default function StaffSchedulePage() {
  const [tab, setTab] = useState<"roster" | "staff">("roster");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [filterDept, setFilterDept] = useState<Department | "">("");
  const [filterStatus, setFilterStatus] = useState<ShiftStatus | "">("");
  const [weekOffset, setWeekOffset] = useState(0);

  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editShift, setEditShift] = useState<Shift | null>(null);

  const weekStart = useMemo(() => {
    const now = new Date();
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + weekOffset * 7);
    return s;
  }, [weekOffset]);
  const weekEnd = useMemo(() => new Date(weekStart.getTime() + 7 * 86_400_000), [weekStart]);

  async function load() {
    setLoading(true);
    const pS = new URLSearchParams();
    if (filterDept) pS.set("department", filterDept);
    const sh = new URLSearchParams();
    if (filterDept) sh.set("department", filterDept);
    if (filterStatus) sh.set("status", filterStatus);
    sh.set("from", weekStart.toISOString());
    sh.set("to", weekEnd.toISOString());
    const [sR, fR] = await Promise.all([
      fetch(`/api/hospital/staff-schedule?${pS.toString()}`, { cache: "no-store" }),
      fetch(`/api/hospital/staff-schedule/shifts?${sh.toString()}`, { cache: "no-store" }),
    ]);
    if (sR.ok) { const d = await sR.json(); setStaff(d.staff || []); setStats(d.stats); }
    if (fR.ok) { const d = await fR.json(); setShifts(d.shifts || []); }
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterDept, filterStatus, weekOffset]);

  async function saveStaff(body: Partial<StaffMember>) {
    const method = body.id ? "PATCH" : "POST";
    const r = await fetch("/api/hospital/staff-schedule", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); alert(d.error || "Failed"); return; }
    setShowStaffForm(false); setEditStaff(null); load();
  }
  async function deleteStaff(id: string) {
    if (!confirm("Delete this staff member? Future shifts will be cancelled.")) return;
    await fetch("/api/hospital/staff-schedule", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }
  async function saveShift(body: Partial<Shift>) {
    const method = body.id ? "PATCH" : "POST";
    const r = await fetch("/api/hospital/staff-schedule/shifts", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); alert(d.error || "Failed"); return; }
    setShowShiftForm(false); setEditShift(null); load();
  }
  async function updateShiftStatus(id: string, status: ShiftStatus) {
    await fetch("/api/hospital/staff-schedule/shifts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    load();
  }
  async function deleteShift(id: string) {
    if (!confirm("Delete this shift?")) return;
    await fetch("/api/hospital/staff-schedule/shifts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  const byDay = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart.getTime() + i * 86_400_000);
      map.set(d.toDateString(), []);
    }
    for (const s of shifts) {
      const d = new Date(s.startAt).toDateString();
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(s);
    }
    return map;
  }, [shifts, weekStart]);

  const weekShiftsCount = shifts.length;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-cyan-600 to-sky-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {weekShiftsCount} shifts this week{stats ? ` · ${stats.onNow} on duty` : ""}
            </div>
            <h1 className="text-2xl font-bold">Staff scheduling</h1>
            <p className="mt-1 text-sm text-cyan-50/90">Staff master, weekly rosters, shift assignments, swaps and overtime monitoring.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setEditStaff(null); setShowStaffForm(true); }} className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-white/30 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/25">➕ Staff</button>
            <button onClick={() => { setEditShift(null); setShowShiftForm(true); }} className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-teal-700 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">➕ Shift</button>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <Stat label="Active staff" value={stats.activeStaff} tone="teal" />
          <Stat label="Shifts today" value={stats.shiftsToday} tone="cyan" />
          <Stat label="On duty now" value={stats.onNow} tone="emerald" />
          <Stat label="On call now" value={stats.onCallNow} tone="sky" />
          <Stat label="Week hours" value={stats.weekHours} tone="indigo" />
          <Stat label="Swap requests" value={stats.swapRequests} tone={stats.swapRequests > 0 ? "amber" : "slate"} />
          <Stat label="Absences (wk)" value={stats.absencesWeek} tone={stats.absencesWeek > 0 ? "rose" : "slate"} />
          <Stat label="Overtime (>50h)" value={stats.overtime} tone={stats.overtime > 0 ? "amber" : "slate"} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(["roster","staff"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition hover:-translate-y-0.5 ${
              tab === t
                ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
                : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"
            }`}
          >
            {t === "roster" ? "Roster" : "Staff directory"}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500" />
        <div className="flex flex-wrap items-center gap-2 p-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dept</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterDept("")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition hover:-translate-y-0.5 ${filterDept === "" ? `bg-gradient-to-r ${FILTER_THEMES_DEPT.all} text-white shadow` : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"}`}
            >All</button>
            {DEPTS.map((d) => (
              <button
                key={d}
                onClick={() => setFilterDept(d)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition hover:-translate-y-0.5 ${filterDept === d ? `bg-gradient-to-r ${FILTER_THEMES_DEPT[d] || "from-slate-500 to-gray-600"} text-white shadow` : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"}`}
              >{DEPT_LABEL[d]}</button>
            ))}
          </div>
          {tab === "roster" && (
            <>
              <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setFilterStatus("")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition hover:-translate-y-0.5 ${filterStatus === "" ? `bg-gradient-to-r ${FILTER_THEMES_STATUS.all} text-white shadow` : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"}`}
                >All</button>
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition hover:-translate-y-0.5 ${filterStatus === s ? `bg-gradient-to-r ${FILTER_THEMES_STATUS[s] || "from-slate-500 to-gray-600"} text-white shadow` : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"}`}
                  >{s.replace(/_/g, " ")}</button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => setWeekOffset(weekOffset - 1)} className="rounded-lg bg-gradient-to-r from-slate-500 to-gray-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md">← Prev</button>
                <span className="text-sm font-medium text-slate-700">{weekStart.toLocaleDateString()} – {new Date(weekEnd.getTime() - 86_400_000).toLocaleDateString()}</span>
                <button onClick={() => setWeekOffset(weekOffset + 1)} className="rounded-lg bg-gradient-to-r from-slate-500 to-gray-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md">Next →</button>
                <button onClick={() => setWeekOffset(0)} className="rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md">Today</button>
              </div>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white p-16 text-center text-sm text-gray-400 shadow-sm ring-1 ring-gray-100">Loading…</div>
      ) : tab === "roster" ? (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-7">
          {Array.from(byDay.entries()).map(([day, list]) => (
            <div key={day} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
              <div className="h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500" />
              <div className="p-2">
                <div className="text-xs font-semibold text-slate-900">{day}</div>
                <div className="mt-1 space-y-1">
                  {list.length === 0 && <div className="text-xs text-slate-400">📅 —</div>}
                  {list.map((s) => (
                    <div key={s.id} className="rounded-md bg-gradient-to-br from-cyan-50/50 to-sky-50/40 p-1.5 ring-1 ring-cyan-100">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${STATUS_STYLES[s.status].pill}`}>
                          <span className={`h-1 w-1 rounded-full ${STATUS_STYLES[s.status].dot}`} />
                          {s.status.replace(/_/g, " ")}
                        </span>
                        <span className="rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-200">{SHIFT_TYPE_LABEL[s.shiftType]}</span>
                      </div>
                      <div className="mt-0.5 text-xs font-semibold text-slate-900">{s.staffName}</div>
                      <div className="text-[11px] text-slate-500">{ROLE_LABEL[s.role]} · {DEPT_LABEL[s.department]}</div>
                      <div className="text-[11px] text-slate-500">{fmt(s.startAt)} – {fmt(s.endAt)} ({shiftDurationHours(s)}h)</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.status === "scheduled" && <button onClick={() => updateShiftStatus(s.id, "confirmed")} className="rounded-md bg-gradient-to-r from-emerald-500 to-green-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md">✓ Confirm</button>}
                        {s.status !== "completed" && s.status !== "cancelled" && <button onClick={() => updateShiftStatus(s.id, "swap_requested")} className="rounded-md bg-gradient-to-r from-amber-500 to-orange-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md">Swap</button>}
                        {s.status !== "completed" && <button onClick={() => updateShiftStatus(s.id, "absent")} className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-100">Absent</button>}
                        <button onClick={() => { setEditShift(s); setShowShiftForm(true); }} className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-50">Edit</button>
                        <button onClick={() => deleteShift(s.id)} className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-100">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {staff.length === 0 && <div className="rounded-xl bg-white py-16 text-center text-sm text-gray-400 shadow-sm ring-1 ring-gray-100">👥 No staff yet.</div>}
          {staff.map((m) => (
            <div key={m.id} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500" />
              <div className="flex flex-wrap items-center gap-3 p-3">
                <div className="flex-1 min-w-[240px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-50 to-blue-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />{ROLE_LABEL[m.role]}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-cyan-50 to-sky-50 px-2 py-0.5 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-200"><span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />{DEPT_LABEL[m.department]}</span>
                    {!m.isActive && <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-50 to-red-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" />Inactive</span>}
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">{m.firstName} {m.lastName}</div>
                  <div className="text-xs text-slate-500">{m.id}{m.employeeCode ? ` · ${m.employeeCode}` : ""}{m.phone ? ` · ${m.phone}` : ""}{m.email ? ` · ${m.email}` : ""}{m.license ? ` · lic ${m.license}` : ""}</div>
                </div>
                <button onClick={() => { setEditStaff(m); setShowStaffForm(true); }} className="rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md">Edit</button>
                <button onClick={() => deleteStaff(m.id)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showStaffForm && <StaffFormModal member={editStaff} onClose={() => { setShowStaffForm(false); setEditStaff(null); }} onSave={saveStaff} />}
      {showShiftForm && <ShiftFormModal shift={editShift} staff={staff} onClose={() => { setShowShiftForm(false); setEditShift(null); }} onSave={saveShift} />}
    </div>
  );
}

function Stat({ label, value, tone = "slate" }: { label: string; value: number | string; tone?: "slate" | "amber" | "rose" | "emerald" | "teal" | "cyan" | "sky" | "indigo" }) {
  const themes: Record<string, { grad: string; ring: string; text: string; dot: string }> = {
    slate: { grad: "from-slate-50 to-gray-50", ring: "ring-slate-200", text: "text-slate-700", dot: "bg-slate-400" },
    amber: { grad: "from-amber-50 to-yellow-50", ring: "ring-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
    rose: { grad: "from-rose-50 to-red-50", ring: "ring-rose-200", text: "text-rose-700", dot: "bg-rose-500" },
    emerald: { grad: "from-emerald-50 to-green-50", ring: "ring-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
    teal: { grad: "from-teal-50 to-cyan-50", ring: "ring-teal-200", text: "text-teal-700", dot: "bg-teal-500" },
    cyan: { grad: "from-cyan-50 to-sky-50", ring: "ring-cyan-200", text: "text-cyan-700", dot: "bg-cyan-500" },
    sky: { grad: "from-sky-50 to-blue-50", ring: "ring-sky-200", text: "text-sky-700", dot: "bg-sky-500" },
    indigo: { grad: "from-indigo-50 to-violet-50", ring: "ring-indigo-200", text: "text-indigo-700", dot: "bg-indigo-500" },
  };
  const t = themes[tone];
  return (
    <div className={`rounded-xl bg-gradient-to-br ${t.grad} p-3 ring-1 ${t.ring} shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}>
      <div className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} /><div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">{label}</div></div>
      <div className={`mt-0.5 text-xl font-bold ${t.text}`}>{value}</div>
    </div>
  );
}

function StaffFormModal({ member, onClose, onSave }: { member: StaffMember | null; onClose: () => void; onSave: (b: Partial<StaffMember>) => void }) {
  const [form, setForm] = useState({
    firstName: member?.firstName || "", lastName: member?.lastName || "",
    role: (member?.role || "nurse") as StaffRole, department: (member?.department || "ward") as Department,
    employeeCode: member?.employeeCode || "", phone: member?.phone || "", email: member?.email || "",
    license: member?.license || "", maxHoursPerWeek: member?.maxHoursPerWeek?.toString() || "",
    isActive: member?.isActive ?? true,
  });
  function submit() {
    if (!form.firstName || !form.lastName) { alert("Name required"); return; }
    onSave({ id: member?.id, ...form, maxHoursPerWeek: form.maxHoursPerWeek ? Number(form.maxHoursPerWeek) : undefined });
  }
  return (
    <Modal title={member ? `Edit ${member.id}` : "Add staff"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name"><input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Last name"><input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Role">
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
        </Field>
        <Field label="Department">
          <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value as Department })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">{DEPTS.map((d) => <option key={d} value={d}>{DEPT_LABEL[d]}</option>)}</select>
        </Field>
        <Field label="Employee code"><input value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Email"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="License"><input value={form.license} onChange={(e) => setForm({ ...form, license: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Max hrs/week"><input type="number" value={form.maxHoursPerWeek} onChange={(e) => setForm({ ...form, maxHoursPerWeek: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Active</label>
      </div>
      <ModalActions onClose={onClose} onSave={submit} />
    </Modal>
  );
}

function ShiftFormModal({ shift, staff, onClose, onSave }: { shift: Shift | null; staff: StaffMember[]; onClose: () => void; onSave: (b: Partial<Shift>) => void }) {
  const [form, setForm] = useState({
    staffId: shift?.staffId || "",
    shiftType: (shift?.shiftType || "day") as ShiftType,
    startAt: shift ? toLocal(shift.startAt) : toLocal(new Date().toISOString()),
    endAt: shift ? toLocal(shift.endAt) : toLocal(new Date(Date.now() + 8 * 3_600_000).toISOString()),
    department: (shift?.department || "ward") as Department,
    location: shift?.location || "",
    note: shift?.note || "",
    status: (shift?.status || "scheduled") as ShiftStatus,
  });
  function submit() {
    if (!form.staffId || !form.startAt || !form.endAt) { alert("Staff, start and end required"); return; }
    onSave({
      id: shift?.id, staffId: form.staffId, shiftType: form.shiftType,
      startAt: new Date(form.startAt).toISOString(), endAt: new Date(form.endAt).toISOString(),
      department: form.department, location: form.location || undefined, note: form.note || undefined,
      status: shift ? form.status : undefined,
    });
  }
  return (
    <Modal title={shift ? `Edit ${shift.id}` : "Add shift"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Staff" full>
          <select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" disabled={!!shift}>
            <option value="">Select staff…</option>
            {staff.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName} · {ROLE_LABEL[m.role]}</option>)}
          </select>
        </Field>
        <Field label="Shift type">
          <select value={form.shiftType} onChange={(e) => setForm({ ...form, shiftType: e.target.value as ShiftType })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">{SHIFT_TYPES.map((t) => <option key={t} value={t}>{SHIFT_TYPE_LABEL[t]}</option>)}</select>
        </Field>
        <Field label="Department">
          <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value as Department })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">{DEPTS.map((d) => <option key={d} value={d}>{DEPT_LABEL[d]}</option>)}</select>
        </Field>
        <Field label="Start"><input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="End"><input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Location"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        {shift && (
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ShiftStatus })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">{STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select>
          </Field>
        )}
        <Field label="Note" full><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
      </div>
      <ModalActions onClose={onClose} onSave={submit} />
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-200 px-5 py-3"><h2 className="text-lg font-semibold text-slate-900">{title}</h2><button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button></div><div className="p-5">{children}</div></div></div>;
}
function ModalActions({ onClose, onSave, saveLabel = "Save" }: { onClose: () => void; onSave: () => void; saveLabel?: string }) {
  return <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4"><button onClick={onClose} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button><button onClick={onSave} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">{saveLabel}</button></div>;
}
function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <label className={`block text-sm ${full ? "col-span-2" : ""}`}><span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>{children}</label>;
}
