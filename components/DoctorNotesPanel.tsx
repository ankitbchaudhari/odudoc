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

import { useEffect, useState } from "react";
import DrugInteractionAlert from "./DrugInteractionAlert";
import { ALL_LANGUAGES } from "@/lib/languages-catalogue";

// 8th Schedule of the Indian Constitution — the 22 official languages.
// Codes match `lib/languages-catalogue.ts`. Used to bucket the picker
// so doctors see Indian languages first without scrolling past German.
const INDIAN_LANG_CODES = new Set([
  "hi", "bn", "ur", "pa", "gu", "ta", "te", "kn", "ml", "mr", "ne",
  "as", "or", "mai", "ks", "sd", "kok", "doi", "brx", "mni", "sat", "sa",
]);

export interface MedicineRow {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
}

export interface ConsultPrescription {
  symptoms: string;
  diagnosis: string;
  treatment: string;
  investigations: string;
  notes: string;
  medicines: MedicineRow[];
  doctorName: string;
  patientName: string;
  specialty: string;
  issuedAt: string;
}

// Quick-pick library — common presets per specialty so the doctor can
// click a chip instead of typing. The "AI suggest" button takes the
// selected symptoms + diagnosis and fills treatment/investigations/
// medicines from this library. For a real deployment this maps to an
// LLM call behind /api/ai/prescription; the local library is a zero-
// latency fallback that already covers most primary-care consults.
const QUICK_SYMPTOMS = [
  "Fever", "Cough", "Sore throat", "Runny nose", "Headache",
  "Body ache", "Fatigue", "Nausea", "Vomiting", "Diarrhea",
  "Abdominal pain", "Chest pain", "Shortness of breath", "Dizziness",
  "Rash", "Itching", "Joint pain", "Back pain",
];

const QUICK_DIAGNOSES = [
  "Acute viral pharyngitis", "Upper respiratory tract infection",
  "Acute gastroenteritis", "Migraine", "Tension headache",
  "Allergic rhinitis", "Acid reflux / GERD", "Urinary tract infection",
  "Contact dermatitis", "Musculoskeletal strain",
];

const QUICK_INVESTIGATIONS = [
  "CBC", "CRP", "Throat swab", "Urine routine", "Blood sugar (fasting)",
  "LFT", "KFT", "Lipid profile", "ECG", "Chest X-ray", "Ultrasound abdomen",
];

interface AiSuggestion {
  treatment: string;
  investigations: string[];
  medicines: MedicineRow[];
}

// Rule-based "AI" — matches diagnosis keywords to a canned plan. Good
// enough for demo + offline use; wire to an LLM later for real depth.
function suggestFromDiagnosis(dx: string): AiSuggestion | null {
  const d = dx.toLowerCase();
  if (/pharyngitis|sore throat|urti|upper respiratory/.test(d)) {
    return {
      treatment: "Warm saline gargles 3× daily. Adequate hydration and rest. Avoid cold drinks.",
      investigations: ["CBC", "Throat swab (if persistent >5 days)"],
      medicines: [
        { name: "Paracetamol", dose: "500 mg", frequency: "1-0-1", duration: "5 days" },
        { name: "Lozenges (Strepsils)", dose: "1 lozenge", frequency: "Every 4 hours", duration: "3 days" },
      ],
    };
  }
  if (/gastroenteritis|diarrhea|loose/.test(d)) {
    return {
      treatment: "ORS after every loose stool. Bland diet (BRAT). Avoid dairy and fried food for 48h.",
      investigations: ["Stool routine", "CBC"],
      medicines: [
        { name: "ORS sachet", dose: "1 sachet in 1 L water", frequency: "After each loose stool", duration: "3 days" },
        { name: "Racecadotril", dose: "100 mg", frequency: "1-1-1", duration: "3 days" },
      ],
    };
  }
  if (/migraine|headache/.test(d)) {
    return {
      treatment: "Rest in a dark quiet room. Identify + avoid triggers (caffeine, screens, missed meals).",
      investigations: [],
      medicines: [
        { name: "Paracetamol", dose: "500 mg", frequency: "SOS", duration: "PRN" },
        { name: "Domperidone", dose: "10 mg", frequency: "SOS", duration: "PRN" },
      ],
    };
  }
  if (/rhinitis|allerg/.test(d)) {
    return {
      treatment: "Avoid known allergens. Steam inhalation twice daily.",
      investigations: [],
      medicines: [
        { name: "Cetirizine", dose: "10 mg", frequency: "0-0-1", duration: "7 days" },
        { name: "Montelukast", dose: "10 mg", frequency: "0-0-1", duration: "7 days" },
      ],
    };
  }
  if (/uti|urinary/.test(d)) {
    return {
      treatment: "Increase fluid intake (3 L/day). Complete the full antibiotic course.",
      investigations: ["Urine routine", "Urine culture + sensitivity"],
      medicines: [
        { name: "Nitrofurantoin", dose: "100 mg", frequency: "1-0-1", duration: "5 days" },
      ],
    };
  }
  if (/reflux|gerd|acid/.test(d)) {
    return {
      treatment: "Small frequent meals. Avoid lying down 2h after eating. Elevate head of bed.",
      investigations: [],
      medicines: [
        { name: "Pantoprazole", dose: "40 mg", frequency: "1-0-0 (before breakfast)", duration: "14 days" },
      ],
    };
  }
  return null;
}

interface Props {
  roomId: string;
  // The consultation/booking ID — used to persist the prescription and
  // flip the consultation status to "completed" on the server. Optional
  // because the room may exist without a linked booking (OTP guest flow
  // still produces a bookingId, so in practice this is always set).
  consultationId?: string;
  doctorName: string;
  patientName: string;
  specialty: string;
  onEndCall: () => void;
  // Phase C: when a doctor finishes a post-call dictation the parent
  // hands the Gemini-structured suggestion down through this prop.
  // We watch for changes and overwrite the matching form fields so the
  // doctor sees the draft ready to review + send.
  dictationSeed?: {
    treatment: string;
    investigations: string[];
    medicines: MedicineRow[];
    warning?: string;
  } | null;
}

const EMPTY_MED: MedicineRow = { name: "", dose: "", frequency: "", duration: "" };

function ChipRow({ items, onPick }: { items: string[]; onPick: (v: string) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPick(item)}
          className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-gray-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
        >
          + {item}
        </button>
      ))}
    </div>
  );
}

export default function DoctorNotesPanel({
  roomId,
  consultationId,
  doctorName,
  patientName,
  specialty,
  onEndCall,
  dictationSeed,
}: Props) {
  const [open, setOpen] = useState(true);
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [investigations, setInvestigations] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState<MedicineRow[]>([{ ...EMPTY_MED }]);
  const [sending, setSending] = useState(false);
  /** Patient's preferred language for the prescription text. Defaults
   *  to English ("") which is the existing behaviour. When set, the AI
   *  suggest call asks Gemini to write in the chosen language, and
   *  the "Translate" button re-renders any already-filled fields. */
  const [rxLanguage, setRxLanguage] = useState<string>("");
  const [translating, setTranslating] = useState(false);

  // Phase C: when a dictation result lands, merge it into the form so
  // the doctor can review + tweak before sending. We overwrite rather
  // than append — a dictation is a fresh pass over the plan.
  useEffect(() => {
    if (!dictationSeed) return;
    if (dictationSeed.treatment) setTreatment(dictationSeed.treatment);
    if (dictationSeed.investigations?.length) {
      setInvestigations(dictationSeed.investigations.join(", "));
    }
    if (dictationSeed.medicines?.length) {
      setMedicines(dictationSeed.medicines);
    }
    if (dictationSeed.warning) {
      // Append warning to notes so the doctor sees it inline with their
      // other advice; they can delete it before sending.
      setNotes((n) => (n ? `${n}\n\n⚠ ${dictationSeed.warning}` : `⚠ ${dictationSeed.warning}`));
    }
    setOpen(true);
  }, [dictationSeed]);
  const [sent, setSent] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [aiMsg, setAiMsg] = useState<string>("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiWarning, setAiWarning] = useState<string>("");

  // Helper: append a chip value to a comma-separated field without
  // duplicating if it's already there.
  const appendChip = (current: string, value: string): string => {
    const parts = current.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.some((p) => p.toLowerCase() === value.toLowerCase())) return current;
    return parts.length ? `${parts.join(", ")}, ${value}` : value;
  };

  // Apply a suggestion (from Claude or the local library) to the form.
  // Never overwrites a field the doctor already filled.
  const applySuggestion = (s: AiSuggestion, source: "Claude" | "local preset") => {
    setTreatment((prev) => (prev.trim() ? prev : s.treatment));
    setInvestigations((prev) => {
      const joined = Array.isArray(s.investigations) ? s.investigations.join(", ") : "";
      return prev.trim() ? prev : joined;
    });
    setMedicines((prev) => {
      const hasContent = prev.some((m) => m.name.trim());
      return hasContent ? prev : s.medicines.length ? s.medicines : prev;
    });
    setAiMsg(`Suggestions applied via ${source} — review before sending.`);
  };

  const runAiSuggest = async () => {
    setAiMsg("");
    setAiWarning("");
    const src = diagnosis.trim() || symptoms.trim();
    if (!src) {
      setAiMsg("Add a symptom or diagnosis first.");
      return;
    }

    setAiBusy(true);
    try {
      // Try Claude first. If the server doesn't have ANTHROPIC_API_KEY
      // (503) or Anthropic is down (502), silently fall back to the
      // local rule library so the doctor still gets a starter plan.
      const r = await fetch("/api/ai/prescription", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          symptoms: symptoms.trim(),
          diagnosis: diagnosis.trim(),
          language: rxLanguage,
        }),
      });
      if (r.ok) {
        const { suggestion } = (await r.json()) as { suggestion: AiSuggestion & { warning?: string } };
        applySuggestion(suggestion, "Claude");
        if (suggestion.warning) setAiWarning(suggestion.warning);
        return;
      }
      // 4xx other than 503 — surface the server message; otherwise fallback.
      if (r.status === 403) {
        const j = await r.json().catch(() => ({}));
        setAiMsg(j.error || "Not authorized.");
        return;
      }
      const local = suggestFromDiagnosis(src);
      if (local) {
        applySuggestion(local, "local preset");
      } else {
        setAiMsg("AI unavailable and no local preset matched. Fill manually or use the chips above.");
      }
    } catch {
      const local = suggestFromDiagnosis(src);
      if (local) {
        applySuggestion(local, "local preset");
      } else {
        setAiMsg("Network error and no local preset matched.");
      }
    } finally {
      setAiBusy(false);
    }
  };

  /** Translate the already-filled prescription into rxLanguage. Drug
   *  names are guaranteed by the server to come from the source by
   *  index — never a Gemini-translated rename. */
  const translateRx = async () => {
    if (!rxLanguage) {
      setAiMsg("Pick a language first.");
      return;
    }
    setTranslating(true);
    setAiMsg("");
    try {
      const cleanMeds = medicines.filter((m) => m.name.trim());
      const r = await fetch("/api/ai/translate-rx", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          language: rxLanguage,
          treatment: treatment.trim(),
          investigations: investigations
            .split(/\n|,/)
            .map((s) => s.trim())
            .filter(Boolean),
          medicines: cleanMeds,
          warning: aiWarning,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setAiMsg(data.error || `Translation failed (${r.status})`);
        return;
      }
      const out = data.result as {
        treatment: string;
        investigations: string[];
        medicines: MedicineRow[];
        warning?: string;
      };
      if (out.treatment) setTreatment(out.treatment);
      if (out.investigations?.length)
        setInvestigations(out.investigations.join("\n"));
      if (out.medicines?.length) {
        // Replace by index — drug names from the source are preserved
        // server-side; we only swap dose/frequency/duration locally.
        setMedicines((prev) =>
          prev.map((m, i) => {
            if (!m.name.trim()) return m;
            const filledIndex = prev
              .slice(0, i + 1)
              .filter((p) => p.name.trim()).length - 1;
            const t = out.medicines[filledIndex];
            return t ? { ...m, dose: t.dose, frequency: t.frequency, duration: t.duration } : m;
          })
        );
      }
      if (out.warning) setAiWarning(out.warning);
    } catch (err) {
      setAiMsg((err as Error).message);
    } finally {
      setTranslating(false);
    }
  };

  const updateMed = (i: number, patch: Partial<MedicineRow>) => {
    setMedicines((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  };
  const addMed = () => setMedicines((prev) => [...prev, { ...EMPTY_MED }]);
  const removeMed = (i: number) =>
    setMedicines((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const handleSend = async () => {
    setSending(true);
    const cleanMeds = medicines.filter((m) => m.name.trim() !== "");
    const payload: ConsultPrescription = {
      symptoms: symptoms.trim(),
      diagnosis: diagnosis.trim(),
      treatment: treatment.trim(),
      investigations: investigations.trim(),
      notes: notes.trim(),
      medicines: cleanMeds,
      doctorName,
      patientName,
      specialty,
      issuedAt: new Date().toISOString(),
    };

    // localStorage copy so the patient's post-call view still works
    // instantly — the server round-trip below is the durable record.
    try {
      localStorage.setItem(`odudoc:rx:${roomId}`, JSON.stringify(payload));
    } catch {
      /* storage disabled — server POST below is what matters */
    }

    // Persist to the backend so the consultation flips to "completed"
    // and the prescription lands in the doctor/patient dashboards. The
    // prescribe endpoint internally calls attachPrescription(), which
    // sets status="completed" on the consultation record.
    if (consultationId) {
      const advice = [
        payload.treatment,
        payload.notes,
      ].filter(Boolean).join("\n\n");
      try {
        const res = await fetch(`/api/consultations/${encodeURIComponent(consultationId)}/prescribe`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            templateId: "classic-blue",
            data: {
              doctorName,
              doctorSpecialty: specialty,
              patientName,
              date: new Date().toISOString().slice(0, 10),
              symptoms: payload.symptoms,
              diagnosis: payload.diagnosis,
              medications: cleanMeds.map((m) => ({
                name: m.name,
                dose: m.dose,
                frequency: m.frequency,
                duration: m.duration,
                instructions: "",
              })),
              tests: payload.investigations
                ? payload.investigations.split(",").map((s) => s.trim()).filter(Boolean)
                : [],
              advice,
              followUp: "",
            },
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setSendErr(
            `Prescription was NOT saved on the server (${res.status}${j?.error ? ` — ${j.error}` : ""}). ` +
              `Your copy is kept locally for this call, but it won't appear in dashboards. ` +
              `Please flag this to support.`,
          );
          setSending(false);
          return; // don't pretend we sent it
        }
      } catch (err) {
        setSendErr(
          `Couldn't reach the server to save this prescription: ${
            err instanceof Error ? err.message : "network error"
          }. Try again or flag to support.`,
        );
        setSending(false);
        return;
      }
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
          <ChipRow
            items={QUICK_SYMPTOMS}
            onPick={(v) => setSymptoms((prev) => appendChip(prev, v))}
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
          <ChipRow
            items={QUICK_DIAGNOSES}
            onPick={(v) => setDiagnosis((prev) => appendChip(prev, v))}
          />
        </div>

        {/* AI suggest — one click fills treatment, investigations,
            and starter medicines based on the diagnosis/symptoms.
            The language picker pins the output language so the patient
            reads their prescription in their own script. Drug names
            stay in Latin script regardless (pharmacy + safety). */}
        <div className="rounded-lg border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <div>
                <p className="text-sm font-semibold text-indigo-900">AI Prescription Helper</p>
                <p className="text-[11px] text-indigo-700/80">Auto-fill + write in patient&rsquo;s language.</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={rxLanguage}
                onChange={(e) => setRxLanguage(e.target.value)}
                title="Patient's preferred language for the prescription text. Drug names always stay in English."
                className="rounded-md border border-indigo-200 bg-white px-2 py-1 text-[11px] text-indigo-900 focus:border-indigo-400 focus:outline-none"
              >
                <option value="">English (default)</option>
                <optgroup label="Indian languages">
                  {ALL_LANGUAGES
                    .filter((l) => INDIAN_LANG_CODES.has(l.code))
                    .map((l) => (
                      <option key={l.code} value={l.name}>
                        {l.name} · {l.native}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="All languages">
                  {ALL_LANGUAGES
                    .filter((l) => !INDIAN_LANG_CODES.has(l.code))
                    .map((l) => (
                      <option key={l.code} value={l.name}>
                        {l.name}
                      </option>
                    ))}
                </optgroup>
              </select>
              <button
                type="button"
                onClick={runAiSuggest}
                disabled={aiBusy || translating}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              >
                {aiBusy ? "Thinking…" : "Suggest"}
              </button>
              {rxLanguage && (
                <button
                  type="button"
                  onClick={translateRx}
                  disabled={translating || aiBusy}
                  title={`Translate the already-filled fields into ${rxLanguage} (drug names stay in English)`}
                  className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
                >
                  {translating ? "Translating…" : `↻ Translate`}
                </button>
              )}
            </div>
          </div>
          {aiMsg && (
            <p className="mt-2 text-[11px] text-indigo-700">{aiMsg}</p>
          )}
          {aiWarning && (
            <p className="mt-2 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
              ⚠ {aiWarning}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Treatment
          </label>
          <textarea
            value={treatment}
            onChange={(e) => setTreatment(e.target.value)}
            rows={2}
            placeholder="Non-pharmacologic plan, lifestyle advice, care instructions"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Investigations
          </label>
          <textarea
            value={investigations}
            onChange={(e) => setInvestigations(e.target.value)}
            rows={2}
            placeholder="e.g. CBC, CRP, Throat swab"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <ChipRow
            items={QUICK_INVESTIGATIONS}
            onPick={(v) => setInvestigations((prev) => appendChip(prev, v))}
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
          {/* AI safety check — fires automatically as the doctor types
              drugs into the table; shows a coloured banner only when
              there's something worth flagging. */}
          <DrugInteractionAlert
            medicines={medicines}
            className="mb-3"
          />
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
        {sendErr && (
          <div className="mb-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            {sendErr}
          </div>
        )}
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
