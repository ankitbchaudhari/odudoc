"use client";

// Compact AI helper card for the public doctor profile page.
//
// Two small tools for patients landing on a doctor's profile:
//   1. "Is this doctor right for me?"  (mode=fit)
//      → patient types their concern → AI returns fit verdict +
//        urgency flag + suggested alternative specialties if needed.
//   2. "Prepare for the visit"         (mode=prep)
//      → patient types their concern → AI returns a pre-visit
//        checklist (questions to ask, records to bring, what to
//        track, red flags).
//
// Calls POST /api/doctors/[id]/ai-assist. Nothing is persisted.
// A disclaimer is shown under every response — this is navigation
// help, not medical advice.

import { useState } from "react";

type Mode = "fit" | "prep";

interface FitResult {
  fit: string;
  fitRationale: string;
  urgency: string;
  urgencyReason?: string;
  alternativeSpecialties?: string[];
  suggestedQuestions?: string[];
}

interface PrepResult {
  questions: string[];
  recordsToBring: string[];
  trackBeforeVisit?: string[];
  redFlags?: string[];
}

interface ApiResponse extends Partial<FitResult>, Partial<PrepResult> {
  ok?: boolean;
  disclaimer?: string;
  error?: string;
}

export default function DoctorAiAssistant({ doctorId }: { doctorId: string }) {
  const [mode, setMode] = useState<Mode>("fit");
  const [concern, setConcern] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);

  const placeholder =
    mode === "fit"
      ? "Describe your main concern — e.g. 'Persistent chest tightness for 3 days when I climb stairs.'"
      : "What will the visit be about? — e.g. 'Follow-up on high BP reading and headaches.'";

  async function submit() {
    const text = concern.trim();
    if (text.length < 4) {
      setError("Please add a few more words about your concern.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/doctors/${doctorId}/ai-assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, concern: text }),
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok) {
        setError(data.error || "AI request failed. Please try again.");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(m: Mode) {
    if (m === mode) return;
    setMode(m);
    setResult(null);
    setError(null);
  }

  const urgencyColor = (() => {
    const u = (result?.urgency || "").toLowerCase();
    if (u.includes("urgent")) return "bg-red-100 text-red-800 border-red-200";
    if (u.includes("soon")) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  })();

  const fitColor = (() => {
    const f = (result?.fit || "").toLowerCase();
    if (f.includes("not")) return "bg-red-50 text-red-700 border-red-200";
    if (f.includes("possible")) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  })();

  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707" />
          </svg>
        </span>
        <div>
          <h2 className="text-lg font-bold text-gray-900">AI Assistant</h2>
          <p className="text-xs text-gray-500">Check fit & prepare for your visit</p>
        </div>
      </div>

      <div className="mb-3 flex gap-1 rounded-lg bg-gray-100 p-1 text-xs font-medium">
        <button
          onClick={() => switchMode("fit")}
          className={`flex-1 rounded-md px-3 py-1.5 transition ${
            mode === "fit" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Right doctor?
        </button>
        <button
          onClick={() => switchMode("prep")}
          className={`flex-1 rounded-md px-3 py-1.5 transition ${
            mode === "prep" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Visit prep
        </button>
      </div>

      <textarea
        value={concern}
        onChange={(e) => setConcern(e.target.value)}
        placeholder={placeholder}
        maxLength={1200}
        rows={3}
        className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
      <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
        <span>{concern.length}/1200</span>
        <span>Private — not stored</span>
      </div>

      <button
        onClick={submit}
        disabled={loading || concern.trim().length < 4}
        className="btn-primary mt-3 w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Thinking…"
          : mode === "fit"
          ? "Check if this doctor fits"
          : "Generate visit prep"}
      </button>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {result && mode === "fit" && (
        <div className="mt-4 space-y-3 text-sm">
          <div className={`rounded-lg border px-3 py-2 ${fitColor}`}>
            <div className="font-semibold">{result.fit}</div>
            <div className="mt-1 text-xs leading-relaxed">{result.fitRationale}</div>
          </div>

          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${urgencyColor}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            Urgency: {result.urgency}
            {result.urgencyReason ? <span className="font-normal opacity-80">· {result.urgencyReason}</span> : null}
          </div>

          {result.alternativeSpecialties && result.alternativeSpecialties.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">You might also consider</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {result.alternativeSpecialties.map((s) => (
                  <span key={s} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.suggestedQuestions && result.suggestedQuestions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ask the doctor</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-gray-700">
                {result.suggestedQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {result && mode === "prep" && (
        <div className="mt-4 space-y-3 text-sm">
          {result.questions && result.questions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Questions to ask</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-gray-700">
                {result.questions.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}

          {result.recordsToBring && result.recordsToBring.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bring with you</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-gray-700">
                {result.recordsToBring.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}

          {result.trackBeforeVisit && result.trackBeforeVisit.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Track before your visit</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-gray-700">
                {result.trackBeforeVisit.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}

          {result.redFlags && result.redFlags.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Don&apos;t wait — seek urgent care if</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-red-700">
                {result.redFlags.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {result?.disclaimer && (
        <p className="mt-3 text-[11px] leading-snug text-gray-400">{result.disclaimer}</p>
      )}
    </div>
  );
}
