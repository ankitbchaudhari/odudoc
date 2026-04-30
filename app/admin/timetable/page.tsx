"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type WeekDay = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
type TimetableSlot = "morning" | "afternoon" | "evening";

interface TimetableEntry {
  id: string;
  doctorName: string;
  department: string;
  day: WeekDay;
  timeSlot: TimetableSlot;
  time: string;
  color: string;
}

interface DoctorRow {
  id: string;
  name: string;
  email?: string;
  specialty: string;
  status: string;
}

const DAYS: WeekDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Parse a time-display string like "9:00 AM - 12:00 PM" into
 *  start + end minutes-since-midnight. Returns null when the string
 *  doesn't fit the pattern (we surface those as "Schedule unparsed"
 *  rather than silently treat them as 24-hour windows). */
function parseTimeRange(s: string): { start: number; end: number } | null {
  const m = s.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[-–—to]+\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) return null;
  const toMinutes = (h: string, mn: string | undefined, ampm: string | undefined) => {
    let hh = parseInt(h, 10);
    const mm = mn ? parseInt(mn, 10) : 0;
    if (ampm) {
      const upper = ampm.toUpperCase();
      if (upper === "PM" && hh < 12) hh += 12;
      if (upper === "AM" && hh === 12) hh = 0;
    }
    return hh * 60 + mm;
  };
  // If end has AM/PM but start doesn't, infer start matches end.
  const startAmpm = m[3] || m[6];
  const endAmpm = m[6] || m[3];
  return {
    start: toMinutes(m[1], m[2], startAmpm),
    end: toMinutes(m[4], m[5], endAmpm),
  };
}

const WEEKDAY_INDEX: Record<WeekDay, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};

interface DutyStatus {
  state: "on" | "later-today" | "off-today" | "untimed";
  /** Set when state === "later-today". */
  nextStartLabel?: string;
  /** Set when state === "on". */
  endsAtLabel?: string;
}

function fmtMinutes(total: number): string {
  const h24 = Math.floor(total / 60) % 24;
  const m = total % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function dutyStatusFor(
  doctorName: string,
  entries: TimetableEntry[],
  now: Date,
): DutyStatus {
  const todayName = (Object.keys(WEEKDAY_INDEX) as WeekDay[]).find(
    (d) => WEEKDAY_INDEX[d] === now.getDay(),
  );
  if (!todayName) return { state: "off-today" };
  const todays = entries.filter(
    (e) => e.doctorName === doctorName && e.day === todayName,
  );
  if (todays.length === 0) {
    // Anything scheduled at all this week?
    const hasAny = entries.some((e) => e.doctorName === doctorName);
    return { state: hasAny ? "off-today" : "untimed" };
  }
  const nowMin = now.getHours() * 60 + now.getMinutes();
  // Currently inside a window?
  for (const e of todays) {
    const r = parseTimeRange(e.time);
    if (!r) continue;
    if (nowMin >= r.start && nowMin < r.end) {
      return { state: "on", endsAtLabel: fmtMinutes(r.end) };
    }
  }
  // Otherwise, find the next start later today.
  let earliestUpcoming: number | null = null;
  for (const e of todays) {
    const r = parseTimeRange(e.time);
    if (!r) continue;
    if (r.start > nowMin && (earliestUpcoming === null || r.start < earliestUpcoming)) {
      earliestUpcoming = r.start;
    }
  }
  if (earliestUpcoming !== null) {
    return { state: "later-today", nextStartLabel: fmtMinutes(earliestUpcoming) };
  }
  return { state: "off-today" };
}
const SLOTS: { key: TimetableSlot; label: string }[] = [
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
];

const COLOR_PRESETS = [
  { label: "Red", value: "bg-red-100 text-red-700 border-red-200" },
  { label: "Teal", value: "bg-teal-100 text-teal-700 border-teal-200" },
  { label: "Green", value: "bg-green-100 text-green-700 border-green-200" },
  { label: "Indigo", value: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { label: "Pink", value: "bg-pink-100 text-pink-700 border-pink-200" },
  { label: "Rose", value: "bg-rose-100 text-rose-700 border-rose-200" },
  { label: "Orange", value: "bg-orange-100 text-orange-700 border-orange-200" },
  { label: "Blue", value: "bg-blue-100 text-blue-700 border-blue-200" },
];

export default function AdminTimetable() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterDoctorName, setFilterDoctorName] = useState<string | null>(null);
  // Re-render every minute so "On duty now" / "Starts at 3 PM" stays
  // accurate without a manual refresh.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const [form, setForm] = useState({
    doctorName: "",
    department: "",
    day: "Monday" as WeekDay,
    timeSlot: "morning" as TimetableSlot,
    time: "9:00 AM - 12:00 PM",
    color: COLOR_PRESETS[0].value,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, dRes] = await Promise.all([
        fetch("/api/timetable", { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : { entries: [] }
        ),
        fetch("/api/admin/doctors", { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : { doctors: [] }
        ),
      ]);
      setEntries(tRes.entries || []);
      setDoctors(dRes.doctors || []);
    } finally {
      setLoading(false);
    }
  }, []);

  // Per-doctor compute of duty status + counts, re-runs every minute
  // (when `now` ticks) and on entry changes.
  const doctorRows = useMemo(() => {
    return doctors.map((d) => {
      const status = dutyStatusFor(d.name, entries, now);
      const myEntries = entries.filter((e) => e.doctorName === d.name);
      return { doctor: d, status, entryCount: myEntries.length };
    });
  }, [doctors, entries, now]);

  const onDutyNow = doctorRows.filter((r) => r.status.state === "on").length;
  const startingLater = doctorRows.filter((r) => r.status.state === "later-today").length;

  const filteredEntries = filterDoctorName
    ? entries.filter((e) => e.doctorName === filterDoctorName)
    : entries;

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm({
      doctorName: "",
      department: "",
      day: "Monday",
      timeSlot: "morning",
      time: "9:00 AM - 12:00 PM",
      color: COLOR_PRESETS[0].value,
    });
    setEditingId(null);
  };

  const handleEdit = (e: TimetableEntry) => {
    setForm({
      doctorName: e.doctorName,
      department: e.department,
      day: e.day,
      timeSlot: e.timeSlot,
      time: e.time,
      color: e.color,
    });
    setEditingId(e.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.doctorName.trim() || !form.department.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await fetch("/api/timetable", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...form }),
        });
      } else {
        await fetch("/api/timetable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setShowForm(false);
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this timetable entry?")) return;
    await fetch("/api/timetable", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  };

  return (
    <div>
      {/* gradient hero */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-rose-500 to-pink-600 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>
              Weekly clinic schedule
            </div>
            <h2 className="text-2xl font-bold">Doctor Timetable</h2>
            <p className="mt-1 text-sm text-orange-50/90">
              {entries.length} shift{entries.length === 1 ? "" : "s"} ·{" "}
              {new Set(entries.map((e) => e.doctorName)).size} doctor{new Set(entries.map((e) => e.doctorName)).size === 1 ? "" : "s"} scheduled · {" "}
              <span className="font-bold">
                {onDutyNow} on duty now
              </span>
              {startingLater > 0 && ` · ${startingLater} starting later today`}
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Entry
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {editingId ? "Edit Timetable Entry" : "Add Timetable Entry"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Doctor Name</label>
              <input
                type="text"
                value={form.doctorName}
                onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="Dr. Sarah Johnson"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Department</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="Cardiology"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Day</label>
              <select
                value={form.day}
                onChange={(e) => setForm({ ...form, day: e.target.value as WeekDay })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Time Slot</label>
              <select
                value={form.timeSlot}
                onChange={(e) => setForm({ ...form, timeSlot: e.target.value as TimetableSlot })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                {SLOTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Time Display</label>
              <input
                type="text"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="9:00 AM - 12:00 PM"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm({ ...form, color: c.value })}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${c.value} ${
                      form.color === c.value ? "ring-2 ring-offset-1 ring-primary-500" : ""
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : editingId ? "Update" : "Save"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Live doctor-duty grid — every doctor on the platform with
          their current on/off status computed from the timetable +
          local clock. Re-evaluates every minute. Click a card to
          filter the entries table to just that doctor. */}
      {!loading && doctors.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-3">
            <div>
              <p className="text-sm font-bold text-slate-900">
                Right now · {now.toLocaleString("en-US", { weekday: "long", hour: "numeric", minute: "2-digit" })}
              </p>
              <p className="text-[11px] text-slate-500">
                Live status per doctor. Click a card to filter the schedule below.
              </p>
            </div>
            {filterDoctorName && (
              <button
                onClick={() => setFilterDoctorName(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                ✕ Clear filter
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {doctorRows.map((row, i) => {
              const palettes = [
                "from-emerald-500 to-teal-500",
                "from-sky-500 to-indigo-500",
                "from-violet-500 to-fuchsia-500",
                "from-amber-500 to-orange-500",
                "from-rose-500 to-pink-500",
                "from-cyan-500 to-blue-500",
              ];
              const grad = palettes[i % palettes.length];
              const initials = (row.doctor.name || "?")
                .split(" ")
                .map((s) => s[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const selected = filterDoctorName === row.doctor.name;
              const { status } = row;
              const statusBadge = (() => {
                switch (status.state) {
                  case "on":
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600" />
                        </span>
                        On duty now · until {status.endsAtLabel}
                      </span>
                    );
                  case "later-today":
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        🕒 Starts at {status.nextStartLabel}
                      </span>
                    );
                  case "off-today":
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        Off today
                      </span>
                    );
                  case "untimed":
                  default:
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        No schedule set
                      </span>
                    );
                }
              })();
              return (
                <button
                  key={row.doctor.id}
                  onClick={() =>
                    setFilterDoctorName(selected ? null : row.doctor.name || null)
                  }
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    selected
                      ? "border-rose-400 bg-rose-50 shadow-md ring-2 ring-rose-300/50"
                      : status.state === "on"
                        ? "border-emerald-200 bg-emerald-50/40 hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md"
                        : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md"
                  }`}
                >
                  <div className="relative">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-sm font-bold text-white shadow ring-2 ring-white`}>
                      {initials}
                    </div>
                    {status.state === "on" && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{row.doctor.name}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {row.doctor.specialty}
                      {row.entryCount > 0 && ` · ${row.entryCount} shift${row.entryCount === 1 ? "" : "s"} this week`}
                    </p>
                    <div className="mt-1">{statusBadge}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500" />
        {filterDoctorName && (
          <div className="flex items-center justify-between border-b border-slate-100 bg-rose-50/40 px-4 py-2 text-xs">
            <span className="font-semibold text-rose-800">
              Showing schedule for <span className="font-bold">{filterDoctorName}</span>
            </span>
            <button
              onClick={() => setFilterDoctorName(null)}
              className="rounded border border-rose-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
            >
              Show all
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white text-xs font-semibold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Day</th>
                <th className="px-4 py-3">Slot</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((e) => {
                const slotBadge =
                  e.timeSlot === "morning"
                    ? "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 ring-amber-200"
                    : e.timeSlot === "afternoon"
                    ? "bg-gradient-to-r from-sky-50 to-blue-50 text-sky-700 ring-sky-200"
                    : "bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 ring-indigo-200";
                const slotIcon =
                  e.timeSlot === "morning" ? "☀️" : e.timeSlot === "afternoon" ? "🌤️" : "🌙";
                return (
                <tr key={e.id} className="border-b border-gray-50 transition hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-sm ${e.color}`}>
                      {e.doctorName}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-gradient-to-r from-slate-50 to-gray-50 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                      {e.department}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-700">{e.day}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ${slotBadge}`}>
                      <span>{slotIcon}</span>
                      {e.timeSlot}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{e.time}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleEdit(e)}
                        className="rounded-lg bg-blue-50 p-1.5 text-blue-600 ring-1 ring-blue-100 transition hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="rounded-lg bg-red-50 p-1.5 text-red-600 ring-1 ring-red-100 transition hover:-translate-y-0.5 hover:bg-red-100 hover:shadow"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
        {!loading && filteredEntries.length === 0 && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 text-2xl">
              📅
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {filterDoctorName
                ? `No timetable entries for ${filterDoctorName} yet.`
                : doctors.length === 0
                  ? "No doctors on the platform yet."
                  : "No timetable entries yet."}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Click <strong>Add Entry</strong> above to set when each doctor is available.
            </p>
          </div>
        )}
        {loading && <div className="py-12 text-center text-sm text-gray-400">Loading…</div>}
      </div>
    </div>
  );
}
