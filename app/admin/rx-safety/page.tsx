"use client";

// Drug-Safety bench. Standalone page where a clinician can paste a
// proposed Rx + patient context and see the warnings the engine
// produces. Demonstrates the panel that will eventually live inside
// the hospital Rx form.

import { useState } from "react";
import RxSafetyPanel, { type CheckResult } from "@/components/RxSafetyPanel";

export default function RxSafetyBenchPage() {
  const [drugInput, setDrugInput] = useState("warfarin\nibuprofen\nazithromycin");
  const [allergyInput, setAllergyInput] = useState("penicillin");
  const [currentInput, setCurrentInput] = useState("amlodipine");
  const [dob, setDob] = useState<string>("1955-03-12");
  const [egfr, setEgfr] = useState<string>("28");
  const [pregnancy, setPregnancy] = useState<string>("not_pregnant");
  const [trimester, setTrimester] = useState<string>("");
  const [result, setResult] = useState<CheckResult | null>(null);

  const newDrugs = drugInput
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name }));

  const contextOverride = {
    dateOfBirth: dob || undefined,
    egfr: egfr ? Number(egfr) : undefined,
    pregnancyStatus: pregnancy || undefined,
    pregnancyTrimester: trimester ? (Number(trimester) as 1 | 2 | 3) : undefined,
    allergies: allergyInput
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((d) => ({ drugName: d, severity: "moderate" as const })),
    currentMeds: currentInput
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((d) => ({ drugName: d })),
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Rx Safety Bench</h2>
        <p className="mt-1 text-sm text-gray-500">
          Paste a proposed prescription + patient context. The engine checks for drug-drug interactions, allergy + cross-reactivity, pregnancy contraindications, renal/age-band advisories, and duplicate entries — in real time as you type.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
          <Field label="New prescription (one drug per line — generic or brand)">
            <textarea
              rows={6}
              value={drugInput}
              onChange={(e) => setDrugInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
            />
          </Field>
          <Field label="Allergies (one per line)">
            <textarea
              rows={3}
              value={allergyInput}
              onChange={(e) => setAllergyInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
            />
          </Field>
          <Field label="Current medications (one per line)">
            <textarea
              rows={3}
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of birth">
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </Field>
            <Field label="eGFR (ml/min/1.73m²)">
              <input
                type="number"
                value={egfr}
                onChange={(e) => setEgfr(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Pregnancy">
              <select
                value={pregnancy}
                onChange={(e) => setPregnancy(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="not_pregnant">Not pregnant</option>
                <option value="pregnant">Pregnant</option>
                <option value="lactating">Lactating</option>
                <option value="unknown">Unknown</option>
              </select>
            </Field>
            <Field label="Trimester (if pregnant)">
              <select
                value={trimester}
                onChange={(e) => setTrimester(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">—</option>
                <option value="1">T1</option>
                <option value="2">T2</option>
                <option value="3">T3</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="space-y-4">
          <RxSafetyPanel
            newDrugs={newDrugs}
            contextOverride={contextOverride}
            onResult={setResult}
            hideWhenClean={false}
          />
          <div className="rounded-xl bg-white p-4 text-xs text-slate-500 shadow-sm">
            <p className="font-semibold text-slate-700">How to read the warnings</p>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li><strong className="text-rose-700">Critical</strong> — contraindicated. Block the prescription unless the prescriber documents a written override reason.</li>
              <li><strong className="text-amber-700">Major</strong> — significant clinical risk. Confirm an alternate isn&apos;t feasible.</li>
              <li><strong className="text-yellow-700">Moderate</strong> — counsel patient or adjust dose / monitoring.</li>
              <li><strong className="text-sky-700">Minor</strong> — informational.</li>
            </ul>
            <p className="mt-3">
              Engine matches generic names + ~80 trade-name aliases. Strength suffixes (&ldquo;Crocin 500mg&rdquo;) are stripped automatically. The rule database is curated for high-impact interactions seen in Indian + global outpatient/IPD pharmacopeia and is easy to extend.
            </p>
            {result && result.worst && ["critical", "major"].includes(result.worst) && (
              <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 font-semibold text-rose-800">
                ⚠ This prescription would be blocked at submit. The doctor must either change the regimen or provide a written override reason that is logged to the audit trail.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</label>
      {children}
    </div>
  );
}
