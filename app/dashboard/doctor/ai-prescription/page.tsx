"use client";

// AI Prescription Assistant — 3-step wizard.
// Step 1: patient details (age, sex, symptoms, history, allergies, …).
// Step 2: pick from AI-suggested differential diagnoses.
// Step 3: review AI-suggested investigations, medications, advice.
//
// Nothing is saved here — the doctor copies the result into their
// normal prescription flow. This keeps the AI strictly advisory.

import { useState } from "react";
import Link from "next/link";

interface PatientForm {
  name: string;
  age: string;
  sex: string;
  symptoms: string;
  duration: string;
  history: string;
  allergies: string;
  medications: string;
  vitals: string;
}

interface Diagnosis {
  name: string;
  confidence: string;
  rationale: string;
  redFlags?: string[];
}

interface Medication {
  name: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

interface Investigation {
  name: string;
  why?: string;
}

interface TreatmentResponse {
  investigations: Investigation[];
  medications: Medication[];
  advice?: string[];
  followUp?: string;
  redFlags?: string[];
}

const EMPTY: PatientForm = {
  name: "",
  age: "",
  sex: "",
  symptoms: "",
  duration: "",
  history: "",
  allergies: "",
  medications: "",
  vitals: "",
};

export default function AiPrescriptionPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [patient, setPatient] = useState<PatientForm>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [generalNotes, setGeneralNotes] = useState<string>("");
  const [selectedDx, setSelectedDx] = useState<string>("");
  const [treatment, setTreatment] = useState<TreatmentResponse | null>(null);

  const update = (k: keyof PatientForm, v: string) =>
    setPatient((p) => ({ ...p, [k]: v }));

  async function requestDiagnoses() {
    if (!patient.symptoms.trim()) {
      setError("Please enter at least the patient's symptoms.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/doctor/ai-prescription/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "diagnosis", patient }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setDiagnoses(data.diagnoses || []);
      setGeneralNotes(data.generalNotes || "");
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function requestTreatment(dx: string) {
    setSelectedDx(dx);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/doctor/ai-prescription/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "treatment", diagnosis: dx, patient }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setTreatment({
        investigations: data.investigations || [],
        medications: data.medications || [],
        advice: data.advice || [],
        followUp: data.followUp,
        redFlags: data.redFlags || [],
      });
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPatient(EMPTY);
    setDiagnoses([]);
    setTreatment(null);
    setSelectedDx("");
    setError(null);
    setStep(1);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white py-10">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              AI Prescription Assistant
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Get AI-suggested diagnoses and treatments. All outputs are
              advisory — review before prescribing.
            </p>
          </div>
          <Link
            href="/dashboard/doctor"
            className="text-sm font-semibold text-indigo-600 hover:underline"
          >
            ← Back
          </Link>
        </div>

        {/* Stepper */}
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold">
          <Chip active={step >= 1} done={step > 1} n={1} label="Patient" />
          <div className="h-px flex-1 bg-gray-200" />
          <Chip active={step >= 2} done={step > 2} n={2} label="Diagnosis" />
          <div className="h-px flex-1 bg-gray-200" />
          <Chip active={step >= 3} done={false} n={3} label="Treatment" />
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Patient details</h2>
            <p className="mt-1 text-sm text-gray-600">
              At minimum, fill in age, sex, and symptoms.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Name (optional)">
                <input
                  value={patient.name}
                  onChange={(e) => update("name", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Age">
                <input
                  value={patient.age}
                  onChange={(e) => update("age", e.target.value)}
                  placeholder="e.g. 34"
                  className="input"
                />
              </Field>
              <Field label="Sex">
                <select
                  value={patient.sex}
                  onChange={(e) => update("sex", e.target.value)}
                  className="input"
                >
                  <option value="">Select…</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </Field>
              <Field label="Symptom duration">
                <input
                  value={patient.duration}
                  onChange={(e) => update("duration", e.target.value)}
                  placeholder="e.g. 3 days"
                  className="input"
                />
              </Field>
              <Field label="Symptoms" wide>
                <textarea
                  value={patient.symptoms}
                  onChange={(e) => update("symptoms", e.target.value)}
                  rows={3}
                  placeholder="Fever, dry cough, headache…"
                  className="input"
                />
              </Field>
              <Field label="Medical history" wide>
                <textarea
                  value={patient.history}
                  onChange={(e) => update("history", e.target.value)}
                  rows={2}
                  placeholder="Diabetes, hypertension, prior surgeries…"
                  className="input"
                />
              </Field>
              <Field label="Allergies">
                <input
                  value={patient.allergies}
                  onChange={(e) => update("allergies", e.target.value)}
                  placeholder="Penicillin, sulfa…"
                  className="input"
                />
              </Field>
              <Field label="Current medications">
                <input
                  value={patient.medications}
                  onChange={(e) => update("medications", e.target.value)}
                  placeholder="Metformin 500mg BD…"
                  className="input"
                />
              </Field>
              <Field label="Vitals (optional)" wide>
                <input
                  value={patient.vitals}
                  onChange={(e) => update("vitals", e.target.value)}
                  placeholder="BP 130/85, HR 88, Temp 38.2°C, SpO2 97%"
                  className="input"
                />
              </Field>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={requestDiagnoses}
                disabled={loading}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "Analyzing…" : "Suggest diagnoses →"}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Differential diagnoses
              </h2>
              <button
                onClick={() => setStep(1)}
                className="text-sm font-semibold text-gray-600 hover:text-gray-900"
              >
                ← Edit patient
              </button>
            </div>
            {generalNotes && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {generalNotes}
              </p>
            )}
            <p className="mt-3 text-sm text-gray-600">
              Pick the diagnosis you want to treat. AI ranking is advisory.
            </p>
            <ul className="mt-4 space-y-3">
              {diagnoses.map((d, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-gray-200 p-4 transition hover:border-indigo-400 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{d.name}</h3>
                        <ConfidenceBadge level={d.confidence} />
                      </div>
                      <p className="mt-1 text-sm text-gray-700">{d.rationale}</p>
                      {d.redFlags && d.redFlags.length > 0 && (
                        <p className="mt-2 text-xs text-rose-700">
                          <b>Red flags:</b> {d.redFlags.join(", ")}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => requestTreatment(d.name)}
                      disabled={loading}
                      className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {loading && selectedDx === d.name ? "Loading…" : "Select"}
                    </button>
                  </div>
                </li>
              ))}
              {diagnoses.length === 0 && (
                <li className="text-sm text-gray-500">
                  No suggestions returned. Try adding more detail.
                </li>
              )}
            </ul>
          </div>
        )}

        {step === 3 && treatment && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    Selected diagnosis
                  </p>
                  <h2 className="text-lg font-bold text-gray-900">{selectedDx}</h2>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="text-sm font-semibold text-gray-600 hover:text-gray-900"
                >
                  ← Other diagnoses
                </button>
              </div>
            </div>

            <Section title="Suggested investigations">
              {treatment.investigations.length === 0 ? (
                <p className="text-sm text-gray-500">None suggested.</p>
              ) : (
                <ul className="space-y-2">
                  {treatment.investigations.map((iv, i) => (
                    <li key={i} className="rounded-lg bg-gray-50 p-3">
                      <p className="font-medium text-gray-900">{iv.name}</p>
                      {iv.why && (
                        <p className="mt-0.5 text-xs text-gray-600">{iv.why}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Suggested medications">
              {treatment.medications.length === 0 ? (
                <p className="text-sm text-gray-500">None suggested.</p>
              ) : (
                <ul className="space-y-3">
                  {treatment.medications.map((m, i) => (
                    <li key={i} className="rounded-lg border border-gray-200 p-3">
                      <p className="font-semibold text-gray-900">{m.name}</p>
                      <p className="mt-0.5 text-sm text-gray-700">
                        {[m.dose, m.frequency, m.duration].filter(Boolean).join(" · ")}
                      </p>
                      {m.instructions && (
                        <p className="mt-1 text-xs text-gray-600">{m.instructions}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {treatment.advice && treatment.advice.length > 0 && (
              <Section title="Advice">
                <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                  {treatment.advice.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </Section>
            )}

            {treatment.followUp && (
              <Section title="Follow-up">
                <p className="text-sm text-gray-700">{treatment.followUp}</p>
              </Section>
            )}

            {treatment.redFlags && treatment.redFlags.length > 0 && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                <h3 className="font-bold text-rose-900">
                  Red-flag symptoms — patient must return urgently
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-800">
                  {treatment.redFlags.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard/doctor/prescriptions"
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700"
              >
                Write prescription →
              </Link>
              <button
                onClick={reset}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Start over
              </button>
              <span className="text-xs text-gray-500">
                AI suggestions only. Verify doses and contraindications before
                prescribing.
              </span>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #d1d5db;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        :global(.input:focus) {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
      `}</style>
    </div>
  );
}

function Chip({
  active,
  done,
  n,
  label,
}: {
  active: boolean;
  done: boolean;
  n: number;
  label: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${
        active
          ? "bg-indigo-600 text-white"
          : done
          ? "bg-emerald-100 text-emerald-800"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
          active ? "bg-white/20" : "bg-white"
        }`}
      >
        {done ? "✓" : n}
      </span>
      <span>{label}</span>
    </div>
  );
}

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${wide ? "md:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-semibold text-gray-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ConfidenceBadge({ level }: { level: string }) {
  const l = (level || "").toLowerCase();
  const cls =
    l === "high"
      ? "bg-emerald-100 text-emerald-800"
      : l === "medium"
      ? "bg-amber-100 text-amber-800"
      : "bg-gray-100 text-gray-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {level || "n/a"}
    </span>
  );
}
