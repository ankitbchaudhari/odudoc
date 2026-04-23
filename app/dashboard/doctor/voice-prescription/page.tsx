"use client";

// Voice Prescription — doctor taps the mic, dictates, and gets a
// structured prescription draft back. Transcription happens in the
// browser via the Web Speech API (free, private until parse time).
// The transcript is POSTed to /api/doctor/voice-prescription/parse
// which uses Gemini to extract fields the doctor can review before
// saving to the normal prescription flow.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// --- Web Speech API types (not in standard lib.dom) ---
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
  length: number;
}
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface Medication {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface ParsedPrescription {
  patientName: string;
  patientAge: string;
  patientGender: string;
  symptoms: string;
  diagnosis: string;
  medications: Medication[];
  tests: string[];
  advice: string;
  followUp: string;
  unclear: string[];
}

const EMPTY_PARSED: ParsedPrescription = {
  patientName: "",
  patientAge: "",
  patientGender: "",
  symptoms: "",
  diagnosis: "",
  medications: [],
  tests: [],
  advice: "",
  followUp: "",
  unclear: [],
};

export default function VoicePrescriptionPage() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedPrescription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState("en-IN");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // When true, auto-restart on `onend` — browsers stop after ~60s of
  // silence even with continuous=true, and we want a long dictation
  // window. Flipped to false when the user presses Stop.
  const shouldContinueRef = useRef(false);

  // Detect SpeechRecognition support and construct an instance.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = language;
    recognitionRef.current = rec;
    return () => {
      shouldContinueRef.current = false;
      try {
        rec.abort();
      } catch {
        // ignore — nothing to clean up if it never started
      }
      recognitionRef.current = null;
    };
  }, [language]);

  // Wire up event handlers every time the recognition instance changes.
  useEffect(() => {
    const rec = recognitionRef.current;
    if (!rec) return;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let finalsAdded = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0]?.transcript || "";
        if (r.isFinal) finalsAdded += text + " ";
        else interim += text;
      }
      if (finalsAdded) {
        setFinalText((prev) => (prev + " " + finalsAdded).replace(/\s+/g, " ").trim());
      }
      setInterimText(interim);
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      // "no-speech" and "aborted" are normal; don't scare the user.
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microphone permission denied. Please allow mic access and try again.");
        shouldContinueRef.current = false;
        setListening(false);
        return;
      }
      setError(`Voice error: ${e.error}`);
    };

    rec.onend = () => {
      // Auto-restart while the user still wants to dictate.
      if (shouldContinueRef.current) {
        try {
          rec.start();
          return;
        } catch {
          // start() throws if it's already running; ignore.
        }
      }
      setListening(false);
      setInterimText("");
    };
  }, [supported]);

  function start() {
    const rec = recognitionRef.current;
    if (!rec) return;
    setError(null);
    rec.lang = language;
    shouldContinueRef.current = true;
    try {
      rec.start();
      setListening(true);
    } catch {
      // Already started — that's fine.
      setListening(true);
    }
  }

  function stop() {
    const rec = recognitionRef.current;
    shouldContinueRef.current = false;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      // ignore
    }
    setListening(false);
  }

  function clearAll() {
    setFinalText("");
    setInterimText("");
    setParsed(null);
    setError(null);
  }

  async function parseTranscript() {
    const transcript = (finalText + " " + interimText).trim();
    if (transcript.length < 4) {
      setError("Nothing to parse yet — try dictating first.");
      return;
    }
    setError(null);
    setParsing(true);
    try {
      const res = await fetch("/api/doctor/voice-prescription/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Parse failed");
      setParsed({ ...EMPTY_PARSED, ...data.parsed });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setParsing(false);
    }
  }

  function updateParsed<K extends keyof ParsedPrescription>(
    key: K,
    value: ParsedPrescription[K]
  ) {
    setParsed((p) => (p ? { ...p, [key]: value } : p));
  }

  function updateMedication(idx: number, field: keyof Medication, value: string) {
    setParsed((p) => {
      if (!p) return p;
      const meds = p.medications.map((m, i) => (i === idx ? { ...m, [field]: value } : m));
      return { ...p, medications: meds };
    });
  }

  function removeMedication(idx: number) {
    setParsed((p) => {
      if (!p) return p;
      return { ...p, medications: p.medications.filter((_, i) => i !== idx) };
    });
  }

  function addMedication() {
    setParsed((p) => {
      if (!p) return p;
      return {
        ...p,
        medications: [
          ...p.medications,
          { name: "", dose: "", frequency: "", duration: "", instructions: "" },
        ],
      };
    });
  }

  function sendToPrescriptions() {
    if (!parsed) return;
    try {
      sessionStorage.setItem("voice-rx-draft", JSON.stringify(parsed));
    } catch {
      // sessionStorage blocked — fall through anyway.
    }
    window.location.href = "/dashboard/doctor/prescriptions?voice=1";
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-white py-10">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Voice Prescription
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Speak the prescription; AI structures it for your review.
            </p>
          </div>
          <Link
            href="/dashboard/doctor"
            className="text-sm font-semibold text-rose-600 hover:underline"
          >
            ← Back
          </Link>
        </div>

        {supported === false && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <b>Voice dictation isn&apos;t supported in this browser.</b> Please
            open this page in Google Chrome, Microsoft Edge, or Safari on a
            device with a microphone. You can still type the dictation below
            and press <i>Parse</i>.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        {/* Recording panel */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={listening ? stop : start}
              disabled={supported === false}
              className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow transition ${
                listening
                  ? "bg-rose-600 hover:bg-rose-700 animate-pulse"
                  : "bg-emerald-600 hover:bg-emerald-700"
              } disabled:opacity-50`}
            >
              <span className="text-lg">{listening ? "■" : "🎤"}</span>
              {listening ? "Stop" : "Start dictating"}
            </button>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={listening}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="en-IN">English (India)</option>
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="en-NG">English (Nigeria)</option>
              <option value="hi-IN">हिन्दी (Hindi)</option>
              <option value="gu-IN">ગુજરાતી (Gujarati)</option>
              <option value="mr-IN">मराठी (Marathi)</option>
              <option value="ta-IN">தமிழ் (Tamil)</option>
            </select>
            <button
              onClick={clearAll}
              disabled={listening}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Clear
            </button>
            {listening && (
              <span className="text-xs text-rose-700">
                ● Listening… speak naturally, include patient name, age,
                symptoms, diagnosis, medications with dose and duration.
              </span>
            )}
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              Transcript (editable)
            </label>
            <textarea
              value={finalText + (interimText ? " " + interimText : "")}
              onChange={(e) => {
                setFinalText(e.target.value);
                setInterimText("");
              }}
              rows={6}
              placeholder="e.g. Patient Neha Shah, 32 years female. Fever and dry cough for 3 days. Diagnosis: viral upper respiratory infection. Prescribe paracetamol 500 mg, three times a day, for 5 days. Advice: plenty of fluids, rest. Follow up in 5 days if not better."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Italicised grey text is interim — it&apos;s appended automatically
              as you speak. You can edit the transcript before parsing.
            </p>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={parseTranscript}
              disabled={parsing || listening || !(finalText + interimText).trim()}
              className="rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-rose-700 disabled:opacity-50"
            >
              {parsing ? "Parsing…" : "Parse into prescription →"}
            </button>
          </div>
        </div>

        {/* Parsed result */}
        {parsed && (
          <div className="mt-6 space-y-6">
            {parsed.unclear && parsed.unclear.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <b>Please review:</b>{" "}
                {parsed.unclear.join(" · ")}
              </div>
            )}

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
                Patient
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <TextField
                  label="Name"
                  value={parsed.patientName}
                  onChange={(v) => updateParsed("patientName", v)}
                />
                <TextField
                  label="Age"
                  value={parsed.patientAge}
                  onChange={(v) => updateParsed("patientAge", v)}
                />
                <TextField
                  label="Sex"
                  value={parsed.patientGender}
                  onChange={(v) => updateParsed("patientGender", v)}
                />
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
                Clinical
              </h3>
              <div className="space-y-3">
                <TextArea
                  label="Symptoms"
                  value={parsed.symptoms}
                  onChange={(v) => updateParsed("symptoms", v)}
                  rows={2}
                />
                <TextArea
                  label="Diagnosis"
                  value={parsed.diagnosis}
                  onChange={(v) => updateParsed("diagnosis", v)}
                  rows={2}
                />
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">
                  Medications
                </h3>
                <button
                  onClick={addMedication}
                  className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  + Add
                </button>
              </div>
              {parsed.medications.length === 0 ? (
                <p className="text-sm text-gray-500">None detected.</p>
              ) : (
                <ul className="space-y-3">
                  {parsed.medications.map((m, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-gray-200 p-3"
                    >
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                        <TextField
                          label="Name"
                          value={m.name}
                          onChange={(v) => updateMedication(i, "name", v)}
                        />
                        <TextField
                          label="Dose"
                          value={m.dose}
                          onChange={(v) => updateMedication(i, "dose", v)}
                        />
                        <TextField
                          label="Frequency"
                          value={m.frequency}
                          onChange={(v) => updateMedication(i, "frequency", v)}
                        />
                        <TextField
                          label="Duration"
                          value={m.duration}
                          onChange={(v) => updateMedication(i, "duration", v)}
                        />
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
                        <TextField
                          label="Instructions"
                          value={m.instructions}
                          onChange={(v) => updateMedication(i, "instructions", v)}
                        />
                        <button
                          onClick={() => removeMedication(i)}
                          className="self-end rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
                Tests, advice, follow-up
              </h3>
              <div className="space-y-3">
                <TextArea
                  label="Tests (one per line)"
                  value={parsed.tests.join("\n")}
                  onChange={(v) =>
                    updateParsed(
                      "tests",
                      v
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                  rows={3}
                />
                <TextArea
                  label="Advice"
                  value={parsed.advice}
                  onChange={(v) => updateParsed("advice", v)}
                  rows={2}
                />
                <TextField
                  label="Follow-up"
                  value={parsed.followUp}
                  onChange={(v) => updateParsed("followUp", v)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={sendToPrescriptions}
                className="rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-rose-700"
              >
                Use in prescription →
              </button>
              <button
                onClick={clearAll}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Start over
              </button>
              <span className="text-xs text-gray-500">
                Review every field. AI transcription can misspell drug names —
                verify before signing.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-700">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-700">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
      />
    </label>
  );
}
