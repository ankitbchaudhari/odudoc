"use client";

// Discharge-summary bench. Editable form on the left, live-rendered
// summary preview on the right. Demonstrates the synthesizer that will
// plug into the encounter form's "Generate discharge summary" button.

import { useEffect, useMemo, useState } from "react";
import { PageHero } from "@/components/admin/PageShell";

interface CodedDx { text: string; icd10?: string; icd10Title?: string }

export default function DischargeSummaryBenchPage() {
  // Sensible default case so the page is interesting on first paint.
  const [form, setForm] = useState({
    patientName: "Ramesh Kumar",
    medicalId: "OD-1234-5678-9012",
    age: "62",
    sex: "male" as "male" | "female" | "other",
    contactPhone: "+91 98765 43210",
    orgName: "OduDoc General Hospital",
    orgAddress: "Banjara Hills, Hyderabad",
    admittingDoctor: "Dr. A. Sharma (Cardiology)",
    consultingDoctors: "Dr. R. Iyer (Endocrinology)",
    admissionDate: "2026-05-04",
    dischargeDate: "2026-05-09",
    ward: "ICU 3",
    bedNo: "12",
    chiefComplaint: "Severe chest pain radiating to left arm with diaphoresis × 2 hours",
    historyOfPresentIllness:
      "62-year-old male, known T2DM and hypertension, presented with sudden-onset retrosternal chest pain at 06:30, radiating to left arm and jaw, associated with diaphoresis and dyspnoea. Pain not relieved by rest. No prior cardiac history.",
    pastMedicalHistory: "Type 2 Diabetes Mellitus × 8 yrs\nEssential hypertension × 12 yrs\nDyslipidaemia\nNo prior MI",
    examinationFindings:
      "Conscious, oriented, distressed. BP 95/60, HR 110, SpO2 94% RA, RR 22, T 37.0. JVP not elevated. Bibasal crackles. Cardiac S1 S2 normal, no murmurs. Abdomen soft.",
    diagnoses:
      "Acute anterior wall ST-elevation myocardial infarction\nType 2 diabetes mellitus with hyperglycaemia\nEssential hypertension\nDyslipidaemia",
    procedures:
      "Primary PCI to LAD with drug-eluting stent | 2026-05-04 | Door-to-balloon 78 min, TIMI 3 flow restored",
    investigations:
      "ECG | Anterior STEMI with ST elevation V1-V4 | 2026-05-04 | abnormal\nTroponin I | Peak 24.5 ng/mL | 2026-05-04 | abnormal\nEcho LVEF | 38% with anterior wall hypokinesia | 2026-05-05 | abnormal\nHbA1c | 8.4% | 2026-05-05 | abnormal\nLipid panel | LDL 162, HDL 32 | 2026-05-05 | abnormal",
    hospitalCourse:
      "Patient underwent successful primary PCI within 90 minutes of arrival. Post-procedure course uncomplicated. Started on standard post-MI regimen including dual antiplatelet therapy. Glycaemic control optimised. Cardiac rehab consultation arranged. Symptom-free at discharge with stable haemodynamics.",
    conditionAtDischarge: "improved" as const,
    dischargeMeds:
      "Aspirin | 75 mg | 1 tab | OD | | lifelong\nClopidogrel | 75 mg | 1 tab | OD | 365 | with food\nAtorvastatin | 80 mg | 1 tab | HS | | lifelong\nMetoprolol | 50 mg | 1 tab | BD | | titrate up\nRamipril | 5 mg | 1 tab | OD | | check creatinine in 1w\nMetformin | 1000 mg | 1 tab | BD | | with meals\nPantoprazole | 40 mg | 1 tab | OD | 30 | before food",
    dietAdvice: "Salt restriction <5 g/day. Diabetic diet, low saturated fat, Mediterranean-style. Avoid red meat. Encourage fruits, vegetables, whole grains.",
    activityAdvice: "Gradual return to activity. Cardiac rehabilitation program × 8 weeks. No heavy lifting >5 kg for 2 weeks. Walking 30 min/day from week 2.",
    followUpDays: "7",
    followUpWith: "Dr. A. Sharma (Cardiology OPD)",
    followUpInstructions: "Bring all medications, BP/sugar logs, and any new symptoms.",
    warnings:
      "Recurrence of chest pain\nShortness of breath at rest\nPalpitations or syncope\nBlood sugar >300 or symptomatic hypoglycaemia\nStent-site bleeding or haematoma",
  });

  const input = useMemo(() => ({
    patient: {
      name: form.patientName,
      medicalId: form.medicalId,
      age: form.age ? Number(form.age) : undefined,
      sex: form.sex,
      contactPhone: form.contactPhone,
    },
    organization: { name: form.orgName, address: form.orgAddress },
    admittingDoctor: form.admittingDoctor,
    consultingDoctors: form.consultingDoctors.split(",").map((s) => s.trim()).filter(Boolean),
    admissionDate: form.admissionDate ? new Date(form.admissionDate).toISOString() : undefined,
    dischargeDate: form.dischargeDate ? new Date(form.dischargeDate).toISOString() : undefined,
    ward: form.ward,
    bedNo: form.bedNo,
    chiefComplaint: form.chiefComplaint,
    historyOfPresentIllness: form.historyOfPresentIllness,
    pastMedicalHistory: form.pastMedicalHistory.split("\n").map((s) => s.trim()).filter(Boolean),
    examinationFindings: form.examinationFindings,
    diagnoses: form.diagnoses.split("\n").map((s) => s.trim()).filter(Boolean),
    procedures: form.procedures.split("\n").map((s) => s.trim()).filter(Boolean).map((line) => {
      const [name, performedAt, notes] = line.split("|").map((x) => x.trim());
      return { name, performedAt: performedAt ? new Date(performedAt).toISOString() : undefined, notes };
    }),
    investigations: form.investigations.split("\n").map((s) => s.trim()).filter(Boolean).map((line) => {
      const [name, result, date, abnormal] = line.split("|").map((x) => x.trim());
      return { name, result, date: date ? new Date(date).toISOString() : undefined, abnormal: abnormal === "abnormal" };
    }),
    hospitalCourse: form.hospitalCourse,
    conditionAtDischarge: form.conditionAtDischarge,
    dischargeMedications: form.dischargeMeds.split("\n").map((s) => s.trim()).filter(Boolean).map((line) => {
      const [drugName, strength, dose, frequency, durationDays, instructions] = line.split("|").map((x) => x.trim());
      return {
        drugName, strength: strength || undefined, dose: dose || undefined,
        frequency: frequency || undefined,
        durationDays: durationDays ? Number(durationDays) : undefined,
        instructions: instructions || undefined,
      };
    }),
    dietAdvice: form.dietAdvice,
    activityAdvice: form.activityAdvice,
    followUp: {
      whenDays: form.followUpDays ? Number(form.followUpDays) : undefined,
      whom: form.followUpWith,
      instructions: form.followUpInstructions,
    },
    warningSignsToReturn: form.warnings.split("\n").map((s) => s.trim()).filter(Boolean),
  }), [form]);

  const [output, setOutput] = useState<{ html: string; markdown: string; structured: { codedDiagnoses: CodedDx[]; primaryIcd10?: string; lengthOfStayDays?: number } } | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"preview" | "markdown" | "json">("preview");

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/clinical/discharge-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!r.ok) return;
        const data = await r.json();
        if (!cancelled) setOutput(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [input]);

  const downloadHtml = () => {
    if (!output) return;
    const blob = new Blob([
      `<!doctype html><html><head><meta charset="utf-8"><title>Discharge Summary</title></head><body>${output.html}</body></html>`,
    ], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `discharge-summary-${form.patientName.replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHero
        icon="📤"
        eyebrow="AI Auto-coding"
        title="Auto-coded Discharge Summary"
        subtitle="Edit the encounter on the left; the discharge summary on the right re-renders in real time with ICD-10 codes auto-attached, medications priority-sorted, and length-of-stay computed. What consultants spend 15–30 minutes per discharge writing by hand is now a 30-second review."
        tone="indigo"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Encounter input</h3>
          <Row>
            <F label="Patient name"><input className="form-input" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} /></F>
            <F label="Medical ID"><input className="form-input" value={form.medicalId} onChange={(e) => setForm({ ...form, medicalId: e.target.value })} /></F>
          </Row>
          <Row>
            <F label="Age"><input className="form-input" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></F>
            <F label="Sex">
              <select className="form-input" value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value as typeof form.sex })}>
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
            </F>
            <F label="Phone"><input className="form-input" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></F>
          </Row>
          <Row>
            <F label="Hospital"><input className="form-input" value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} /></F>
            <F label="Address"><input className="form-input" value={form.orgAddress} onChange={(e) => setForm({ ...form, orgAddress: e.target.value })} /></F>
          </Row>
          <Row>
            <F label="Admitted"><input type="date" className="form-input" value={form.admissionDate} onChange={(e) => setForm({ ...form, admissionDate: e.target.value })} /></F>
            <F label="Discharged"><input type="date" className="form-input" value={form.dischargeDate} onChange={(e) => setForm({ ...form, dischargeDate: e.target.value })} /></F>
            <F label="Ward"><input className="form-input" value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} /></F>
            <F label="Bed"><input className="form-input" value={form.bedNo} onChange={(e) => setForm({ ...form, bedNo: e.target.value })} /></F>
          </Row>
          <F label="Admitting doctor"><input className="form-input" value={form.admittingDoctor} onChange={(e) => setForm({ ...form, admittingDoctor: e.target.value })} /></F>
          <F label="Consulting (comma-separated)"><input className="form-input" value={form.consultingDoctors} onChange={(e) => setForm({ ...form, consultingDoctors: e.target.value })} /></F>

          <F label="Chief complaint"><textarea rows={2} className="form-input" value={form.chiefComplaint} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })} /></F>
          <F label="History of present illness"><textarea rows={3} className="form-input" value={form.historyOfPresentIllness} onChange={(e) => setForm({ ...form, historyOfPresentIllness: e.target.value })} /></F>
          <F label="Past medical history (one per line)"><textarea rows={3} className="form-input font-mono text-xs" value={form.pastMedicalHistory} onChange={(e) => setForm({ ...form, pastMedicalHistory: e.target.value })} /></F>
          <F label="Examination findings"><textarea rows={3} className="form-input" value={form.examinationFindings} onChange={(e) => setForm({ ...form, examinationFindings: e.target.value })} /></F>

          <F label="Diagnoses (one per line — engine auto-codes)"><textarea rows={4} className="form-input font-mono text-xs" value={form.diagnoses} onChange={(e) => setForm({ ...form, diagnoses: e.target.value })} /></F>

          <F label="Procedures (name | date | notes)"><textarea rows={2} className="form-input font-mono text-xs" value={form.procedures} onChange={(e) => setForm({ ...form, procedures: e.target.value })} /></F>

          <F label="Investigations (name | result | date | abnormal)"><textarea rows={4} className="form-input font-mono text-xs" value={form.investigations} onChange={(e) => setForm({ ...form, investigations: e.target.value })} /></F>

          <F label="Hospital course"><textarea rows={3} className="form-input" value={form.hospitalCourse} onChange={(e) => setForm({ ...form, hospitalCourse: e.target.value })} /></F>

          <F label="Condition at discharge">
            <select className="form-input" value={form.conditionAtDischarge} onChange={(e) => setForm({ ...form, conditionAtDischarge: e.target.value as typeof form.conditionAtDischarge })}>
              <option value="improved">Improved</option><option value="stable">Stable</option><option value="transferred">Transferred</option><option value="deteriorated">Deteriorated</option><option value="discharged_against_advice">DAMA</option><option value="deceased">Deceased</option>
            </select>
          </F>

          <F label="Discharge medications (drug | strength | dose | freq | days | instructions)">
            <textarea rows={6} className="form-input font-mono text-xs" value={form.dischargeMeds} onChange={(e) => setForm({ ...form, dischargeMeds: e.target.value })} />
          </F>

          <F label="Diet"><textarea rows={2} className="form-input" value={form.dietAdvice} onChange={(e) => setForm({ ...form, dietAdvice: e.target.value })} /></F>
          <F label="Activity"><textarea rows={2} className="form-input" value={form.activityAdvice} onChange={(e) => setForm({ ...form, activityAdvice: e.target.value })} /></F>

          <Row>
            <F label="Follow-up in (days)"><input className="form-input" value={form.followUpDays} onChange={(e) => setForm({ ...form, followUpDays: e.target.value })} /></F>
            <F label="With"><input className="form-input" value={form.followUpWith} onChange={(e) => setForm({ ...form, followUpWith: e.target.value })} /></F>
          </Row>
          <F label="Follow-up instructions"><input className="form-input" value={form.followUpInstructions} onChange={(e) => setForm({ ...form, followUpInstructions: e.target.value })} /></F>

          <F label="Return-immediately warnings (one per line)"><textarea rows={4} className="form-input" value={form.warnings} onChange={(e) => setForm({ ...form, warnings: e.target.value })} /></F>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {(["preview", "markdown", "json"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`rounded-md px-3 py-1 text-xs font-semibold ${view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{v}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {loading && <span className="text-xs text-slate-500">rendering…</span>}
              {output && (
                <>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{output.structured.codedDiagnoses.filter((d: CodedDx) => d.icd10).length} ICD-10 coded</span>
                  {output.structured.primaryIcd10 && <span className="rounded bg-indigo-100 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700">primary {output.structured.primaryIcd10}</span>}
                  {output.structured.lengthOfStayDays !== undefined && <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">LOS {output.structured.lengthOfStayDays}d</span>}
                </>
              )}
              <button onClick={downloadHtml} disabled={!output} className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">Download HTML</button>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            {output ? (
              view === "preview" ? (
                <div dangerouslySetInnerHTML={{ __html: output.html }} />
              ) : view === "markdown" ? (
                <pre className="whitespace-pre-wrap font-mono text-xs text-slate-800">{output.markdown}</pre>
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-xs text-slate-800">{JSON.stringify(output.structured, null, 2)}</pre>
              )
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">{loading ? "Rendering…" : "Fill the form to see the summary."}</p>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        :global(.form-input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #cbd5e1;
          background: #fff;
          padding: 0.4rem 0.65rem;
          font-size: 0.8125rem;
          color: #0f172a;
        }
        :global(.form-input:focus) {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99,102,241,0.2);
        }
      `}</style>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1">
      <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</label>
      {children}
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}
