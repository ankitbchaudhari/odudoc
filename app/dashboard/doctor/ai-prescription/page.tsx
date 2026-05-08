"use client";

// AI Prescription Assistant — 3-step wizard.
// Step 1: patient details (age, sex, symptoms, history, allergies, …).
// Step 2: pick from AI-suggested differential diagnoses.
// Step 3: review AI-suggested investigations, medications, advice.
//
// Nothing is saved here — the doctor copies the result into their
// normal prescription flow. This keeps the AI strictly advisory.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ChipPicker from "@/components/ChipPicker";
import {
  SEX_OPTIONS,
  DURATION_OPTIONS,
  COMMON_SYMPTOMS,
  COMMON_HISTORY,
  COMMON_ALLERGIES,
  COMMON_MEDICATIONS,
  VITALS_TEMPLATES,
} from "@/lib/clinical-presets";

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

/** POST JSON with a client-side timeout + one automatic retry on
 *  502/503/504 / network errors. Server side already retries Gemini
 *  internally, but a transient hiccup in the entire request can still
 *  surface here — this gives doctors one extra silent retry before
 *  showing an error. */
async function fetchWithRetry(
  url: string,
  body: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const tryOnce = async (): Promise<{ ok: boolean; status: number; data: { error?: string; [k: string]: unknown } }> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60_000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } finally {
      clearTimeout(timer);
    }
  };

  let last: { ok: boolean; status: number; data: { error?: string; [k: string]: unknown } } | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await tryOnce();
      if (r.ok) return r.data;
      last = r;
      // Only retry on transient gateway / capacity errors. 4xx errors
      // (validation, auth) are immediate failures.
      if (![502, 503, 504, 429].includes(r.status)) break;
    } catch (err) {
      last = { ok: false, status: 0, data: { error: (err as Error).message || "Network error" } };
    }
    if (attempt < 1) {
      await new Promise((r) => setTimeout(r, 600));
    }
  }
  const e = new Error(last?.data?.error || `Request failed (HTTP ${last?.status || 0})`);
  // Tag the status so humanizeAiError can shape a friendlier message.
  (e as Error & { status?: number }).status = last?.status || 0;
  throw e;
}

/** Map raw fetch / API errors into copy a clinician can act on. */
function humanizeAiError(err: unknown): string {
  const e = err as { message?: string; status?: number; name?: string };
  const status = e?.status;
  const msg = e?.message || "";
  if (e?.name === "AbortError" || /timed out|abort/i.test(msg)) {
    return "AI is taking longer than usual. Please try again — it usually responds within 10 seconds.";
  }
  if (status === 502 || status === 503 || status === 504 || /timed out/i.test(msg)) {
    return "AI service is temporarily busy. Try again in a few seconds.";
  }
  if (status === 429) {
    return "Too many requests in a short window. Please wait a moment and try again.";
  }
  if (status === 401) {
    return "Your session expired. Please refresh and sign in again.";
  }
  if (/non.?json|MAX_TOKENS|finishReason/i.test(msg)) {
    return "AI returned an incomplete response. Try shortening the symptoms input or click again.";
  }
  return msg || "AI request failed. Please try again.";
}

export default function AiPrescriptionPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [patient, setPatient] = useState<PatientForm>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [generalNotes, setGeneralNotes] = useState<string>("");
  const [selectedDx, setSelectedDx] = useState<string>("");
  const [treatment, setTreatment] = useState<TreatmentResponse | null>(null);

  // Treatment cache keyed by diagnosis name. We prefetch the top
  // diagnosis in the background while the doctor reads the list, so
  // the most likely "Select" click feels instant. Subsequent clicks
  // for other diagnoses still trigger a fresh fetch.
  const treatmentCache = useRef<Map<string, TreatmentResponse>>(new Map());
  const inflightPrefetch = useRef<Set<string>>(new Set());

  // Tick a UI elapsed-seconds counter while loading so the doctor can
  // see progress. Without this, "Analyzing…" feels stuck even if the
  // request is moving normally.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!loading) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 100) / 10);
    }, 100);
    return () => window.clearInterval(id);
  }, [loading]);

  const update = (k: keyof PatientForm, v: string) =>
    setPatient((p) => ({ ...p, [k]: v }));

  // Fire-and-forget prefetch for a diagnosis. Stashes the result in
  // treatmentCache; downstream Select click reads from cache.
  async function prefetchTreatment(dx: string) {
    if (!dx) return;
    if (treatmentCache.current.has(dx)) return;
    if (inflightPrefetch.current.has(dx)) return;
    inflightPrefetch.current.add(dx);
    try {
      const res = await fetch("/api/doctor/ai-prescription/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "treatment", diagnosis: dx, patient }),
      });
      if (!res.ok) return;
      const data = await res.json();
      treatmentCache.current.set(dx, {
        investigations: data.investigations || [],
        medications: data.medications || [],
        advice: data.advice || [],
        followUp: data.followUp,
        redFlags: data.redFlags || [],
      });
    } catch {
      // Prefetch failures are silent — Select click will retry through
      // the normal path.
    } finally {
      inflightPrefetch.current.delete(dx);
    }
  }

  async function requestDiagnoses() {
    if (!patient.symptoms.trim()) {
      setError("Please enter at least the patient's symptoms.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await fetchWithRetry("/api/doctor/ai-prescription/suggest", {
        mode: "diagnosis",
        patient,
      });
      const dxList: Diagnosis[] = data.diagnoses || [];
      setDiagnoses(dxList);
      setGeneralNotes(data.generalNotes || "");
      setStep(2);
      // Warm the cache with the top two diagnoses while the doctor is
      // still reading the list. ~95% of the time they'll click one of
      // these, and treatment then appears instantly.
      const topNames = dxList.slice(0, 2).map((d) => d.name).filter(Boolean);
      topNames.forEach((n) => void prefetchTreatment(n));
    } catch (err) {
      setError(humanizeAiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function requestTreatment(dx: string) {
    setSelectedDx(dx);
    setError(null);
    // Cache hit: skip the spinner entirely.
    const cached = treatmentCache.current.get(dx);
    if (cached) {
      setTreatment(cached);
      setStep(3);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchWithRetry("/api/doctor/ai-prescription/suggest", {
        mode: "treatment",
        diagnosis: dx,
        patient,
      });
      const tx: TreatmentResponse = {
        investigations: data.investigations || [],
        medications: data.medications || [],
        advice: data.advice || [],
        followUp: data.followUp,
        redFlags: data.redFlags || [],
      };
      treatmentCache.current.set(dx, tx);
      setTreatment(tx);
      setStep(3);
    } catch (err) {
      setError(humanizeAiError(err));
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
    treatmentCache.current.clear();
    inflightPrefetch.current.clear();
  }

  // Hand the AI-generated content over to /prescriptions in a shape
  // the WritePrescriptionModal can merge over its empty defaults. We
  // serialise via sessionStorage instead of URL params because the
  // payload (patient + meds + advice) is far too big for a query
  // string and would also leak into server logs.
  function finishToPrescriptions() {
    if (!treatment) return;
    const sex = (patient.sex || "").trim().toLowerCase();
    const gender =
      sex === "male" || sex === "m"
        ? "Male"
        : sex === "female" || sex === "f"
        ? "Female"
        : sex
        ? sex.charAt(0).toUpperCase() + sex.slice(1)
        : "";

    // Symptoms in the form expect a single string; AI output already is.
    // Advice combines bullet list + red-flag warnings into one block so
    // the doctor sees both without needing two fields.
    const adviceBlock = [
      ...(treatment.advice || []),
      ...((treatment.redFlags || []).length > 0
        ? [
            "",
            "Return urgently if you experience: " +
              (treatment.redFlags || []).join("; ") +
              ".",
          ]
        : []),
    ]
      .filter(Boolean)
      .join("\n");

    const draft = {
      patientName: patient.name || "",
      patientAge: patient.age || "",
      patientGender: gender || undefined,
      symptoms: patient.symptoms || "",
      diagnosis: selectedDx || "",
      medications: (treatment.medications || []).map((m) => ({
        name: m.name || "",
        dose: m.dose || "",
        frequency: m.frequency || "",
        duration: m.duration || "",
        instructions: m.instructions || "",
      })),
      tests: (treatment.investigations || [])
        .map((iv) => iv.name)
        .filter(Boolean),
      advice: adviceBlock,
      followUp: treatment.followUp || "",
    };
    try {
      sessionStorage.setItem("ai-rx-draft", JSON.stringify(draft));
    } catch {
      // sessionStorage blocked — modal will just open empty.
    }
    window.location.href = "/dashboard/doctor/prescriptions?ai=1";
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 py-10">
      {/* Decorative gradient background */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-300/40 via-fuchsia-200/40 to-cyan-200/40 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-[360px] w-[360px] rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-rose-200/30 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4">
        {/* Hero header */}
        <div className="mb-8 overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-indigo-500/5 backdrop-blur-xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30 sm:h-14 sm:w-14">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 sm:h-7 sm:w-7"
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              </div>
              <div>
                <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-fuchsia-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-100">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  </span>
                  AI Powered · Advisory Only
                </div>
                <h1 className="bg-gradient-to-r from-slate-900 via-indigo-900 to-fuchsia-900 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
                  AI Prescription Assistant
                </h1>
                <p className="mt-1 max-w-xl text-sm text-slate-600">
                  Get AI-suggested differentials, investigations and
                  treatments. Always review before prescribing.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/doctor"
              className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-white hover:text-indigo-700"
            >
              <span className="transition group-hover:-translate-x-0.5">←</span>{" "}
              Dashboard
            </Link>
          </div>

          {/* Modern stepper */}
          <div className="mt-7">
            <Stepper step={step} />
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-800 shadow-sm backdrop-blur-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="mt-0.5 h-5 w-5 shrink-0 text-rose-500"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">{error}</div>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-700"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
            <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 via-violet-50/60 to-fuchsia-50/60 px-6 py-5 sm:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Patient details
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-600">
                    At minimum, fill in age, sex, and symptoms.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Name" hint="Optional" icon="user">
                  <input
                    value={patient.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="e.g. Riya Patel"
                    className="input"
                  />
                </Field>
                <Field label="Age" icon="cake">
                  <input
                    value={patient.age}
                    onChange={(e) => update("age", e.target.value)}
                    placeholder="e.g. 34"
                    className="input"
                  />
                </Field>
                <Field label="Sex" icon="venus">
                  <select
                    value={patient.sex}
                    onChange={(e) => update("sex", e.target.value)}
                    className="input"
                    size={1}
                  >
                    <option value="">Select…</option>
                    {SEX_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Symptom duration" icon="clock">
                  <input
                    value={patient.duration}
                    onChange={(e) => update("duration", e.target.value)}
                    placeholder="e.g. 3 days"
                    className="input"
                    list="duration-presets"
                  />
                  <datalist id="duration-presets">
                    {DURATION_OPTIONS.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                  <ChipPicker
                    label="Quick pick"
                    options={DURATION_OPTIONS}
                    value={patient.duration}
                    onChange={(v) => update("duration", v)}
                    maxHeight={160}
                  />
                </Field>
                <Field label="Symptoms" wide required icon="activity">
                  <textarea
                    value={patient.symptoms}
                    onChange={(e) => update("symptoms", e.target.value)}
                    rows={3}
                    placeholder="Fever, dry cough, headache…"
                    className="input"
                  />
                  <ChipPicker
                    label="Pick from common symptoms"
                    options={COMMON_SYMPTOMS}
                    value={patient.symptoms}
                    onChange={(v) => update("symptoms", v)}
                    maxHeight={220}
                  />
                </Field>
                <Field label="Medical history" wide icon="history">
                  <textarea
                    value={patient.history}
                    onChange={(e) => update("history", e.target.value)}
                    rows={2}
                    placeholder="Diabetes, hypertension, prior surgeries…"
                    className="input"
                  />
                  <ChipPicker
                    label="Pick from common conditions"
                    options={COMMON_HISTORY}
                    value={patient.history}
                    onChange={(v) => update("history", v)}
                    maxHeight={220}
                  />
                </Field>
                <Field label="Allergies" icon="alert">
                  <input
                    value={patient.allergies}
                    onChange={(e) => update("allergies", e.target.value)}
                    placeholder="Penicillin, sulfa…"
                    className="input"
                  />
                  <ChipPicker
                    label="Pick from common allergies"
                    options={COMMON_ALLERGIES}
                    value={patient.allergies}
                    onChange={(v) => update("allergies", v)}
                    maxHeight={200}
                  />
                </Field>
                <Field label="Current medications" icon="pill">
                  <input
                    value={patient.medications}
                    onChange={(e) => update("medications", e.target.value)}
                    placeholder="Metformin 500mg BD…"
                    className="input"
                  />
                  <ChipPicker
                    label="Pick from common meds"
                    options={COMMON_MEDICATIONS}
                    value={patient.medications}
                    onChange={(v) => update("medications", v)}
                    maxHeight={220}
                  />
                </Field>
                <Field label="Vitals" hint="Optional" wide icon="heart">
                  <input
                    value={patient.vitals}
                    onChange={(e) => update("vitals", e.target.value)}
                    placeholder="BP 130/85, HR 88, Temp 38.2°C, SpO2 97%"
                    className="input"
                  />
                  <ChipPicker
                    label="Use a vitals template"
                    options={VITALS_TEMPLATES}
                    value={patient.vitals}
                    onChange={(v) => update("vitals", v)}
                    maxHeight={180}
                  />
                </Field>
              </div>

              <div className="mt-8 flex flex-col-reverse items-stretch gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  Patient data stays in your session — nothing is saved
                  server-side.
                </p>
                <button
                  onClick={requestDiagnoses}
                  disabled={loading}
                  className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:shadow-indigo-500/40 disabled:opacity-60"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition group-hover:translate-x-full" />
                  {loading ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeOpacity="0.25"
                        />
                        <path
                          d="M22 12a10 10 0 00-10-10"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                      Analyzing…
                      <span className="ml-1 tabular-nums opacity-80">
                        {elapsed.toFixed(1)}s
                      </span>
                    </>
                  ) : (
                    <>
                      Suggest diagnoses
                      <span className="transition group-hover:translate-x-0.5">
                        →
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
            <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 via-violet-50/60 to-fuchsia-50/60 px-6 py-5 sm:px-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm ring-1 ring-violet-100">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Differential diagnoses
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-600">
                      Pick the diagnosis you want to treat — AI ranking is
                      advisory.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700"
                >
                  ← Edit patient
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {generalNotes && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
                  >
                    <path d="M12 9v4M12 17h.01" />
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <span>{generalNotes}</span>
                </div>
              )}
              <ul className="space-y-3">
                {diagnoses.map((d, i) => (
                  <li
                    key={i}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-500 via-violet-500 to-fuchsia-500 opacity-0 transition group-hover:opacity-100"
                    />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-[11px] font-bold text-indigo-700 ring-1 ring-indigo-100">
                            {i + 1}
                          </span>
                          <h3 className="text-base font-semibold text-slate-900">
                            {d.name}
                          </h3>
                          <ConfidenceBadge level={d.confidence} />
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-slate-700">
                          {d.rationale}
                        </p>
                        {d.redFlags && d.redFlags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-rose-600">
                              Red flags:
                            </span>
                            {d.redFlags.map((rf, j) => (
                              <span
                                key={j}
                                className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 ring-1 ring-rose-100"
                              >
                                {rf}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => requestTreatment(d.name)}
                        disabled={loading}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 self-stretch rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-600 disabled:opacity-50 sm:self-start"
                      >
                        {loading && selectedDx === d.name ? (
                          <>
                            <svg
                              className="h-3.5 w-3.5 animate-spin"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeOpacity="0.25"
                              />
                              <path
                                d="M22 12a10 10 0 00-10-10"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="tabular-nums">
                              {elapsed.toFixed(1)}s
                            </span>
                          </>
                        ) : treatmentCache.current.has(d.name) ? (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="h-3.5 w-3.5"
                            >
                              <path d="M3.105 2.288a.75.75 0 00-.826.95l1.414 4.926A.75.75 0 004.42 8.68h6.83a.75.75 0 010 1.5H4.42a.75.75 0 00-.727.554l-1.414 4.926a.75.75 0 00.826.95 28.897 28.897 0 0015.293-7.155.75.75 0 000-1.115A28.897 28.897 0 003.105 2.288z" />
                            </svg>
                            Ready
                          </>
                        ) : (
                          <>
                            Select
                            <span>→</span>
                          </>
                        )}
                      </button>
                    </div>
                  </li>
                ))}
                {diagnoses.length === 0 && (
                  <li className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 py-12 text-center text-sm text-slate-500">
                    No suggestions returned. Try adding more detail and retry.
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {step === 3 && treatment && (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-[1px] shadow-xl shadow-indigo-500/20">
              <div className="rounded-[calc(1.5rem-1px)] bg-white/95 p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-fuchsia-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-100">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-3 w-3"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Selected diagnosis
                    </p>
                    <h2 className="mt-2 bg-gradient-to-r from-slate-900 to-indigo-900 bg-clip-text text-2xl font-bold text-transparent">
                      {selectedDx}
                    </h2>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700"
                  >
                    ← Other diagnoses
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Section
                title="Suggested investigations"
                accent="cyan"
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M3 3v18h18" />
                    <path d="M7 14l4-4 3 3 5-6" />
                  </svg>
                }
              >
                {treatment.investigations.length === 0 ? (
                  <p className="text-sm text-slate-500">None suggested.</p>
                ) : (
                  <ul className="space-y-2">
                    {treatment.investigations.map((iv, i) => (
                      <li
                        key={i}
                        className="rounded-xl border border-slate-100 bg-gradient-to-br from-cyan-50/40 to-white p-3 transition hover:border-cyan-200"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {iv.name}
                        </p>
                        {iv.why && (
                          <p className="mt-0.5 text-xs text-slate-600">
                            {iv.why}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section
                title="Suggested medications"
                accent="violet"
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M10.5 20.5L20.5 10.5a4.95 4.95 0 00-7-7L3.5 13.5a4.95 4.95 0 007 7z" />
                    <path d="M8.5 8.5l7 7" />
                  </svg>
                }
              >
                {treatment.medications.length === 0 ? (
                  <p className="text-sm text-slate-500">None suggested.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {treatment.medications.map((m, i) => (
                      <li
                        key={i}
                        className="rounded-xl border border-slate-100 bg-gradient-to-br from-violet-50/40 to-white p-3.5 transition hover:border-violet-200"
                      >
                        <p className="text-sm font-bold text-slate-900">
                          {m.name}
                        </p>
                        {[m.dose, m.frequency, m.duration].some(Boolean) && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {m.dose && (
                              <span className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-100">
                                {m.dose}
                              </span>
                            )}
                            {m.frequency && (
                              <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-100">
                                {m.frequency}
                              </span>
                            )}
                            {m.duration && (
                              <span className="inline-flex items-center rounded-md bg-fuchsia-50 px-2 py-0.5 text-[11px] font-medium text-fuchsia-700 ring-1 ring-fuchsia-100">
                                {m.duration}
                              </span>
                            )}
                          </div>
                        )}
                        {m.instructions && (
                          <p className="mt-2 text-xs text-slate-600">
                            {m.instructions}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {treatment.advice && treatment.advice.length > 0 && (
                <Section
                  title="Advice"
                  accent="emerald"
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                  }
                >
                  <ul className="space-y-1.5">
                    {treatment.advice.map((a, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-slate-700"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {treatment.followUp && (
                <Section
                  title="Follow-up"
                  accent="amber"
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  }
                >
                  <p className="text-sm leading-relaxed text-slate-700">
                    {treatment.followUp}
                  </p>
                </Section>
              )}
            </div>

            {treatment.redFlags && treatment.redFlags.length > 0 && (
              <div className="overflow-hidden rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-rose-50/40 p-6 shadow-sm sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/30">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-6 w-6"
                    >
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <path d="M12 9v4M12 17h.01" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-rose-900">
                      Red-flag symptoms — patient must return urgently
                    </h3>
                    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {treatment.redFlags.map((r, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-100"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">
                    AI suggestions only. Verify doses, contraindications and
                    drug interactions before prescribing.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={reset}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Start over
                  </button>
                  <button
                    onClick={finishToPrescriptions}
                    className="group inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:shadow-indigo-500/40"
                  >
                    Finish &amp; write prescription
                    <span className="transition group-hover:translate-x-0.5">
                      →
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          color: #0f172a;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
        }
        :global(.input::placeholder) {
          color: #94a3b8;
        }
        :global(.input:hover) {
          border-color: #cbd5e1;
        }
        :global(.input:focus) {
          border-color: #6366f1;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
        }
      `}</style>
    </div>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps: Array<{ n: 1 | 2 | 3; label: string; sub: string }> = [
    { n: 1, label: "Patient", sub: "Demographics & symptoms" },
    { n: 2, label: "Diagnosis", sub: "Pick a differential" },
    { n: 3, label: "Treatment", sub: "Investigations & meds" },
  ];
  return (
    <div className="relative">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {steps.map((s, i) => {
          const active = step === s.n;
          const done = step > s.n;
          return (
            <div key={s.n} className="relative">
              {i < steps.length - 1 && (
                <div className="absolute left-[calc(50%+1.25rem)] right-[-0.5rem] top-5 hidden h-0.5 sm:block">
                  <div className="h-full w-full rounded-full bg-slate-200" />
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-all duration-500 ${
                      done ? "w-full" : "w-0"
                    }`}
                  />
                </div>
              )}
              <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left">
                <div
                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    done
                      ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/30"
                      : active
                      ? "bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/40"
                      : "border-2 border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {active && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-indigo-400 opacity-30" />
                  )}
                  <span className="relative">{done ? "✓" : s.n}</span>
                </div>
                <div className="mt-2 sm:mt-0">
                  <p
                    className={`text-xs font-bold sm:text-sm ${
                      active || done ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </p>
                  <p className="hidden text-[11px] text-slate-500 sm:block">
                    {s.sub}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  wide,
  icon,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  wide?: boolean;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${wide ? "md:col-span-2" : ""}`}>
      <span className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          {icon && <FieldIcon name={icon} />}
          {label}
          {required && <span className="text-rose-500">*</span>}
        </span>
        {hint && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

function FieldIcon({ name }: { name: string }) {
  const common =
    "h-3.5 w-3.5 text-slate-400";
  switch (name) {
    case "user":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={common}>
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "cake":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={common}>
          <path d="M20 21V10a2 2 0 00-2-2H6a2 2 0 00-2 2v11" />
          <path d="M4 16h16M12 4v4" />
        </svg>
      );
    case "venus":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={common}>
          <circle cx="12" cy="9" r="6" />
          <path d="M12 15v7M9 19h6" />
        </svg>
      );
    case "clock":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
    case "activity":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={common}>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      );
    case "history":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={common}>
          <path d="M3 3v5h5" />
          <path d="M3.05 13A9 9 0 106 5.3L3 8" />
          <path d="M12 7v5l4 2" />
        </svg>
      );
    case "alert":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={common}>
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      );
    case "pill":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={common}>
          <path d="M10.5 20.5L20.5 10.5a4.95 4.95 0 00-7-7L3.5 13.5a4.95 4.95 0 007 7z" />
          <path d="M8.5 8.5l7 7" />
        </svg>
      );
    case "heart":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={common}>
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      );
    default:
      return null;
  }
}

function Section({
  title,
  icon,
  accent,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  accent?: "violet" | "cyan" | "emerald" | "amber";
  children: React.ReactNode;
}) {
  const accents: Record<string, { bg: string; ring: string; text: string }> = {
    violet: { bg: "bg-violet-50", ring: "ring-violet-100", text: "text-violet-700" },
    cyan: { bg: "bg-cyan-50", ring: "ring-cyan-100", text: "text-cyan-700" },
    emerald: { bg: "bg-emerald-50", ring: "ring-emerald-100", text: "text-emerald-700" },
    amber: { bg: "bg-amber-50", ring: "ring-amber-100", text: "text-amber-700" },
  };
  const a = accent ? accents[accent] : { bg: "bg-slate-50", ring: "ring-slate-100", text: "text-slate-700" };
  return (
    <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-sm shadow-indigo-500/5 backdrop-blur-xl">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-3.5">
        {icon && (
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl ${a.bg} ${a.text} ring-1 ${a.ring}`}
          >
            {icon}
          </div>
        )}
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ConfidenceBadge({ level }: { level: string }) {
  const l = (level || "").toLowerCase();
  const config =
    l === "high"
      ? {
          dot: "bg-emerald-500",
          ring: "ring-emerald-100",
          bg: "bg-emerald-50",
          text: "text-emerald-700",
        }
      : l === "medium"
      ? {
          dot: "bg-amber-500",
          ring: "ring-amber-100",
          bg: "bg-amber-50",
          text: "text-amber-700",
        }
      : {
          dot: "bg-slate-400",
          ring: "ring-slate-100",
          bg: "bg-slate-50",
          text: "text-slate-700",
        };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${config.bg} ${config.ring} ${config.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {level || "n/a"}
    </span>
  );
}
