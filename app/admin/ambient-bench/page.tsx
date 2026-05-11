"use client";

// Ambient Scribe Bench — wires together every clinical-AI primitive
// we've built so the killer demo runs from a single page:
//
//   live mic / pasted transcript
//          │
//   /api/clinical/soap-note  (deterministic structurer)
//          │
//   ┌──────┼─────────────────────────────────┐
//   ▼      ▼                                 ▼
//   SOAP   surfaced symptoms → DDx panel     extracted meds → Rx safety
//   panel  surfaced vitals → DDx vitals      diagnoses → ICD-10 picker
//
// The point is to prove that everything composes: a doctor walks in,
// hits Start, talks to the patient, and walks out with a structured
// SOAP, ranked DDx with red flags, ICD-10 codes, and any Rx drug-
// safety warnings — all without typing.

import { useEffect, useState } from "react";
import LiveTranscriber from "@/components/LiveTranscriber";
import { PageHero } from "@/components/admin/PageShell";
import SoapNotePanel, { type SOAPNote } from "@/components/SoapNotePanel";
import DifferentialPanel from "@/components/DifferentialPanel";
import RxSafetyPanel from "@/components/RxSafetyPanel";
import Icd10Picker from "@/components/Icd10Picker";

const SAMPLE = `Doctor: Good afternoon, what brings you in today?
Patient: I've had this crushing chest pain for about 2 hours. It started when I was walking up the stairs. It's spreading to my left arm and jaw, and I'm sweating a lot.
Doctor: Any shortness of breath?
Patient: Yes, I'm breathing harder than usual.
Doctor: Any nausea?
Patient: A little bit, yes.
Doctor: On examination — patient is conscious but distressed. BP 95 over 60, heart rate 110, SpO2 94 percent on room air, RR 22. Bibasal crackles. No murmurs.
Doctor: Most likely this is an acute coronary syndrome. We need to rule out STEMI urgently.
Doctor: Plan: ECG within 10 minutes, troponin at zero and three hours, aspirin 300 mg loading, clopidogrel 600 mg loading, atorvastatin 80 mg, IV access, oxygen if SpO2 drops below 92. Refer for cath lab.`;

export default function AmbientBenchPage() {
  const [transcript, setTranscript] = useState(SAMPLE);
  const [note, setNote] = useState<SOAPNote | null>(null);
  const [picked, setPicked] = useState<Array<{ code: string; title: string }>>([]);

  useEffect(() => {
    if (!transcript.trim()) {
      setNote(null);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      const r = await fetch("/api/clinical/soap-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      if (!r.ok) return;
      const data = await r.json();
      if (!cancelled) setNote(data.note);
    }, 500);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [transcript]);

  // Build vitals object for DDx panel from extracted SOAP vitals.
  const ddxVitals: Record<string, number | undefined> = {};
  if (note) {
    for (const v of note.vitals) {
      if (v.kind === "bp" && /^\d+\/\d+$/.test(v.value)) {
        const [s, d] = v.value.split("/").map(Number);
        ddxVitals.systolic = s; ddxVitals.diastolic = d;
      } else if (v.kind === "hr") ddxVitals.hr = Number(v.value);
      else if (v.kind === "rr") ddxVitals.rr = Number(v.value);
      else if (v.kind === "spo2") ddxVitals.spo2 = Number(v.value);
      else if (v.kind === "temp") ddxVitals.tempC = Number(v.value);
    }
  }

  // Try to derive a chief complaint by reading the first patient line.
  const firstPatient = transcript.split(/\n+/).find((l) => /^patient\s*[:>-]/i.test(l));
  const chiefComplaint = firstPatient ? firstPatient.replace(/^patient\s*[:>-]\s*/i, "") : transcript.slice(0, 120);

  // Diagnoses-from-assessment for ICD-10 picker.
  const diagnosisLines = note?.assessment || [];

  // Drugs from extracted meds → fed to Rx Safety as "newDrugs".
  const newDrugs = (note?.medications || []).map((m) => ({ name: m.drugName, strength: m.strength }));

  return (
    <div className="space-y-6">
      <PageHero
        icon="🎙️"
        eyebrow="Live Capture"
        title="Ambient Scribe Bench"
        subtitle="Live mic capture (browser-native — no audio leaves your device) → deterministic SOAP structurer → fans out into the DDx copilot, ICD-10 picker, and Rx Safety guardrail in one continuous flow. Hit Start, speak to the patient, and watch every clinical-AI primitive light up."
        tone="fuchsia"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <LiveTranscriber initialTranscript={transcript} onTranscript={setTranscript} />
          <div className="rounded-xl bg-white p-4 text-xs text-slate-500 shadow-sm">
            <p className="font-semibold text-slate-700">How this composes</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Web Speech API → transcript with speaker labels.</li>
              <li><code>/api/clinical/soap-note</code> structures it into SOAP, extracts vitals (BP/HR/SpO2/RR/temp), spots medications, and surfaces symptom modifiers.</li>
              <li>Surfaced symptoms + extracted vitals feed straight into <code>DifferentialPanel</code> — fires red flags before the doctor finishes the visit.</li>
              <li>Extracted meds feed <code>RxSafetyPanel</code> — drug interactions, allergies, renal/age contraindications.</li>
              <li>Assessment lines feed <code>Icd10Picker</code> — codes for the encounter + insurance claim.</li>
            </ol>
            <p className="mt-2">The structurer is rule-based and runs in your tenant. Swap in an LLM-based version later by replacing <code>structureSoapNote()</code>; the API contract stays identical.</p>
          </div>
        </div>

        <div className="space-y-4">
          {note ? (
            <>
              <SoapNotePanel note={note} />

              {note.surfacedSymptoms.length > 0 && (
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="mb-2 text-sm font-bold text-slate-900">Differential from extracted symptoms</p>
                  <DifferentialPanel
                    chiefComplaint={chiefComplaint}
                    modifiers={note.surfacedSymptoms}
                    vitals={ddxVitals}
                  />
                </div>
              )}

              {newDrugs.length > 0 && (
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="mb-2 text-sm font-bold text-slate-900">Rx safety check on extracted meds</p>
                  <RxSafetyPanel
                    newDrugs={newDrugs}
                    contextOverride={{ allergies: [], currentMeds: [] }}
                    hideWhenClean={false}
                  />
                </div>
              )}

              {diagnosisLines.length > 0 && (
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="mb-2 text-sm font-bold text-slate-900">ICD-10 from assessment</p>
                  <Icd10Picker
                    lines={diagnosisLines}
                    onPick={(s) => setPicked((prev) => prev.some((p) => p.code === s.code) ? prev : [...prev, { code: s.code, title: s.title }])}
                  />
                  {picked.length > 0 && (
                    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-800">Codes picked</p>
                      <ul className="space-y-1">
                        {picked.map((p) => (
                          <li key={p.code} className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1 text-xs">
                            <span><span className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700">{p.code}</span> {p.title}</span>
                            <button onClick={() => setPicked((prev) => prev.filter((x) => x.code !== p.code))} className="text-rose-600">Remove</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm">
              Start recording or paste a transcript to see the SOAP note + downstream panels.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
