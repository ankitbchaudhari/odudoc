"use client";

// Slide-out panel shown to the doctor during a video consultation.
// Lets them record symptoms, diagnosis, and a medicine list while the
// call is live, then "End & Send Prescription" hands it off to the
// patient post-call.
//
// The prescription is stored in localStorage keyed by roomId so the
// patient side can pick it up when they land on the post-call screen.
// This matches the rest of the demo (no backend persistence yet);
// when you wire up /api/consultations/:id/prescription, swap the
// localStorage write for a POST.

import { useState } from "react";

export interface MedicineRow {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
}

export interface ConsultPrescription {
  symptoms: string;
  diagnosis: string;
  notes: string;
  medicines: MedicineRow[];
  doctorName: string;
  patientName: string;
  specialty: string;
  issuedAt: string;
}

interface Props {
  roomId: string;
  doctorName: string;
  patientName: string;
  specialty: string;
  onEndCall: () => void;
}

const EMPTY_MED: MedicineRow = { name: "", dose: "", frequency: "", duration: "" };

export default function DoctorNotesPanel({
  roomId,
  doctorName,
  patientName,
  specialty,
  onEndCall,
}: Props) {
  const [open, setOpen] = useState(true);
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState<MedicineRow[]>([{ ...EMPTY_MED }]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const updateMed = (i: number, patch: Partial<MedicineRow>) => {
    setMedicines((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  };
  const addMed = () => setMedicines((prev) => [...prev, { ...EMPTY_MED }]);
  const removeMed = (i: number) =>
    setMedicines((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const handleSend = () => {
    setSending(true);
    const payload: ConsultPrescription = {
      symptoms: symptoms.trim(),
      diagnosis: diagnosis.trim(),
      notes: notes.trim(),
      medicines: medicines.filter((m) => m.name.trim() !== ""),
      doctorName,
      patientName,
      specialty,
      issuedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(`odudoc:rx:${roomId}`, JSON.stringify(payload));
    } catch {
      // localStorage full / disabled — still end the call gracefully
    }
    setSent(true);
    // Short delay so the doctor sees the "Sent" confirmation before we leave
    setTimeout(() => {
      onEndCall();
    }, 900);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-lg bg-primary-600 px-3 py-4 text-xs font-semibold text-white shadow-lg hover:bg-primary-700"
        style={{ writingMode: "vertical-rl" }}
      >
        Patient Notes
      </button>
    );
  }

  return (
    <aside className="fixed right-0 top-0 z-40 flex h-screen w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Patient
          </p>
          <p className="text-sm font-semibold text-gray-900">{patientName || "Patient"}</p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
          aria-label="Hide panel"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Symptoms
          </label>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            rows={3}
            placeholder="e.g. Sore throat for 3 days, mild fever, dry cough"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Diagnosis
          </label>
          <textarea
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            rows={2}
            placeholder="e.g. Acute viral pharyngitis"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Medicines
            </label>
            <button
              type="button"
              onClick={addMed}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700"
            >
              + Add
            </button>
          </div>
          <div className="space-y-3">
            {medicines.map((m, i) => (
              <div key={i} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-start gap-2">
                  <input
                    value={m.name}
                    onChange={(e) => updateMed(i, { name: e.target.value })}
                    placeholder="Medicine name"
                    className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                  />
                  {medicines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMed(i)}
                      className="rounded p-1 text-red-500 hover:bg-red-50"
                      aria-label="Remove medicine"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 3h4" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <input
                    value={m.dose}
                    onChange={(e) => updateMed(i, { dose: e.target.value })}
                    placeholder="Dose"
                    className="rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
                  />
                  <input
                    value={m.frequency}
                    onChange={(e) => updateMed(i, { frequency: e.target.value })}
                    placeholder="Frequency"
                    className="rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
                  />
                  <input
                    value={m.duration}
                    onChange={(e) => updateMed(i, { duration: e.target.value })}
                    placeholder="Duration"
                    className="rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Doctor&apos;s Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any follow-up advice, lifestyle recommendations, etc."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
        {sent ? (
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-green-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Prescription sent to patient
          </div>
        ) : (
          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60"
          >
            {sending ? "Sending…" : "End & Send Prescription"}
          </button>
        )}
        <p className="mt-2 text-center text-xs text-gray-400">
          Patient receives this immediately after the call ends.
        </p>
      </div>
    </aside>
  );
}
