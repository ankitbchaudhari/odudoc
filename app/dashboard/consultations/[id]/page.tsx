"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Consultation, MedicalHistory } from "@/lib/consultations-store";

const EMPTY_MH: MedicalHistory = {
  chiefComplaint: "",
  symptoms: "",
  duration: "",
  severity: "",
  allergies: "",
  currentMedications: "",
  pastConditions: "",
  surgeries: "",
  familyHistory: "",
  smoker: "",
  alcohol: "",
  pregnant: "",
  additional: "",
};

export default function PatientConsultationDetail() {
  const params = useParams<{ id: string }>();
  const [c, setC] = useState<Consultation | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [savingMh, setSavingMh] = useState(false);
  const [respondingAvail, setRespondingAvail] = useState(false);
  const [mh, setMh] = useState<MedicalHistory>(EMPTY_MH);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    const res = await fetch(`/api/consultations/${params.id}`);
    const data = await res.json();
    if (res.ok) {
      setC(data.consultation);
      if (data.consultation?.medicalHistory) setMh(data.consultation.medicalHistory);
    }
  };

  useEffect(() => { if (params.id) load(); }, [params.id]);

  // Poll for availability-request updates when consultation is active.
  useEffect(() => {
    if (!c) return;
    if (c.status === "completed" || c.status === "rejected" || c.status === "refunded") return;
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.status]);

  const onUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { setError("File exceeds 10MB"); return; }
    setUploading(true); setError("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const res = await fetch(`/api/consultations/${params.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, mime: file.type, size: file.size, dataUrl }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Upload failed"); return; }
      await load();
    } finally { setUploading(false); }
  };

  const submitMh = async () => {
    const scrollToForm = () => {
      const el = document.getElementById("mh-form");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    if (!mh.chiefComplaint.trim() || mh.chiefComplaint.trim().length < 3) {
      setError("Please describe your chief complaint (at least 3 characters) — it's the first field at the top of this form.");
      scrollToForm();
      return;
    }
    if (!mh.symptoms.trim() || mh.symptoms.trim().length < 3) {
      setError("Please describe your symptoms (at least 3 characters).");
      scrollToForm();
      return;
    }
    setSavingMh(true); setError("");
    try {
      const res = await fetch(`/api/consultations/${params.id}/medical-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mh),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save"); return; }
      setC(data.consultation);
    } finally { setSavingMh(false); }
  };

  const respondAvailability = async (available: boolean) => {
    setRespondingAvail(true); setError("");
    try {
      const res = await fetch(`/api/consultations/${params.id}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); return; }
      setC(data.consultation);
    } finally { setRespondingAvail(false); }
  };

  if (!c) return <div className="p-12 text-center text-gray-500">Loading…</div>;

  const hasMh = !!c.medicalHistorySubmittedAt || !!c.medicalHistory?.chiefComplaint?.trim();
  const showMhForm = !hasMh && (c.status === "awaiting_doctor" || c.status === "approved" || c.status === "rescheduled");
  const availReq = c.availabilityRequest;
  const showAvailPrompt = !!availReq && availReq.respondedAt == null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/dashboard/consultations" className="mb-4 inline-block text-sm text-primary-600 hover:underline">← All consultations</Link>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Consultation with {c.doctorName}</h1>
              <p className="text-sm text-gray-500">{c.specialty} · {c.dateLabel} at {c.timeSlot}</p>
            </div>
            <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">{c.status.replace(/_/g, " ")}</span>
          </div>

          {c.status === "rejected" && c.refund && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <p className="font-medium">Consultation cancelled — refund processed</p>
              <p className="mt-1">${c.refund.amount} refunded via {c.refund.provider}. It may take 3–5 business days to show on your statement.</p>
              {c.decision?.reason && <p className="mt-1 text-xs">Doctor&apos;s note: {c.decision.reason}</p>}
            </div>
          )}

          {c.status === "in_progress" && c.roomId && (
            <Link href={`/consultation/${c.roomId}`}
              className="mt-4 block rounded-xl bg-green-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-green-700">
              🎥 Doctor has started the call — Join now →
            </Link>
          )}

          {c.status === "approved" && c.roomId && (
            <Link href={`/consultation/${c.roomId}`}
              className="mt-4 block rounded-xl bg-primary-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-primary-700">
              Join video consultation →
            </Link>
          )}

          {c.status === "rescheduled" && c.decision?.rescheduleSlot && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              Your consultation has been rescheduled to <strong>{c.decision.rescheduleSlot}</strong>.
            </div>
          )}
        </div>

        {/* Availability ping from doctor */}
        {showAvailPrompt && (
          <div className="mb-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 shadow-sm animate-pulse">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-lg text-white">📞</div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900">{c.doctorName} wants to start the consultation now</p>
                <p className="text-sm text-amber-800">{availReq?.message || "Are you available for the video call right now?"}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => respondAvailability(true)} disabled={respondingAvail}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                ✓ Yes, I&apos;m available
              </button>
              <button onClick={() => respondAvailability(false)} disabled={respondingAvail}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Not right now
              </button>
            </div>
          </div>
        )}

        {availReq?.respondedAt && availReq.available === true && c.status !== "in_progress" && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            ✓ You confirmed availability. Waiting for {c.doctorName} to start the call…
          </div>
        )}

        {/* Medical history form — MUST be completed before doctor can start */}
        {showMhForm && (
          <div id="mh-form" className="mb-6 rounded-2xl border-2 border-primary-300 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900">Complete your medical history</h2>
              <p className="mt-1 text-sm text-gray-600">Your doctor needs this information before starting the consultation. Fields marked * are required.</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <MhField wide required label="Chief complaint *" placeholder="e.g. Sore throat and fever for 3 days"
                value={mh.chiefComplaint} onChange={(v) => setMh({ ...mh, chiefComplaint: v })}
                invalid={!!error && (!mh.chiefComplaint.trim() || mh.chiefComplaint.trim().length < 3)} />
              <MhField wide required label="Symptoms *" placeholder="Describe all symptoms you're experiencing" textarea
                value={mh.symptoms} onChange={(v) => setMh({ ...mh, symptoms: v })}
                invalid={!!error && (!mh.symptoms.trim() || mh.symptoms.trim().length < 3)} />
              <MhField label="Duration" placeholder="e.g. 3 days"
                value={mh.duration} onChange={(v) => setMh({ ...mh, duration: v })} />
              <MhSelect label="Severity" value={mh.severity} onChange={(v) => setMh({ ...mh, severity: v as MedicalHistory["severity"] })}
                options={[["", "Select"], ["mild", "Mild"], ["moderate", "Moderate"], ["severe", "Severe"]]} />
              <MhField label="Allergies" placeholder="e.g. Penicillin, peanuts"
                value={mh.allergies} onChange={(v) => setMh({ ...mh, allergies: v })} />
              <MhField label="Current medications" placeholder="List any medicines you're taking"
                value={mh.currentMedications} onChange={(v) => setMh({ ...mh, currentMedications: v })} />
              <MhField label="Past medical conditions" placeholder="e.g. Diabetes, hypertension"
                value={mh.pastConditions} onChange={(v) => setMh({ ...mh, pastConditions: v })} />
              <MhField label="Previous surgeries" placeholder="e.g. Appendectomy 2019"
                value={mh.surgeries} onChange={(v) => setMh({ ...mh, surgeries: v })} />
              <MhField label="Family history" placeholder="Relevant family medical history"
                value={mh.familyHistory} onChange={(v) => setMh({ ...mh, familyHistory: v })} />
              <MhSelect label="Smoker" value={mh.smoker} onChange={(v) => setMh({ ...mh, smoker: v as MedicalHistory["smoker"] })}
                options={[["", "Select"], ["no", "No"], ["yes", "Yes"], ["former", "Former"]]} />
              <MhSelect label="Alcohol" value={mh.alcohol} onChange={(v) => setMh({ ...mh, alcohol: v as MedicalHistory["alcohol"] })}
                options={[["", "Select"], ["never", "Never"], ["occasional", "Occasional"], ["regular", "Regular"]]} />
              <MhSelect label="Pregnant" value={mh.pregnant} onChange={(v) => setMh({ ...mh, pregnant: v as MedicalHistory["pregnant"] })}
                options={[["", "Select"], ["na", "N/A"], ["no", "No"], ["yes", "Yes"]]} />
              <MhField wide label="Additional notes" placeholder="Anything else the doctor should know" textarea
                value={mh.additional} onChange={(v) => setMh({ ...mh, additional: v })} />
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}

            <button onClick={submitMh} disabled={savingMh}
              className="mt-5 w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
              {savingMh ? "Saving…" : "Submit medical history"}
            </button>
          </div>
        )}

        {hasMh && (c.status === "awaiting_doctor" || c.status === "approved") && !c.roomId && !showAvailPrompt && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-700">
              ✓ Medical history submitted. {c.status === "awaiting_doctor"
                ? "Waiting for the doctor to approve your consultation."
                : "The doctor will start the video call shortly — you'll get a prompt here."}
            </p>
          </div>
        )}

        {c.prescriptionId && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-gray-900">Your prescription</h2>
            <div className="flex flex-wrap gap-2">
              <Link href={`/prescription/${c.prescriptionId}`}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                View & download PDF
              </Link>
              <Link href={`/shop?rx=${c.prescriptionId}`}
                className="rounded-lg border border-primary-600 px-4 py-2 text-sm font-semibold text-primary-600 hover:bg-primary-50">
                Buy medicines online
              </Link>
            </div>
            <p className="mt-3 text-xs text-gray-500">You can also take this prescription to any pharmacy offline.</p>
          </div>
        )}

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Shared documents</h2>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
              {uploading ? "Uploading…" : "+ Upload"}
            </button>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
          </div>
          <p className="mb-3 text-xs text-gray-500">Share lab reports, previous prescriptions, or photos with your doctor (max 10MB).</p>
          {error && !showMhForm && <p className="mb-2 text-sm text-red-600">{error}</p>}
          {c.documents.length === 0 ? (
            <p className="text-sm text-gray-400">No documents uploaded yet.</p>
          ) : (
            <ul className="space-y-2">
              {c.documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.name}</p>
                    <p className="text-xs text-gray-500">{(d.size / 1024).toFixed(1)} KB · from {d.uploadedBy}</p>
                  </div>
                  <a href={d.dataUrl} download={d.name} className="text-sm text-primary-600 hover:underline">Download</a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-gray-900">Booking summary</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Row label="Fee" value={`$${c.fee}`} />
            <Row label="Payment" value={c.paymentStatus} />
            <Row label="Chief complaint" value={c.medicalHistory.chiefComplaint || "—"} />
            <Row label="Duration" value={c.medicalHistory.duration || "—"} />
          </dl>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function MhField({
  label, value, onChange, placeholder, wide, textarea, required, invalid,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; wide?: boolean; textarea?: boolean; required?: boolean; invalid?: boolean }) {
  const borderCls = invalid ? "border-red-400 ring-1 ring-red-200" : "border-gray-200 focus:border-primary-500";
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      {textarea ? (
        <textarea rows={3} required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full rounded-lg border ${borderCls} px-3 py-2 text-sm outline-none`} />
      ) : (
        <input required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full rounded-lg border ${borderCls} px-3 py-2 text-sm outline-none`} />
      )}
    </div>
  );
}

function MhSelect({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
