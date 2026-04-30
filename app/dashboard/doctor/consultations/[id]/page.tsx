"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Consultation } from "@/lib/consultations-store";
import { PRESCRIPTION_TEMPLATES } from "@/lib/prescription-templates";
import AiPreVisitIntakeCard from "@/components/AiPreVisitIntakeCard";
import ReferralModal from "@/components/ReferralModal";
import { useReferrals, statusStyle, urgencyStyle } from "@/lib/referrals-store";

type Med = { name: string; dose: string; frequency: string; duration: string; instructions?: string };

export default function DoctorConsultationDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [c, setC] = useState<Consultation | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState("");
  const [tab, setTab] = useState<"details" | "documents" | "prescribe">("details");
  const [error, setError] = useState("");
  const [referralOpen, setReferralOpen] = useState(false);
  const { items: allReferrals } = useReferrals();

  // prescription form
  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [templateId, setTemplateId] = useState("classic-blue");
  const [meds, setMeds] = useState<Med[]>([{ name: "", dose: "", frequency: "", duration: "", instructions: "" }]);

  const load = async () => {
    const res = await fetch(`/api/consultations/${params.id}`);
    const data = await res.json();
    if (res.ok) setC(data.consultation);
  };

  useEffect(() => { if (params.id) load(); }, [params.id]);

  // Poll every 10s while consultation is active so doctor sees patient
  // availability response and live status updates.
  useEffect(() => {
    if (!c) return;
    if (c.status === "completed" || c.status === "rejected" || c.status === "refunded") return;
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.status]);

  const requestAvailability = async () => {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/consultations/${params.id}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "The doctor is ready to start your consultation. Are you available now?" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); return; }
      setC(data.consultation);
    } finally { setBusy(false); }
  };

  const startCall = async () => {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/consultations/${params.id}/start`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); return; }
      setC(data.consultation);
      if (data.roomId) router.push(`/consultation/${data.roomId}`);
    } finally { setBusy(false); }
  };

  const decide = async (action: "approved" | "rejected" | "rescheduled") => {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/consultations/${params.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason, rescheduleSlot, rescheduleTo: rescheduleSlot ? new Date().toISOString() : undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); return; }
      setC(data.consultation);
    } finally { setBusy(false); }
  };

  const setMed = (i: number, patch: Partial<Med>) =>
    setMeds((m) => m.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const addMed = () => setMeds((m) => [...m, { name: "", dose: "", frequency: "", duration: "", instructions: "" }]);
  const removeMed = (i: number) => setMeds((m) => m.filter((_, idx) => idx !== i));

  const submitPrescription = async () => {
    const validMeds = meds.filter((m) => m.name.trim().length > 0);
    if (validMeds.length === 0) { setError("Add at least one medicine."); return; }
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/consultations/${params.id}/prescribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          data: { diagnosis, advice, followUp, medications: validMeds },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); return; }
      router.push(`/prescription/${data.prescription.id}`);
    } finally { setBusy(false); }
  };

  if (!c) return <div className="p-12 text-center text-gray-500">Loading…</div>;

  const mh = c.medicalHistory;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/dashboard/doctor/consultations" className="mb-4 inline-block text-sm text-primary-600 hover:underline">← Back to consultations</Link>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{c.patientName}</h1>
            <p className="text-sm text-gray-500">{c.patientEmail} · {c.patientPhone}</p>
            <p className="mt-1 text-sm text-gray-500">{c.specialty} · {c.dateLabel} at {c.timeSlot}</p>
          </div>
          <div className="text-right">
            <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">{c.status.replace(/_/g, " ")}</span>
            <p className="mt-2 text-sm font-bold text-gray-900">${c.fee} {c.currency}</p>
            <p className="text-xs text-gray-400">{c.paymentStatus}</p>
          </div>
        </div>

        {c.status === "awaiting_doctor" && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-gray-900">Action required</h2>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-600">Note (optional — shared with patient)</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. emergency surgery, will reschedule"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-gray-600">Reschedule slot (only if rescheduling)</label>
              <input value={rescheduleSlot} onChange={(e) => setRescheduleSlot(e.target.value)}
                placeholder="e.g. Tomorrow 3:00 PM"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => decide("approved")} disabled={busy}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                ✓ Approve
              </button>
              <button onClick={() => decide("rescheduled")} disabled={busy || !rescheduleSlot}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                ↻ Reschedule
              </button>
              <button onClick={() => decide("rejected")} disabled={busy}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                ✕ Reject & Refund
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        )}

        {/* AI pre-visit intake — only renders once the patient has
            actually submitted their history. Saves the doctor 30s of
            scrolling through the raw form by surfacing a clinical
            headline + red flags + suggested questions. */}
        {!!c.medicalHistory?.chiefComplaint?.trim() && c.status !== "rejected" && c.status !== "refunded" && (
          <div className="mb-6">
            <AiPreVisitIntakeCard
              history={c.medicalHistory}
              specialty={c.specialty}
            />
          </div>
        )}

        {/* Medical history gate */}
        {!c.medicalHistory?.chiefComplaint?.trim() && c.status !== "rejected" && c.status !== "refunded" && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-sm font-semibold text-amber-900">⚠ Patient hasn&apos;t submitted medical history yet</p>
            <p className="mt-1 text-xs text-amber-800">You can&apos;t start the consultation until the patient completes their medical history form. We&apos;ll notify them automatically.</p>
          </div>
        )}

        {/* Start consultation flow — approved + has medical history */}
        {(c.status === "approved" || c.status === "rescheduled" || c.status === "in_progress") && !!c.medicalHistory?.chiefComplaint?.trim() && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-gray-900">Start consultation</h2>

            {!c.availabilityRequest && c.status !== "in_progress" && (
              <>
                <p className="mb-3 text-sm text-gray-600">Ping the patient to confirm they&apos;re available now, then start the video call.</p>
                <button onClick={requestAvailability} disabled={busy}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
                  📞 Request availability
                </button>
              </>
            )}

            {c.availabilityRequest && !c.availabilityRequest.respondedAt && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Waiting for patient to respond… <span className="text-xs text-amber-700">(sent {new Date(c.availabilityRequest.requestedAt).toLocaleTimeString()})</span>
                <button onClick={requestAvailability} disabled={busy} className="ml-3 text-xs underline hover:no-underline">Ping again</button>
              </div>
            )}

            {c.availabilityRequest?.respondedAt && c.availabilityRequest.available === false && (
              <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                Patient said they&apos;re not available right now.
                <button onClick={requestAvailability} disabled={busy} className="ml-3 text-xs underline hover:no-underline">Ping again</button>
              </div>
            )}

            {c.availabilityRequest?.respondedAt && c.availabilityRequest.available === true && c.status !== "in_progress" && (
              <>
                <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  ✓ Patient confirmed availability. Ready to start the video call.
                </div>
                <button onClick={startCall} disabled={busy}
                  className="w-full rounded-xl bg-primary-600 py-3 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50">
                  🎥 Start video call now
                </button>
              </>
            )}

            {c.status === "in_progress" && c.roomId && (
              <Link href={`/consultation/${c.roomId}`}
                className="block rounded-xl bg-green-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-green-700">
                🎥 Call in progress — rejoin video →
              </Link>
            )}

            {/* Skip-the-ping option */}
            {(c.status === "approved" || c.status === "rescheduled") && !c.roomId && (
              <button onClick={startCall} disabled={busy}
                className="mt-3 text-xs text-gray-500 underline hover:text-gray-700">
                Skip and start call immediately
              </button>
            )}
          </div>
        )}

        {/* Refer to another doctor */}
        {c.status !== "rejected" && c.status !== "refunded" && c.status !== "cancelled" && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Refer to another doctor</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Need a specialist opinion? Send {c.patientName.split(" ")[0]}&apos;s case to a colleague.
                </p>
              </div>
              <button
                onClick={() => setReferralOpen(true)}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                ↗ Refer patient
              </button>
            </div>

            {(() => {
              const relevant = allReferrals.filter(
                (r) => r.sourceConsultationId === c.id || (r.patientEmail === c.patientEmail && r.fromDoctorId === c.doctorId)
              );
              if (relevant.length === 0) return null;
              return (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Referrals for this patient ({relevant.length})
                  </p>
                  {relevant.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          → {r.toDoctorName}{" "}
                          <span className="text-xs font-normal text-gray-500">({r.toSpecialty})</span>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-gray-500">{r.reason}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${urgencyStyle(r.urgency)}`}>
                          {r.urgency}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusStyle(r.status)}`}>
                          {r.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  <Link
                    href="/dashboard/doctor/referrals"
                    className="inline-block text-xs font-medium text-primary-600 hover:underline"
                  >
                    View all referrals →
                  </Link>
                </div>
              );
            })()}
          </div>
        )}

        <div className="mb-4 flex gap-2 border-b border-gray-200">
          {(["details", "documents", "prescribe"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium ${
                tab === t ? "border-b-2 border-primary-600 text-primary-700" : "text-gray-500 hover:text-gray-700"
              }`}>
              {t[0].toUpperCase() + t.slice(1)}
              {t === "documents" && ` (${c.documents.length})`}
            </button>
          ))}
        </div>

        {tab === "details" && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-gray-900">Medical history</h3>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Field label="Chief complaint" value={mh.chiefComplaint} wide />
              <Field label="Symptoms" value={mh.symptoms} wide />
              <Field label="Duration" value={mh.duration} />
              <Field label="Severity" value={mh.severity} />
              <Field label="Allergies" value={mh.allergies} />
              <Field label="Current medications" value={mh.currentMedications} />
              <Field label="Past conditions" value={mh.pastConditions} />
              <Field label="Surgeries" value={mh.surgeries} />
              <Field label="Family history" value={mh.familyHistory} />
              <Field label="Smoker" value={mh.smoker} />
              <Field label="Alcohol" value={mh.alcohol} />
              <Field label="Pregnant" value={mh.pregnant} />
              <Field label="Additional notes" value={mh.additional} wide />
            </dl>
          </div>
        )}

        {tab === "documents" && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-gray-900">Shared documents</h3>
            {c.documents.length === 0 ? (
              <p className="text-sm text-gray-500">No documents shared yet.</p>
            ) : (
              <ul className="space-y-2">
                {c.documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{d.name}</p>
                      <p className="text-xs text-gray-500">{(d.size / 1024).toFixed(1)} KB · {d.uploadedBy} · {new Date(d.uploadedAt).toLocaleString()}</p>
                    </div>
                    <a href={d.dataUrl} download={d.name} className="text-sm text-primary-600 hover:underline">Download</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "prescribe" && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            {c.prescriptionId ? (
              <div>
                <p className="mb-3 text-sm text-gray-600">Prescription already issued.</p>
                <Link href={`/prescription/${c.prescriptionId}`} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                  View prescription →
                </Link>
              </div>
            ) : (
              <>
                <h3 className="mb-4 text-sm font-bold text-gray-900">Write prescription</h3>

                <div className="mb-4">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Template</label>
                  <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500">
                    {PRESCRIPTION_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Diagnosis</label>
                  <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="e.g. Acute bronchitis"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-xs font-medium text-gray-600">Medications</label>
                  <div className="space-y-3">
                    {meds.map((m, i) => (
                      <div key={i} className="grid gap-2 rounded-lg border border-gray-100 p-3 sm:grid-cols-5">
                        <input value={m.name} onChange={(e) => setMed(i, { name: e.target.value })} placeholder="Medicine"
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 sm:col-span-2" />
                        <input value={m.dose} onChange={(e) => setMed(i, { dose: e.target.value })} placeholder="Dose (500mg)"
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
                        <input value={m.frequency} onChange={(e) => setMed(i, { frequency: e.target.value })} placeholder="Frequency (1-0-1)"
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
                        <input value={m.duration} onChange={(e) => setMed(i, { duration: e.target.value })} placeholder="Duration (5 days)"
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
                        <input value={m.instructions || ""} onChange={(e) => setMed(i, { instructions: e.target.value })} placeholder="Instructions (after meals)"
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 sm:col-span-4" />
                        {meds.length > 1 && (
                          <button onClick={() => removeMed(i)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100">
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={addMed} className="mt-2 text-sm text-primary-600 hover:underline">+ Add medicine</button>
                </div>

                <div className="mb-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Advice</label>
                    <textarea rows={3} value={advice} onChange={(e) => setAdvice(e.target.value)}
                      placeholder="Rest, hydrate, avoid cold drinks..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Follow-up</label>
                    <input value={followUp} onChange={(e) => setFollowUp(e.target.value)}
                      placeholder="Review in 5 days if not better"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
                  </div>
                </div>

                {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

                <button onClick={submitPrescription} disabled={busy}
                  className="w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
                  {busy ? "Saving…" : "Issue prescription & notify patient"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <ReferralModal
        open={referralOpen}
        onClose={() => setReferralOpen(false)}
        patientEmail={c.patientEmail}
        patientName={c.patientName}
        patientPhone={c.patientPhone}
        fromDoctorId={c.doctorId}
        fromDoctorName={c.doctorName}
        fromDoctorEmail={c.doctorEmail}
        fromSpecialty={c.specialty}
        sourceConsultationId={c.id}
        defaultNotes={mh.chiefComplaint ? `Chief complaint: ${mh.chiefComplaint}\n\nSymptoms: ${mh.symptoms || "—"}\nDuration: ${mh.duration || "—"}\nAllergies: ${mh.allergies || "—"}\nCurrent medications: ${mh.currentMedications || "—"}` : ""}
      />
    </div>
  );
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value || <span className="text-gray-400">—</span>}</dd>
    </div>
  );
}
