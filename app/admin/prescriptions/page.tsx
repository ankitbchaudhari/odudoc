"use client";

import { useEffect, useMemo, useState } from "react";
import ExportButtons from "@/components/ExportButtons";
import PrescriptionRenderer from "@/components/PrescriptionRenderer";
import {
  PRESCRIPTION_TEMPLATES,
  getTemplateById,
} from "@/lib/prescription-templates";
import type { PrescriptionRecord } from "@/lib/prescriptions-store";

interface DoctorRow {
  id: string;
  name: string;
  email?: string;
  specialty: string;
  status: string;
  experience?: number;
}

// Admin prescriptions audit page.
// Top: active-doctors panel showing each doctor + the number of
// prescriptions they've written + a click-to-filter affordance.
// Bottom: every prescription written across the platform, with
// patient + doctor + diagnosis + meds + status. Search filters
// across all fields. Click a row → modal with a full PDF-quality
// render of the prescription.
export default function AdminPrescriptionsPage() {
  const [items, setItems] = useState<PrescriptionRecord[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<PrescriptionRecord | null>(null);
  const [q, setQ] = useState("");
  /** When set, the table filters to only this doctor's prescriptions.
   *  Hex into the patient/doctor/diagnosis search box AND this filter
   *  combine (both must match) so admins can drill from the doctor
   *  cards then refine. */
  const [filterDoctorEmail, setFilterDoctorEmail] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [rxRes, drRes] = await Promise.all([
      fetch("/api/prescriptions").then((r) => r.json()).catch(() => ({ prescriptions: [] })),
      fetch("/api/admin/doctors").then((r) => r.json()).catch(() => ({ doctors: [] })),
    ]);
    setItems(rxRes.prescriptions || []);
    setDoctors(drRes.doctors || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  /** Per-doctor counts so the top panel can show "Dr X · 12 active /
   *  3 cancelled" without an extra round-trip. */
  const countsByDoctor = useMemo(() => {
    const map = new Map<string, { active: number; cancelled: number; total: number }>();
    for (const p of items) {
      const k = (p.doctorEmail || "").toLowerCase();
      const cur = map.get(k) || { active: 0, cancelled: 0, total: 0 };
      cur.total += 1;
      if (p.status === "active") cur.active += 1;
      else cur.cancelled += 1;
      map.set(k, cur);
    }
    return map;
  }, [items]);

  const cancel = async (id: string) => {
    if (!confirm("Mark this prescription as cancelled? The record is kept for audit.")) return;
    const res = await fetch(`/api/prescriptions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Failed to cancel prescription");
      return;
    }
    load();
  };

  const filtered = items.filter((p) => {
    if (filterDoctorEmail && (p.doctorEmail || "").toLowerCase() !== filterDoctorEmail) {
      return false;
    }
    if (!q.trim()) return true;
    const hay = `${p.doctorEmail} ${p.patientEmail} ${p.data.patientName} ${p.data.diagnosis}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  const activeCount = items.filter((p) => p.status === "active").length;
  const cancelledCount = items.filter((p) => p.status !== "active").length;

  return (
    <div>
      {/* gradient hero */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-400" />
              </span>
              Clinical audit log
            </div>
            <h1 className="text-2xl font-bold">Prescriptions</h1>
            <p className="mt-1 text-sm text-emerald-50/90">
              {items.length} total · {activeCount} active · {cancelledCount} cancelled
            </p>
          </div>
          <ExportButtons type="prescriptions" className="text-white" />
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by patient, doctor, diagnosis…"
              className="w-80 rounded-xl border border-white/30 bg-white/95 py-2.5 pl-9 pr-3 text-sm text-slate-700 shadow-md outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-white/60"
            />
          </div>
        </div>
      </div>

      {/* Doctors activity panel — every active doctor on the
          platform with their lifetime prescription count. Click a
          card to filter the table below to only that doctor. */}
      {!loading && doctors.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-3">
            <div>
              <p className="text-sm font-bold text-slate-900">
                Doctors on the platform · {doctors.length}
              </p>
              <p className="text-[11px] text-slate-500">
                Click a card to filter the prescription log to only that doctor.
              </p>
            </div>
            {filterDoctorEmail && (
              <button
                onClick={() => setFilterDoctorEmail(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                ✕ Clear doctor filter
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {doctors.map((d, i) => {
              const palettes = [
                "from-emerald-500 to-teal-500",
                "from-sky-500 to-indigo-500",
                "from-violet-500 to-fuchsia-500",
                "from-amber-500 to-orange-500",
                "from-rose-500 to-pink-500",
                "from-cyan-500 to-blue-500",
              ];
              const grad = palettes[i % palettes.length];
              const initials = (d.name || "?")
                .split(" ")
                .map((s) => s[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const stats = countsByDoctor.get((d.email || "").toLowerCase()) || {
                active: 0,
                cancelled: 0,
                total: 0,
              };
              const selected = filterDoctorEmail === (d.email || "").toLowerCase();
              return (
                <button
                  key={d.id}
                  onClick={() =>
                    setFilterDoctorEmail(
                      selected ? null : (d.email || "").toLowerCase() || null,
                    )
                  }
                  disabled={!d.email}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    selected
                      ? "border-emerald-400 bg-emerald-50 shadow-md ring-2 ring-emerald-300/50"
                      : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                  }`}
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-sm font-bold text-white shadow ring-2 ring-white`}>
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{d.name}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {d.specialty}
                      {d.experience ? ` · ${d.experience}y exp` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${stats.total > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                        {stats.total} total
                      </span>
                      {stats.active > 0 && (
                        <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                          {stats.active} active
                        </span>
                      )}
                      {stats.cancelled > 0 && (
                        <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                          {stats.cancelled} cancelled
                        </span>
                      )}
                      {d.status !== "Active" && (
                        <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                          {d.status}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center text-sm text-gray-400">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-2xl">
            💊
          </div>
          <p className="text-sm font-semibold text-slate-700">
            {q
              ? "No prescriptions match this search."
              : filterDoctorEmail
                ? "This doctor hasn't written any prescriptions yet."
                : doctors.length === 0
                  ? "No doctors on the platform yet."
                  : "No prescriptions written yet."}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {doctors.length > 0 && !q && !filterDoctorEmail
              ? "Once any doctor writes a prescription via the EMR or a video consult, it'll appear here."
              : "When prescriptions exist, each one is listed with its doctor, patient, diagnosis, and meds for full audit."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-slate-50 to-white text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Diagnosis</th>
                <th className="px-4 py-3">Meds</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p, i) => {
                const palettes = [
                  "from-emerald-400 to-teal-500",
                  "from-sky-400 to-blue-500",
                  "from-violet-400 to-fuchsia-500",
                  "from-amber-400 to-orange-500",
                  "from-rose-400 to-pink-500",
                  "from-indigo-400 to-violet-500",
                ];
                const grad = palettes[i % palettes.length];
                const initials = (p.data.patientName || "?")
                  .split(" ")
                  .map((s) => s[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                <tr key={p.id} className="transition hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(p.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-xs font-bold text-white shadow-sm ring-2 ring-white`}>
                        {initials}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{p.data.patientName}</div>
                        <div className="text-xs text-gray-500">{p.patientEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.doctorEmail}</td>
                  <td className="px-4 py-3 text-gray-600 line-clamp-2 max-w-xs">
                    {p.data.diagnosis}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                      {p.data.medications.length}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                        p.status === "active"
                          ? "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200"
                          : "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-600 ring-slate-200"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${p.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setViewing(p)}
                      className="mr-2 rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100 transition hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow"
                    >
                      View
                    </button>
                    {p.status === "active" && (
                      <button
                        onClick={() => cancel(p.id)}
                        className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100 transition hover:-translate-y-0.5 hover:bg-red-100 hover:shadow"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      )}

      {viewing && (
        <PrescriptionViewerModal
          record={viewing}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

function PrescriptionViewerModal({
  record,
  onClose,
}: {
  record: PrescriptionRecord;
  onClose: () => void;
}) {
  const template =
    getTemplateById(record.templateId) || PRESCRIPTION_TEMPLATES[0];

  const print = () => {
    const el = document.getElementById("rx-print-target");
    if (!el) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Prescription - ${record.data.patientName}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;print-color-adjust:exact;-webkit-print-color-adjust:exact}@media print{body{margin:0}}</style>
      </head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {record.data.patientName}
            </h3>
            <p className="text-xs text-gray-500">
              by {record.doctorEmail} · {new Date(record.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={print}
              className="btn-primary !py-2 !px-4 !text-xs"
            >
              Print
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
          <div
            id="rx-print-target"
            className="mx-auto w-full max-w-[210mm] bg-white shadow-lg"
            style={{ minHeight: "297mm" }}
          >
            <PrescriptionRenderer template={template} data={record.data} />
          </div>
        </div>
      </div>
    </div>
  );
}
