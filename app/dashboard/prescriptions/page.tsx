"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import PrescriptionRenderer from "@/components/PrescriptionRenderer";
import {
  PRESCRIPTION_TEMPLATES,
  getTemplateById,
} from "@/lib/prescription-templates";
import type { PrescriptionRecord } from "@/lib/prescriptions-store";

// Patient-side prescriptions list.
// The backend already scopes the GET /api/prescriptions response to the signed-in
// patient's email, so we just render what comes back.
export default function PatientPrescriptionsPage() {
  const { status } = useSession();
  const [items, setItems] = useState<PrescriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<PrescriptionRecord | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/prescriptions")
      .then((r) => r.json())
      .then((d) => {
        setItems(d.prescriptions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8 text-sm text-gray-400 dark:text-slate-500">
        Loading…
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
        <p className="text-sm text-gray-600 dark:text-slate-300">
          Please{" "}
          <Link href="/auth/login" className="text-primary-600 underline">
            sign in
          </Link>{" "}
          to view your prescriptions.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg p-2 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:bg-slate-800 hover:text-gray-600 dark:text-slate-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">My Prescriptions</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">
              Every prescription your doctors have written for you.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-100 bg-white dark:bg-slate-900 p-12 text-center text-sm text-gray-400 dark:text-slate-500">
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
            <p className="text-sm text-gray-500 dark:text-slate-400">You don&apos;t have any prescriptions yet.</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
              They&apos;ll show up here automatically after your next consultation.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((p) => {
              const tpl = getTemplateById(p.templateId) || PRESCRIPTION_TEMPLATES[0];
              return (
                <button
                  key={p.id}
                  onClick={() => setViewing(p)}
                  className="flex w-full items-center gap-4 rounded-xl border border-gray-100 bg-white dark:bg-slate-900 p-4 text-left shadow-sm transition-all hover:border-primary-300 hover:shadow-md"
                >
                  <div
                    className="h-12 w-12 shrink-0 rounded-lg"
                    style={{ backgroundColor: tpl.previewBg, borderLeft: `4px solid ${tpl.accentColor}` }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                        {p.data.diagnosis}
                      </h3>
                      {p.status === "cancelled" && (
                        <span className="rounded-full bg-gray-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:text-slate-400">
                          cancelled
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                      by {p.data.doctorName || p.doctorEmail} ·{" "}
                      {new Date(p.createdAt).toLocaleDateString()} ·{" "}
                      {p.data.medications.length} medication
                      {p.data.medications.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {viewing && (
        <PrescriptionViewerModal record={viewing} onClose={() => setViewing(null)} />
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
  const template = getTemplateById(record.templateId) || PRESCRIPTION_TEMPLATES[0];

  const print = () => {
    const el = document.getElementById("rx-patient-print-target");
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
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">{record.data.diagnosis}</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {record.data.doctorName || record.doctorEmail} ·{" "}
              {new Date(record.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={print} className="btn-primary !py-2 !px-4 !text-xs">
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:bg-slate-800"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-slate-800 p-6">
          <div
            id="rx-patient-print-target"
            className="mx-auto w-full max-w-[210mm] bg-white dark:bg-slate-900 shadow-lg"
            style={{ minHeight: "297mm" }}
          >
            <PrescriptionRenderer template={template} data={record.data} />
          </div>
        </div>
      </div>
    </div>
  );
}
