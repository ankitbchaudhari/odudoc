"use client";

// Patient-facing view of the prescription the doctor issued during a
// live consultation. Renders what DoctorNotesPanel sent and exposes
// two fulfillment paths: order through OduDoc Pharmacy, or take it
// to an offline pharmacy.

import Link from "next/link";
import { useState } from "react";
import PharmacyPicker from "./PharmacyPicker";
import PharmacyOrderConfirm, { type PharmacyOrderDraft } from "./PharmacyOrderConfirm";

export interface MedicineRow {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
}

export interface ConsultPrescription {
  symptoms: string;
  diagnosis: string;
  treatment?: string;
  investigations?: string;
  notes: string;
  medicines: MedicineRow[];
  doctorName: string;
  patientName: string;
  specialty: string;
  issuedAt: string;
}

interface Props {
  rx: ConsultPrescription;
  // Hide the "order from pharmacy" chooser when the doctor is viewing
  // their own issued Rx. Patients need it; doctors do not.
  showPharmacyOptions?: boolean;
}

const CLINIC_NAME = "OduDoc E Medical Center";

export default function ConsultPrescriptionView({ rx, showPharmacyOptions = true }: Props) {
  const [choice, setChoice] = useState<"odudoc" | "offline" | null>(null);
  const [draft, setDraft] = useState<PharmacyOrderDraft | null>(null);

  // Encode the medicine list into a ?rx= query param so the /shop page
  // can show a pre-filled "buy these" list when we wire it up later.
  const shopHref =
    "/shop?rx=" +
    encodeURIComponent(
      rx.medicines.map((m) => m.name).filter(Boolean).join(",")
    );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm print:border-0 print:shadow-none">
        {/* Header */}
        <div className="border-b-2 border-primary-600 pb-4 text-center">
          <h2 className="text-xl font-bold text-primary-600">{CLINIC_NAME}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{rx.doctorName}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">{rx.specialty}</p>
        </div>

        {/* Patient + date */}
        <div className="mt-4 grid grid-cols-2 gap-4 border-b border-gray-100 pb-4 text-sm">
          <div>
            <p className="text-xs font-medium uppercase text-gray-400 dark:text-slate-500">Patient</p>
            <p className="font-semibold text-gray-900 dark:text-slate-100">{rx.patientName || "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase text-gray-400 dark:text-slate-500">Date</p>
            <p className="font-semibold text-gray-900 dark:text-slate-100">
              {new Date(rx.issuedAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Symptoms / Diagnosis */}
        {(rx.symptoms || rx.diagnosis) && (
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {rx.symptoms && (
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400 dark:text-slate-500">
                  Symptoms
                </p>
                <p className="mt-1 whitespace-pre-wrap text-gray-700 dark:text-slate-300">
                  {rx.symptoms}
                </p>
              </div>
            )}
            {rx.diagnosis && (
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400 dark:text-slate-500">
                  Diagnosis
                </p>
                <p className="mt-1 whitespace-pre-wrap text-gray-700 dark:text-slate-300">
                  {rx.diagnosis}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Treatment / Investigations */}
        {(rx.treatment || rx.investigations) && (
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {rx.treatment && (
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400 dark:text-slate-500">
                  Treatment
                </p>
                <p className="mt-1 whitespace-pre-wrap text-gray-700 dark:text-slate-300">
                  {rx.treatment}
                </p>
              </div>
            )}
            {rx.investigations && (
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400 dark:text-slate-500">
                  Investigations
                </p>
                <p className="mt-1 whitespace-pre-wrap text-gray-700 dark:text-slate-300">
                  {rx.investigations}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Medicines */}
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-slate-100">
            Medicines
          </h3>
          {rx.medicines.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              No medicines prescribed for this consultation.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-900 text-left text-xs uppercase text-gray-500 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Medicine</th>
                    <th className="px-3 py-2">Dose</th>
                    <th className="px-3 py-2">Frequency</th>
                    <th className="px-3 py-2">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {rx.medicines.map((m, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-slate-100">
                        {m.name}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-slate-300">{m.dose || "—"}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-slate-300">
                        {m.frequency || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-slate-300">
                        {m.duration || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notes */}
        {rx.notes && (
          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
            <p className="text-xs font-semibold uppercase text-blue-700">
              Doctor&apos;s Notes
            </p>
            <p className="mt-1 whitespace-pre-wrap">{rx.notes}</p>
          </div>
        )}

        {/* Signature */}
        <div className="mt-8 flex items-end justify-between border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-400 dark:text-slate-500">
            Digitally issued via OduDoc video consultation.
          </p>
          <div className="text-right">
            <p className="font-medium text-gray-900 dark:text-slate-100">{rx.doctorName}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Digital Signature</p>
          </div>
        </div>
      </div>

      {/* Pharmacy choice */}
      {showPharmacyOptions && rx.medicines.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm print:hidden">
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
            How would you like to get your medicines?
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Choose a pharmacy to fill this prescription.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setChoice("odudoc")}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                choice === "odudoc"
                  ? "border-primary-600 bg-primary-50"
                  : "border-gray-200 dark:border-slate-800 hover:border-primary-300 hover:bg-gray-50 dark:bg-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏥</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-slate-100">OduDoc Pharmacy</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Home delivery · auto-matched to your Rx
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setChoice("offline")}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                choice === "offline"
                  ? "border-primary-600 bg-primary-50"
                  : "border-gray-200 dark:border-slate-800 hover:border-primary-300 hover:bg-gray-50 dark:bg-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏪</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-slate-100">Offline Pharmacy</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Print or save Rx and take it to your local pharmacy
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Follow-up action */}
          {choice === "odudoc" && (
            <div className="mt-5 space-y-4">
              <div className="rounded-lg border border-primary-100 bg-primary-50 p-4">
                <p className="text-sm text-primary-900">
                  Compare pharmacies near you below, or browse the full
                  OduDoc catalog to review substitutions manually.
                </p>
                <Link
                  href={shopHref}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-primary-700 shadow-sm hover:bg-primary-50"
                >
                  Browse catalog →
                </Link>
              </div>
              {!draft && (
                <PharmacyPicker
                  medicines={rx.medicines}
                  onPick={(c) =>
                    setDraft({
                      store: c.store,
                      fulfillment: c.fulfillment,
                      lines: c.lines,
                      totalInr: c.totalInr,
                      doctorName: rx.doctorName,
                    })
                  }
                />
              )}
              {draft && (
                <PharmacyOrderConfirm
                  draft={draft}
                  onCancel={() => setDraft(null)}
                />
              )}
            </div>
          )}

          {choice === "offline" && (
            <div className="mt-5 rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 p-4">
              <p className="text-sm text-gray-700 dark:text-slate-300">
                No problem — print or save this prescription and take it to any
                licensed pharmacy. Keep a digital copy for your records.
              </p>
              <button
                onClick={() => window.print()}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print / Save as PDF
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
