"use client";

// Clinical AI bench. Two side-by-side panels:
//   1. Differential-diagnosis copilot — chief complaint + vitals →
//      ranked DDx with red flags
//   2. ICD-10 auto-coder — free-text diagnosis → ranked codes

import { useState } from "react";
import DifferentialPanel from "@/components/DifferentialPanel";
import Icd10Picker from "@/components/Icd10Picker";

export default function ClinicalAIBenchPage() {
  // ── Differential ─────────────────────────────────────────────
  const [chief, setChief] = useState("severe chest pain radiating to left arm with diaphoresis");
  const [modifiers, setModifiers] = useState("dyspnoea, exertional");
  const [age, setAge] = useState("62");
  const [sex, setSex] = useState<"male" | "female" | "other">("male");
  const [vitals, setVitals] = useState({ systolic: "85", diastolic: "60", hr: "118", spo2: "94", tempC: "37.0", rr: "22" });
  const numVitals = {
    systolic: vitals.systolic ? Number(vitals.systolic) : undefined,
    diastolic: vitals.diastolic ? Number(vitals.diastolic) : undefined,
    hr: vitals.hr ? Number(vitals.hr) : undefined,
    spo2: vitals.spo2 ? Number(vitals.spo2) : undefined,
    tempC: vitals.tempC ? Number(vitals.tempC) : undefined,
    rr: vitals.rr ? Number(vitals.rr) : undefined,
  };

  // ── ICD-10 ───────────────────────────────────────────────────
  const [icdQuery, setIcdQuery] = useState("type 2 diabetes with high sugar");
  const [pickedCodes, setPickedCodes] = useState<Array<{ code: string; title: string }>>([]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Clinical AI Bench</h2>
        <p className="mt-1 text-sm text-gray-500">
          Two AI assists for the encounter form: a differential-diagnosis copilot that turns chief complaint + vitals into a ranked DDx with red flags, and an ICD-10 auto-coder that suggests codes from free-text diagnoses. Both are pure rule engines — transparent, auditable, no LLM dependency.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── DIFFERENTIAL ──────────────────────────────────── */}
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-slate-900">Differential diagnosis input</h3>
            <Field label="Chief complaint">
              <input className="form-input" value={chief} onChange={(e) => setChief(e.target.value)} />
            </Field>
            <Field label="Modifiers (comma-separated)">
              <input className="form-input" value={modifiers} onChange={(e) => setModifiers(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age (yrs)"><input className="form-input" value={age} onChange={(e) => setAge(e.target.value)} /></Field>
              <Field label="Sex">
                <select className="form-input" value={sex} onChange={(e) => setSex(e.target.value as typeof sex)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>
            <div className="mt-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Vitals</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <V label="SBP" v={vitals.systolic} set={(x) => setVitals({ ...vitals, systolic: x })} />
                <V label="DBP" v={vitals.diastolic} set={(x) => setVitals({ ...vitals, diastolic: x })} />
                <V label="HR" v={vitals.hr} set={(x) => setVitals({ ...vitals, hr: x })} />
                <V label="SpO2 %" v={vitals.spo2} set={(x) => setVitals({ ...vitals, spo2: x })} />
                <V label="Temp °C" v={vitals.tempC} set={(x) => setVitals({ ...vitals, tempC: x })} />
                <V label="RR" v={vitals.rr} set={(x) => setVitals({ ...vitals, rr: x })} />
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">Engine covers chest pain, headache, abdominal pain, dyspnoea, fever. Extend lib/clinical-ai/differential-db.ts for more buckets.</p>
          </div>

          <DifferentialPanel
            chiefComplaint={chief}
            modifiers={modifiers.split(",").map((s) => s.trim()).filter(Boolean)}
            vitals={numVitals}
            ageYears={age ? Number(age) : undefined}
            sex={sex}
          />
        </div>

        {/* ── ICD-10 ──────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-slate-900">ICD-10 auto-coder</h3>
            <Field label="Free-text diagnosis (try multi-line)">
              <textarea rows={4} className="form-input font-mono text-sm" value={icdQuery} onChange={(e) => setIcdQuery(e.target.value)} />
            </Field>
            <p className="mt-1 text-[11px] text-slate-400">Indexes ~85 high-frequency codes. Click a suggestion to add it to the encounter.</p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <Icd10Picker
              lines={icdQuery.split("\n").map((s) => s.trim()).filter(Boolean)}
              onPick={(s) => setPickedCodes((prev) => prev.some((p) => p.code === s.code) ? prev : [...prev, { code: s.code, title: s.title }])}
            />
          </div>

          {pickedCodes.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <p className="mb-2 text-sm font-bold text-emerald-900">Codes picked for this encounter ({pickedCodes.length})</p>
              <ul className="space-y-1">
                {pickedCodes.map((p) => (
                  <li key={p.code} className="flex items-center justify-between gap-2 rounded bg-white px-3 py-1.5 text-sm">
                    <span><span className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-xs font-bold text-indigo-700">{p.code}</span> {p.title}</span>
                    <button onClick={() => setPickedCodes((prev) => prev.filter((x) => x.code !== p.code))} className="text-xs text-rose-600 hover:underline">Remove</button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-emerald-700">In the real encounter form, these would attach to the discharge summary + insurance claim automatically.</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        :global(.form-input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #cbd5e1;
          background: #fff;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #0f172a;
          margin-bottom: 0.5rem;
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function V({ label, v, set }: { label: string; v: string; set: (x: string) => void }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <input value={v} onChange={(e) => set(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
    </div>
  );
}
