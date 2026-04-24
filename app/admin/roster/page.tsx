"use client";

import { useEffect, useMemo, useState } from "react";
import type { StaffMember } from "@/lib/hospital/staff-store";
import type { ShiftAssignment, ShiftType } from "@/lib/hospital/staff-store";
import type { Ward } from "@/lib/hospital/wards-store";
import type { OperationTheatre } from "@/lib/hospital/surgery-store";

const SHIFT_TYPES: ShiftType[] = ["morning", "evening", "night", "on_call", "custom"];

const TYPE_COLOR: Record<ShiftType, string> = {
  morning: "bg-amber-100 text-amber-700 border-amber-200",
  evening: "bg-orange-100 text-orange-700 border-orange-200",
  night: "bg-indigo-100 text-indigo-700 border-indigo-200",
  on_call: "bg-red-100 text-red-700 border-red-200",
  custom: "bg-slate-100 text-slate-700 border-slate-200",
};

function weekDates(anchor: Date): string[] {
  // Monday-anchored week, 7 days
  const d = new Date(anchor);
  const day = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - day);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

interface ShiftForm {
  staffId: string;
  date: string;
  shiftType: ShiftType;
  start: string;
  end: string;
  wardId: string;
  otId: string;
  role: string;
  notes: string;
}

const EMPTY: ShiftForm = {
  staffId: "",
  date: new Date().toISOString().slice(0, 10),
  shiftType: "morning",
  start: "",
  end: "",
  wardId: "",
  otId: "",
  role: "",
  notes: "",
};

export default function RosterPage() {
  const [shifts, setShifts] = useState<ShiftAssignment[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [theatres, setTheatres] = useState<OperationTheatre[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [anchor, setAnchor] = useState(new Date());
  const week = useMemo(() => weekDates(anchor), [anchor]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ShiftForm>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const dateFrom = week[0];
      const dateTo = week[week.length - 1];
      const q = new URLSearchParams({ dateFrom, dateTo });
      const [sh, st, w, t] = await Promise.all([
        fetch(`/api/hospital/shifts?${q.toString()}`, { cache: "no-store" }),
        fetch("/api/hospital/staff", { cache: "no-store" }),
        fetch("/api/hospital/wards", { cache: "no-store" }),
        fetch("/api/hospital/theatres", { cache: "no-store" }),
      ]);
      const shD = await sh.json();
      const stD = await st.json();
      const wD = await w.json();
      const tD = await t.json();
      if (!sh.ok) throw new Error(shD.error || "load_failed");
      setShifts(shD.shifts || []);
      setStaff(stD.staff || []);
      setWards(wD.wards || []);
      setTheatres(tD.theatres || []);
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  const staffMap = useMemo(() => {
    const m = new Map<string, StaffMember>();
    staff.forEach((s) => m.set(s.id, s));
    return m;
  }, [staff]);
  const wardMap = useMemo(() => {
    const m = new Map<string, Ward>();
    wards.forEach((w) => m.set(w.id, w));
    return m;
  }, [wards]);
  const otMap = useMemo(() => {
    const m = new Map<string, OperationTheatre>();
    theatres.forEach((t) => m.set(t.id, t));
    return m;
  }, [theatres]);

  // Group shifts into a grid: staffId → date → shifts[]
  const grid = useMemo(() => {
    const g = new Map<string, Map<string, ShiftAssignment[]>>();
    for (const sh of shifts) {
      if (!g.has(sh.staffId)) g.set(sh.staffId, new Map());
      const byDate = g.get(sh.staffId)!;
      if (!byDate.has(sh.date)) byDate.set(sh.date, []);
      byDate.get(sh.date)!.push(sh);
    }
    return g;
  }, [shifts]);

  const staffWithShifts = useMemo(
    () =>
      staff.filter(
        (s) =>
          s.status === "active" ||
          (grid.get(s.id)?.size ?? 0) > 0 // include non-active if they have shifts in window
      ),
    [staff, grid]
  );

  function reset() {
    setForm({ ...EMPTY, date: new Date().toISOString().slice(0, 10) });
    setEditingId(null);
    setShowForm(false);
  }

  function openCreate(staffId?: string, date?: string) {
    setEditingId(null);
    setForm({
      ...EMPTY,
      staffId: staffId || "",
      date: date || new Date().toISOString().slice(0, 10),
    });
    setShowForm(true);
  }

  function openEdit(sh: ShiftAssignment) {
    setEditingId(sh.id);
    setForm({
      staffId: sh.staffId,
      date: sh.date,
      shiftType: sh.shiftType,
      start: sh.start,
      end: sh.end,
      wardId: sh.wardId || "",
      otId: sh.otId || "",
      role: sh.role || "",
      notes: sh.notes || "",
    });
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      staffId: form.staffId,
      date: form.date,
      shiftType: form.shiftType,
      start: form.shiftType === "custom" ? form.start : form.start || undefined,
      end: form.shiftType === "custom" ? form.end : form.end || undefined,
      wardId: form.wardId || undefined,
      otId: form.otId || undefined,
      role: form.role || undefined,
      notes: form.notes || undefined,
    };
    const res = await fetch("/api/hospital/shifts", {
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

  async function remove(id: string) {
    if (!confirm("Delete this shift?")) return;
    const res = await fetch("/api/hospital/shifts", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
  }

  function shiftWeek(delta: number) {
    const d = new Date(anchor);
    d.setDate(d.getDate() + delta * 7);
    setAnchor(d);
  }

  const onCallCount = shifts.filter((s) => s.shiftType === "on_call").length;
  const uniqueStaffOnDuty = new Set(shifts.map((s) => s.staffId)).size;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Shift Roster</h2>
          <p className="text-sm text-slate-500">
            Weekly roster with conflict detection. Click a cell to add; click a shift to edit.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => shiftWeek(-1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">← Prev</button>
          <button onClick={() => setAnchor(new Date())} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Today</button>
          <button onClick={() => shiftWeek(1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Next →</button>
          <button onClick={() => openCreate()} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            + Assign shift
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Week of", value: new Date(week[0]).toLocaleDateString() },
          { label: "Total shifts", value: shifts.length },
          { label: "Staff on duty", value: uniqueStaffOnDuty },
          { label: "On-call slots", value: onCallCount, accent: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">{s.label}</div>
            <div className={`mt-1 text-xl font-semibold ${s.accent || "text-slate-900"}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {err && (
        err === "no_active_org" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">No organization selected.</p>
            <p className="mt-1 text-amber-700">
              Shift Roster is scoped to a hospital or clinic. Pick one from the
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
          <h3 className="text-sm font-semibold">{editingId ? "Edit shift" : "Assign shift"}</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Staff*">
              <select required value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} className="input">
                <option value="">— select —</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.role})</option>
                ))}
              </select>
            </Field>
            <Field label="Date*"><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input" /></Field>
            <Field label="Shift type*">
              <select value={form.shiftType} onChange={(e) => setForm({ ...form, shiftType: e.target.value as ShiftType })} className="input">
                {SHIFT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label={form.shiftType === "custom" ? "Start* (HH:mm)" : "Start (override)"}>
              <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className="input" />
            </Field>
            <Field label={form.shiftType === "custom" ? "End* (HH:mm)" : "End (override)"}>
              <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className="input" />
            </Field>
            <Field label="Role (optional)"><input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input" placeholder="Charge nurse / OT anesthetist" /></Field>
            <Field label="Ward">
              <select value={form.wardId} onChange={(e) => setForm({ ...form, wardId: e.target.value })} className="input">
                <option value="">—</option>
                {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </Field>
            <Field label="OT">
              <select value={form.otId} onChange={(e) => setForm({ ...form, otId: e.target.value })} className="input">
                <option value="">—</option>
                {theatres.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <div className="md:col-span-3">
              <Field label="Notes"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" /></Field>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white">{editingId ? "Save" : "Assign"}</button>
            <button type="button" onClick={reset} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
            {editingId && (
              <button type="button" onClick={() => { remove(editingId!); reset(); }} className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700">Delete</button>
            )}
          </div>
        </form>
      )}

      {/* Week grid */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left text-[11px] uppercase tracking-wider text-slate-500">Staff</th>
              {week.map((d) => {
                const day = new Date(d);
                const isToday = d === new Date().toISOString().slice(0, 10);
                return (
                  <th key={d} className={`px-2 py-2 text-[11px] uppercase tracking-wider ${isToday ? "bg-primary-50 text-primary-700" : "text-slate-500"}`}>
                    {day.toLocaleDateString(undefined, { weekday: "short" })}
                    <div className="text-slate-400">{day.getDate()}/{day.getMonth() + 1}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
            ) : staffWithShifts.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-400">No active staff. Add staff first.</td></tr>
            ) : (
              staffWithShifts.map((s) => {
                const byDate = grid.get(s.id) || new Map();
                return (
                  <tr key={s.id}>
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium">
                      <div className="text-slate-900">{s.firstName} {s.lastName}</div>
                      <div className="text-[10px] text-slate-500">{s.role}{s.specialty ? ` · ${s.specialty}` : ""}</div>
                    </td>
                    {week.map((d) => {
                      const cell: ShiftAssignment[] = byDate.get(d) || [];
                      return (
                        <td key={d} className="px-1.5 py-1.5 align-top">
                          <div className="space-y-1">
                            {cell.map((sh) => {
                              const ward = sh.wardId ? wardMap.get(sh.wardId) : null;
                              const ot = sh.otId ? otMap.get(sh.otId) : null;
                              return (
                                <button
                                  key={sh.id}
                                  onClick={() => openEdit(sh)}
                                  className={`block w-full rounded border px-1.5 py-1 text-left text-[10px] ${TYPE_COLOR[sh.shiftType]} hover:opacity-80`}
                                >
                                  <div className="font-semibold">
                                    {sh.shiftType === "on_call" ? "ON-CALL" : `${sh.start}–${sh.end}`}
                                  </div>
                                  {sh.role && <div className="text-[9px] opacity-80">{sh.role}</div>}
                                  {(ward || ot) && (
                                    <div className="text-[9px] opacity-70">
                                      {ward?.name || ""}{ward && ot ? " · " : ""}{ot?.name || ""}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                            <button
                              onClick={() => openCreate(s.id, d)}
                              className="block w-full rounded border border-dashed border-slate-300 px-1.5 py-0.5 text-[10px] text-slate-400 hover:border-slate-400 hover:text-slate-600"
                            >
                              +
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
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
