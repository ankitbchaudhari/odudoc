"use client";

import { useState } from "react";
import { useClinicAppointments, type ClinicAppointment } from "@/lib/clinic-store";

const blank = {
  patientName: "",
  doctorName: "",
  date: new Date().toISOString().slice(0, 10),
  time: "10:00",
  reason: "",
};

export default function ClinicAppointmentsPage() {
  const { items, add, update, remove } = useClinicAppointments();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientName.trim() || !form.doctorName.trim()) return;
    add({
      ...form,
      status: "scheduled",
      reminderSent: false,
      createdAt: new Date().toISOString(),
    });
    setForm(blank);
    setShowForm(false);
  };

  const setStatus = (id: string, status: ClinicAppointment["status"]) =>
    update(id, { status });

  const sendReminder = (a: ClinicAppointment) => {
    update(a.id, { reminderSent: true });
    alert(
      `📧 SMS + email reminder queued for ${a.patientName} (appointment on ${a.date} at ${a.time}).\n\n` +
        "In production this hits your provider (Twilio / SES / SendGrid) — wiring depends on what you've signed up for."
    );
  };

  return (
    <div>
      <Header title="Appointments" subtitle="Smart scheduling with SMS + email reminders.">
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary !py-2 !text-sm">
          {showForm ? "Close" : "+ New appointment"}
        </button>
      </Header>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 grid grid-cols-1 gap-3 rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm sm:grid-cols-2">
          <Input label="Patient name" value={form.patientName} onChange={(v) => setForm({ ...form, patientName: v })} required />
          <Input label="Doctor" value={form.doctorName} onChange={(v) => setForm({ ...form, doctorName: v })} required />
          <Input type="date" label="Date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
          <Input type="time" label="Time" value={form.time} onChange={(v) => setForm({ ...form, time: v })} />
          <div className="sm:col-span-2">
            <Input label="Reason / notes" value={form.reason} onChange={(v) => setForm({ ...form, reason: v })} />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className="btn-primary !py-2 !text-sm">Save appointment</button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-sm">
        {items.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-400 dark:text-slate-500 dark:text-slate-400">No appointments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900 text-left text-xs uppercase text-gray-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {items
                .slice()
                .sort((a, b) => (a.date + a.time > b.date + b.time ? -1 : 1))
                .map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:bg-slate-900">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{a.patientName}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{a.doctorName}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{a.date} · {a.time}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{a.reason || "—"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={a.status}
                        onChange={(e) => setStatus(a.id, e.target.value as ClinicAppointment["status"])}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          a.status === "completed" ? "bg-green-50 text-green-700" :
                          a.status === "cancelled" ? "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400" :
                          "bg-primary-50 text-primary-700"
                        }`}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {!a.reminderSent && a.status === "scheduled" && (
                          <button onClick={() => sendReminder(a)} className="rounded bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100">
                            📧 Remind
                          </button>
                        )}
                        {a.reminderSent && (
                          <span className="rounded bg-green-50 px-2 py-1 text-xs text-green-700">✓ Reminded</span>
                        )}
                        <button onClick={() => remove(a.id)} className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                          Delete
                        </button>
                      </div>
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

function Header({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{title}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-600 dark:text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      />
    </label>
  );
}
