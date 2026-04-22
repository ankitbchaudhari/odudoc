"use client";

import { useEffect, useState } from "react";
import PrescriptionRenderer from "@/components/PrescriptionRenderer";
import {
  PRESCRIPTION_TEMPLATES,
  getTemplateById,
} from "@/lib/prescription-templates";
import type { PrescriptionRecord } from "@/lib/prescriptions-store";

// Admin prescriptions audit page.
// Lists every prescription doctors have written, lets admin open a full
// render of any record or soft-cancel it (DELETE → status: "cancelled").
export default function AdminPrescriptionsPage() {
  const [items, setItems] = useState<PrescriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<PrescriptionRecord | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/prescriptions");
    const j = await res.json().catch(() => ({ prescriptions: [] }));
    setItems(j.prescriptions || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const cancel = async (id: string) => {
    if (!confirm("Mark this prescription as cancelled? The record is kept for audit.")) return;
    const res = await fetch(`/api/prescriptions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Failed to cancel prescription");
      return;
    }
    load();
  };

  const filtered = q.trim()
    ? items.filter((p) => {
        const hay = `${p.doctorEmail} ${p.patientEmail} ${p.data.patientName} ${p.data.diagnosis}`.toLowerCase();
        return hay.includes(q.trim().toLowerCase());
      })
    : items;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Audit log of every prescription written on the platform.
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by patient, doctor, diagnosis…"
          className="w-72 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center text-sm text-gray-400">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-400">
          No prescriptions {q ? "match this search" : "yet"}.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
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
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(p.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{p.data.patientName}</div>
                    <div className="text-xs text-gray-500">{p.patientEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.doctorEmail}</td>
                  <td className="px-4 py-3 text-gray-600 line-clamp-2 max-w-xs">
                    {p.data.diagnosis}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.data.medications.length}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.status === "active"
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setViewing(p)}
                      className="mr-2 rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      View
                    </button>
                    {p.status === "active" && (
                      <button
                        onClick={() => cancel(p.id)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
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
