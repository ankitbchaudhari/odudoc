"use client";

import { useState, useRef } from "react";
import Link from "next/link";

interface RecommendedDoctor {
  id: string;
  name: string;
  specialty: string;
  qualifications: string;
  experience: number;
  rating: number;
  reviewCount: number;
  fee: number;
  available: boolean;
  city: string;
  imageColor: string;
  initials: string;
}

interface AnalysisResult {
  summary: string;
  primarySpecialty: string;
  secondarySpecialty: string | null;
  detectedConditions: string[];
  urgency: "HIGH" | "MEDIUM" | "LOW";
  recommendedDoctors: RecommendedDoctor[];
}

const SAMPLE_SYMPTOMS = [
  "I have severe chest pain and shortness of breath for 3 days",
  "My child has recurring fever, cough, and difficulty breathing",
  "I've been experiencing migraine headaches and dizziness",
  "I have irregular periods and suspected PCOS",
  "Sharp knee pain and swelling after an injury",
];

const urgencyConfig = {
  HIGH: { label: "High Urgency", color: "text-rose-700", bg: "bg-gradient-to-r from-rose-50 to-red-50", border: "border-rose-200", dot: "bg-rose-500", advice: "Please seek immediate medical attention or call emergency services." },
  MEDIUM: { label: "Medium Urgency", color: "text-amber-700", bg: "bg-gradient-to-r from-amber-50 to-orange-50", border: "border-amber-200", dot: "bg-amber-500", advice: "Schedule an appointment within the next few days." },
  LOW: { label: "Low Urgency", color: "text-emerald-700", bg: "bg-gradient-to-r from-emerald-50 to-teal-50", border: "border-emerald-200", dot: "bg-emerald-500", advice: "A routine appointment within the next 1–2 weeks is recommended." },
};

export default function OduDocAIPage() {
  const [symptoms, setSymptoms] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleFile = (f: File) => {
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowed.includes(f.type)) {
      setError("Only PDF, PNG, JPG, or WEBP files are supported.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File must be under 10MB.");
      return;
    }
    setError("");
    setFile(f);
  };

  const handleAnalyze = async () => {
    if (!symptoms.trim() && !file) {
      setError("Please describe your symptoms or upload a medical report.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms: symptoms.trim(),
          fileName: file?.name || "",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Analysis failed.");
        return;
      }
      setResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const urg = result ? urgencyConfig[result.urgency] : null;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-fuchsia-50 px-4 pb-20 pt-20">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-indigo-300/40 to-purple-300/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 top-20 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-fuchsia-300/40 to-pink-300/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-300/30 to-indigo-300/30 blur-3xl" />

        {/* Floating icons */}
        <div className="pointer-events-none absolute left-[6%] top-32 hidden h-14 w-14 rotate-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl md:flex">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <div className="pointer-events-none absolute right-[8%] top-48 hidden h-14 w-14 -rotate-6 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white shadow-xl md:flex">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          {/* Eyebrow Pill */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-100 to-fuchsia-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700">
            <span>🤖</span>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
            </span>
            Ray · AI Medical Assistant
          </div>

          <h1 className="text-4xl font-extrabold leading-tight text-gray-900 dark:text-slate-100 md:text-5xl lg:text-6xl">
            Upload Your Report.{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
              Find Your Doctor.
            </span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-gray-600 dark:text-slate-300 md:text-xl">
            Ray reads your medical reports and symptoms, identifies possible conditions, and instantly recommends the right specialist for you.
          </p>

          {/* CTA row */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="#try-ray"
              className="rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-600/30 transition-all hover:scale-105"
            >
              ✨ Try Ray Now
            </a>
            <Link
              href="/doctors"
              className="rounded-xl border-2 border-gray-300 dark:border-slate-700 bg-white/70 px-8 py-3.5 text-sm font-bold text-gray-800 dark:text-slate-200 backdrop-blur-sm transition-colors hover:border-indigo-400 hover:bg-white dark:bg-slate-900"
            >
              Browse Doctors
            </Link>
          </div>

          {/* Disclaimer */}
          <div className="mt-8 inline-flex items-start gap-2 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-left text-sm text-amber-800">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <strong>Disclaimer:</strong> Ray provides guidance only — not a medical diagnosis. Always consult a licensed doctor.
            </span>
          </div>
        </div>
      </section>

      {/* Main Card */}
      <section id="try-ray" className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-purple-50/40 px-4 py-16">
        <div className="pointer-events-none absolute -right-32 top-20 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-purple-200/30 to-fuchsia-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-3xl">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 p-[2px] shadow-2xl">
            <div className="rounded-[calc(1.5rem-2px)] bg-white dark:bg-slate-900 p-6 md:p-8">

              {/* File Upload */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-slate-200">
                  Upload Medical Report{" "}
                  <span className="font-normal text-gray-500 dark:text-slate-400">(PDF, PNG, JPG — optional)</span>
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleFile(f);
                  }}
                  onClick={() => fileRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 transition-all ${
                    dragOver
                      ? "border-indigo-500 bg-indigo-50"
                      : file
                      ? "border-emerald-400 bg-emerald-50/60"
                      : "border-gray-300 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-indigo-50/40 hover:border-indigo-400 hover:bg-indigo-50/60"
                  }`}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />

                  {file ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg ring-4 ring-white">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-emerald-700">{file.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="ml-2 rounded-lg p-1 text-gray-400 dark:text-slate-500 hover:bg-rose-100 hover:text-rose-600"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg ring-4 ring-white">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                        Drop your report here or <span className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">browse</span>
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Blood tests, X-ray reports, prescriptions, lab results (max 10MB)</p>
                    </>
                  )}
                </div>
              </div>

              {/* Symptoms */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-slate-200">
                  Describe Your Symptoms <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g., I have been experiencing severe chest pain, shortness of breath, and palpitations for the past 3 days..."
                  className="w-full resize-none rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="mt-1 text-right text-xs text-gray-400 dark:text-slate-500">{symptoms.length} / 1000</p>
              </div>

              {/* Sample prompts */}
              <div className="mb-6">
                <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-slate-400">Try an example:</p>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_SYMPTOMS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSymptoms(s)}
                      className="rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 text-xs text-gray-700 dark:text-slate-300 transition-all hover:border-indigo-400 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-fuchsia-50 hover:text-indigo-700"
                    >
                      {s.length > 45 ? s.slice(0, 45) + "…" : s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {/* Analyze Button */}
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing your report…
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    Analyze with Ray AI
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Loading animation */}
          {loading && (
            <div className="mt-8 rounded-3xl border border-gray-100 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-white shadow-lg ring-4 ring-white">
                <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900 dark:text-slate-100">Ray is analyzing your medical data…</p>
              <div className="mt-3 space-y-2">
                {["Reading report content", "Identifying conditions", "Matching specialist doctors"].map((step, i) => (
                  <p key={step} className="text-sm text-gray-500 dark:text-slate-400" style={{ animationDelay: `${i * 0.5}s` }}>
                    ✓ {step}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {result && urg && (
            <div ref={resultRef} className="mt-8 space-y-5">
              {/* Urgency Banner */}
              <div className={`rounded-2xl border ${urg.border} ${urg.bg} px-5 py-4 shadow-sm`}>
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${urg.dot} animate-pulse`} />
                  <span className={`font-bold ${urg.color}`}>{urg.label}</span>
                </div>
                <p className={`mt-1 text-sm ${urg.color} opacity-80`}>{urg.advice}</p>
              </div>

              {/* AI Summary */}
              <div className="rounded-3xl border border-gray-100 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:shadow-lg">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg ring-4 ring-white">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h2 className="font-bold text-gray-900 dark:text-slate-100">Ray&apos;s Analysis Summary</h2>
                </div>
                <p className="leading-relaxed text-gray-700 dark:text-slate-300">{result.summary}</p>

                {/* Detected conditions */}
                <div className="mt-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Possible Conditions Identified</p>
                  <div className="flex flex-wrap gap-2">
                    {result.detectedConditions.map((c) => (
                      <span key={c} className="rounded-full border border-indigo-200 bg-gradient-to-r from-indigo-50 to-fuchsia-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Specialties */}
                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-2">
                    <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-gray-700 dark:text-slate-300">
                      Primary: <span className="font-bold text-emerald-700">{result.primarySpecialty}</span>
                    </span>
                  </div>
                  {result.secondarySpecialty && (
                    <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 px-3 py-2">
                      <svg className="h-4 w-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs text-gray-700 dark:text-slate-300">
                        Also consider: <span className="font-bold text-sky-700">{result.secondarySpecialty}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recommended Doctors */}
              <div className="rounded-3xl border border-gray-100 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white shadow-lg ring-4 ring-white">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h2 className="font-bold text-gray-900 dark:text-slate-100">Recommended Doctors</h2>
                </div>

                {result.recommendedDoctors.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-slate-400">No specific doctors found. Please browse our <Link href="/doctors" className="font-semibold text-indigo-600 underline">full directory</Link>.</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {result.recommendedDoctors.map((doc) => (
                      <div key={doc.id} className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white dark:bg-slate-900 p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${doc.imageColor} text-sm font-bold text-white shadow-lg ring-4 ring-white`}>
                            {doc.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-900 dark:text-slate-100">{doc.name}</p>
                            <p className="text-xs font-semibold text-indigo-600">{doc.specialty}</p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{doc.qualifications}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <svg className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {doc.rating} ({doc.reviewCount})
                              </span>
                              <span>{doc.experience} yrs exp</span>
                              <span>{doc.city}</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div>
                            <span className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-sm font-extrabold text-transparent">${doc.fee}</span>
                            <span className="text-xs text-gray-500 dark:text-slate-400">/consult</span>
                            {doc.available && (
                              <span className="ml-2 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                                Available
                              </span>
                            )}
                          </div>
                          <Link
                            href={`/doctors/${doc.id}`}
                            className="rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 px-4 py-1.5 text-xs font-bold text-white shadow-md transition-all hover:scale-105"
                          >
                            Book Now
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 text-center">
                  <Link
                    href={`/doctors?specialty=${encodeURIComponent(result.primarySpecialty)}`}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    View all {result.primarySpecialty}s →
                  </Link>
                </div>
              </div>

              {/* Reset */}
              <div className="text-center">
                <button
                  onClick={() => { setResult(null); setSymptoms(""); setFile(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="rounded-xl border-2 border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-300 transition-colors hover:border-indigo-400 hover:text-indigo-700"
                >
                  Start New Analysis
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      {!result && (
        <section className="relative overflow-hidden bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-20">
          <div className="pointer-events-none absolute -left-32 top-20 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-fuchsia-200/30 to-pink-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-32 bottom-10 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-amber-200/30 to-orange-200/30 blur-3xl" />
          <div className="relative mx-auto max-w-5xl">
            <div className="mb-14 text-center">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-100 to-pink-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-fuchsia-700">
                <span>⚡</span> How It Works
              </span>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100 md:text-4xl">
                How{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent">Ray</span>{" "}
                Works
              </h2>
              <p className="mt-3 text-gray-500 dark:text-slate-400">Three simple steps to find your specialist.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Upload or Describe",
                  desc: "Upload your medical report (blood test, X-ray, lab results) or simply describe your symptoms in plain language.",
                  icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12",
                  gradient: "from-sky-500 to-indigo-600",
                },
                {
                  step: "2",
                  title: "AI Analysis",
                  desc: "Ray scans keywords, identifies possible conditions, assesses urgency level, and determines the right medical specialty.",
                  icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
                  gradient: "from-fuchsia-500 to-pink-600",
                },
                {
                  step: "3",
                  title: "Book Your Doctor",
                  desc: "Get matched with top-rated specialist doctors. Book a consultation with one click — online or in-person.",
                  icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
                  gradient: "from-emerald-500 to-teal-600",
                },
              ].map((item) => (
                <div key={item.step} className="rounded-3xl border border-gray-100 bg-white dark:bg-slate-900 p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                  <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.gradient} text-white shadow-lg ring-4 ring-white`}>
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                  </div>
                  <div className={`mb-2 bg-gradient-to-r ${item.gradient} bg-clip-text text-xs font-bold uppercase tracking-widest text-transparent`}>Step {item.step}</div>
                  <h3 className="mb-2 font-bold text-gray-900 dark:text-slate-100">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-slate-300">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Dark Accent CTA */}
      {!result && (
        <section className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-purple-700 to-fuchsia-700 py-20">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
          />
          <div className="pointer-events-none absolute -left-32 -top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-32 -bottom-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

          <div className="relative mx-auto max-w-3xl px-4 text-center">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
              </span>
              Available 24/7
            </span>
            <h2 className="text-3xl font-extrabold text-white md:text-5xl">
              Meet Ray. Your AI Health Ally.
            </h2>
            <p className="mt-4 text-lg text-indigo-50">
              Instant insight. Smart recommendations. The right specialist in seconds — all backed by licensed doctors.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <a
                href="#try-ray"
                className="rounded-xl bg-white dark:bg-slate-900 px-8 py-3.5 text-sm font-bold text-indigo-700 shadow-lg transition-all hover:scale-105"
              >
                ✨ Try Ray Now →
              </a>
              <Link
                href="/doctors"
                className="rounded-xl border-2 border-white/40 bg-white/10 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                Browse Doctors
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
