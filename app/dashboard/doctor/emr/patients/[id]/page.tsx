"use client";

// EMR patient detail — demographics + SOAP visit timeline + inline
// new-visit form. The SOAP form below the timeline keeps the doctor in
// one place: typing a note shouldn't require navigating to another
// page and losing the patient's context.

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  age: string;
  sex: string;
  phone: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Visit {
  id: string;
  visitDate: string;
  chiefComplaint: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  vitals?: string;
  createdAt: string;
}

const EMPTY_VISIT = {
  visitDate: new Date().toISOString().slice(0, 10),
  chiefComplaint: "",
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
  vitals: "",
};

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDemographics, setEditingDemographics] = useState(false);
  const [demoDraft, setDemoDraft] = useState<Partial<Patient>>({});
  const [savingDemo, setSavingDemo] = useState(false);
  const [visitForm, setVisitForm] = useState(EMPTY_VISIT);
  const [savingVisit, setSavingVisit] = useState(false);
  const [visitFormOpen, setVisitFormOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, vRes] = await Promise.all([
        fetch(`/api/emr/patients/${id}`),
        fetch(`/api/emr/visits?patientId=${id}`),
      ]);
      if (!pRes.ok) {
        const data = await pRes.json().catch(() => ({}));
        throw new Error(data.error || "Could not load patient");
      }
      const pData = await pRes.json();
      setPatient(pData.patient);
      setDemoDraft(pData.patient);
      if (vRes.ok) {
        const vData = await vRes.json();
        setVisits(vData.visits || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function saveDemographics() {
    if (!patient) return;
    setSavingDemo(true);
    setError(null);
    try {
      const res = await fetch(`/api/emr/patients/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(demoDraft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setPatient(data.patient);
      setEditingDemographics(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingDemo(false);
    }
  }

  async function deletePatient() {
    if (!confirm("Delete this patient and all their visits? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/emr/patients/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }
      window.location.href = "/dashboard/doctor/emr";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function saveVisit(e: React.FormEvent) {
    e.preventDefault();
    if (!visitForm.chiefComplaint.trim() || !visitForm.assessment.trim() || !visitForm.plan.trim()) {
      setError("Chief complaint, assessment and plan are required.");
      return;
    }
    setSavingVisit(true);
    setError(null);
    try {
      const res = await fetch("/api/emr/visits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patientId: id, ...visitForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setVisits((prev) => [data.visit, ...prev]);
      setVisitForm(EMPTY_VISIT);
      setVisitFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingVisit(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-10">
        <div className="mx-auto max-w-5xl px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-32 rounded-3xl bg-slate-200" />
            <div className="h-64 rounded-3xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl bg-white p-8 text-center shadow">
          <p className="text-sm text-slate-700">{error || "Patient not found."}</p>
          <Link
            href="/dashboard/doctor/emr"
            className="mt-3 inline-block text-sm font-semibold text-emerald-600 hover:underline"
          >
            ← Back to clinic records
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 py-10">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-200/40 via-cyan-200/40 to-indigo-200/40 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4">
        {/* Top nav */}
        <div className="mb-4 flex items-center justify-between text-sm">
          <Link
            href="/dashboard/doctor/emr"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
          >
            ← Clinic records
          </Link>
          <button
            onClick={deletePatient}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
          >
            Delete patient
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        {/* Patient header card */}
        <div className="mb-6 overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl shadow-emerald-500/5 backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-2xl font-bold text-white shadow-lg shadow-emerald-500/30">
                {(patient.firstName[0] || "?").toUpperCase()}
                {(patient.lastName[0] || "").toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {patient.firstName} {patient.lastName}
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  {patient.age && <>{patient.age} yrs · </>}
                  {patient.sex && <>{patient.sex} · </>}
                  {patient.phone}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {patient.bloodGroup && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      {patient.bloodGroup}
                    </span>
                  )}
                  {patient.allergies && (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">
                      ⚠ {patient.allergies}
                    </span>
                  )}
                  {patient.chronicConditions && (
                    <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-100">
                      {patient.chronicConditions}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setEditingDemographics((v) => !v)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              {editingDemographics ? "Cancel" : "Edit details"}
            </button>
          </div>

          {editingDemographics && (
            <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
              <Field label="First name" value={demoDraft.firstName || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, firstName: v }))} />
              <Field label="Last name" value={demoDraft.lastName || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, lastName: v }))} />
              <Field label="Age" value={demoDraft.age || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, age: v }))} />
              <Field label="Sex" value={demoDraft.sex || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, sex: v }))} />
              <Field label="Phone" value={demoDraft.phone || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, phone: v }))} />
              <Field label="Email" value={demoDraft.email || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, email: v }))} />
              <Field label="Address" wide value={demoDraft.address || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, address: v }))} />
              <Field label="Blood group" value={demoDraft.bloodGroup || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, bloodGroup: v }))} />
              <Field label="Allergies" value={demoDraft.allergies || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, allergies: v }))} />
              <Field label="Chronic conditions" wide value={demoDraft.chronicConditions || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, chronicConditions: v }))} />
              <FieldArea label="Notes" wide value={demoDraft.notes || ""} onChange={(v) => setDemoDraft((p) => ({ ...p, notes: v }))} />
              <div className="sm:col-span-2 flex justify-end">
                <button
                  onClick={saveDemographics}
                  disabled={savingDemo}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 disabled:opacity-50"
                >
                  {savingDemo ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick info grid */}
        {!editingDemographics && (patient.address || patient.email || patient.notes) && (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {patient.email && (
              <InfoCard label="Email" value={patient.email} />
            )}
            {patient.address && (
              <InfoCard label="Address" value={patient.address} />
            )}
            {patient.notes && (
              <InfoCard label="Notes" value={patient.notes} wide />
            )}
          </div>
        )}

        {/* Visit timeline */}
        <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Visit history</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {visits.length}
              </span>
            </div>
            <button
              onClick={() => setVisitFormOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                visitFormOpen
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl"
              }`}
            >
              {visitFormOpen ? "Close" : "+ New visit"}
            </button>
          </div>

          {visitFormOpen && (
            <form onSubmit={saveVisit} className="border-b border-slate-100 bg-emerald-50/30 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Visit date"
                  type="date"
                  value={visitForm.visitDate}
                  onChange={(v) => setVisitForm((p) => ({ ...p, visitDate: v }))}
                />
                <Field
                  label="Vitals"
                  value={visitForm.vitals}
                  onChange={(v) => setVisitForm((p) => ({ ...p, vitals: v }))}
                  placeholder="BP 130/85, HR 88, Temp 37.2°C"
                />
                <Field
                  wide
                  required
                  label="Chief complaint"
                  value={visitForm.chiefComplaint}
                  onChange={(v) => setVisitForm((p) => ({ ...p, chiefComplaint: v }))}
                  placeholder="Why is the patient here today?"
                />
                <FieldArea
                  wide
                  label="Subjective (S)"
                  value={visitForm.subjective}
                  onChange={(v) => setVisitForm((p) => ({ ...p, subjective: v }))}
                  placeholder="History of present illness — patient's own words."
                />
                <FieldArea
                  wide
                  label="Objective (O)"
                  value={visitForm.objective}
                  onChange={(v) => setVisitForm((p) => ({ ...p, objective: v }))}
                  placeholder="Examination findings, lab results."
                />
                <FieldArea
                  wide
                  required
                  label="Assessment (A)"
                  value={visitForm.assessment}
                  onChange={(v) => setVisitForm((p) => ({ ...p, assessment: v }))}
                  placeholder="Working diagnosis / clinical impression."
                />
                <FieldArea
                  wide
                  required
                  label="Plan (P)"
                  value={visitForm.plan}
                  onChange={(v) => setVisitForm((p) => ({ ...p, plan: v }))}
                  placeholder="Investigations, medications, follow-up."
                />
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setVisitForm(EMPTY_VISIT);
                    setVisitFormOpen(false);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingVisit}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 disabled:opacity-50"
                >
                  {savingVisit ? "Saving…" : "Save visit"}
                </button>
              </div>
            </form>
          )}

          {visits.length === 0 && !visitFormOpen ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-semibold text-slate-700">No visits logged yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Click <b>+ New visit</b> to record a SOAP note for today's
                consultation.
              </p>
            </div>
          ) : (
            <ol className="relative divide-y divide-slate-100">
              {visits.map((v) => (
                <li key={v.id} className="px-6 py-5">
                  <div className="flex items-start gap-4">
                    <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-cyan-100 text-emerald-700">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                          {v.visitDate}
                        </span>
                        {v.vitals && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {v.vitals}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {v.chiefComplaint}
                      </p>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {v.subjective && (
                          <SoapBlock label="S" tone="cyan" text={v.subjective} />
                        )}
                        {v.objective && (
                          <SoapBlock label="O" tone="violet" text={v.objective} />
                        )}
                        <SoapBlock label="A" tone="amber" text={v.assessment} />
                        <SoapBlock label="P" tone="emerald" text={v.plan} />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-100 bg-white px-4 py-3 ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-slate-800">{value}</p>
    </div>
  );
}

function SoapBlock({
  label,
  tone,
  text,
}: {
  label: string;
  tone: "cyan" | "violet" | "amber" | "emerald";
  text: string;
}) {
  const tones: Record<string, { bg: string; ring: string; text: string }> = {
    cyan: { bg: "bg-cyan-50", ring: "ring-cyan-100", text: "text-cyan-700" },
    violet: { bg: "bg-violet-50", ring: "ring-violet-100", text: "text-violet-700" },
    amber: { bg: "bg-amber-50", ring: "ring-amber-100", text: "text-amber-700" },
    emerald: { bg: "bg-emerald-50", ring: "ring-emerald-100", text: "text-emerald-700" },
  };
  const t = tones[tone];
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <div className="mb-1 flex items-center gap-1.5">
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold ${t.bg} ${t.text} ring-1 ${t.ring}`}
        >
          {label}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
        {text}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  wide,
  required,
  placeholder,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  wide?: boolean;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-semibold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
      />
    </label>
  );
}
function FieldArea({
  label,
  value,
  onChange,
  wide,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  wide?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-semibold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
      />
    </label>
  );
}
