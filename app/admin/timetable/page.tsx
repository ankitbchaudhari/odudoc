"use client";

import { useCallback, useEffect, useState } from "react";

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

const DAYS: WeekDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
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
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

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
      const r = await fetch("/api/timetable", { cache: "no-store" });
      if (r.ok) {
        const data = await r.json();
        setEntries(data.entries || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

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
              {entries.length} shift{entries.length === 1 ? "" : "s"} across {new Set(entries.map((e) => e.doctorName)).size} doctor{new Set(entries.map((e) => e.doctorName)).size === 1 ? "" : "s"}
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

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500" />
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
              {entries.map((e) => {
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
        {!loading && entries.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No timetable entries yet.</div>
        )}
        {loading && <div className="py-12 text-center text-sm text-gray-400">Loading…</div>}
      </div>
    </div>
  );
}
