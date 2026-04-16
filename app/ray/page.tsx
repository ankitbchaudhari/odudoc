"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

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
  HIGH: { label: "High Urgency", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500", advice: "Please seek immediate medical attention or call emergency services." },
  MEDIUM: { label: "Medium Urgency", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500", advice: "Schedule an appointment within the next few days." },
  LOW: { label: "Low Urgency", color: "text-green-700", bg: "bg-green-50", border: "border-green-200", dot: "bg-green-500", advice: "A routine appointment within the next 1–2 weeks is recommended." },
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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-16">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-primary-600/20 blur-3xl" />
          <div className="absolute -right-40 top-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-4 py-1.5 text-sm font-medium text-primary-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary-400" />
            OduDoc AI — Medical Report Analyzer
          </div>

          <h1 className="text-4xl font-extrabold leading-tight text-white md:text-5xl">
            Upload Your Report.{" "}
            <span className="bg-gradient-to-r from-primary-400 to-cyan-400 bg-clip-text text-transparent">
              Find Your Doctor.
            </span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-400">
            Our AI reads your medical reports and symptoms, identifies possible conditions, and instantly recommends the right specialist for you.
          </p>

          {/* Disclaimer */}
          <div className="mt-6 inline-flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-300">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <strong>Disclaimer:</strong> OduDoc AI provides guidance only — not a medical diagnosis. Always consult a licensed doctor.
            </span>
          </div>
        </div>
      </section>

      {/* Main Card */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-6 shadow-2xl backdrop-blur-sm md:p-8">

            {/* File Upload */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Upload Medical Report{" "}
                <span className="font-normal text-slate-400">(PDF, PNG, JPG — optional)</span>
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
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 transition-all ${
                  dragOver
                    ? "border-primary-400 bg-primary-500/10"
                    : file
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-slate-600 hover:border-primary-500/50 hover:bg-slate-700/30"
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20 text-green-400">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-green-400">{file.name}</p>
                      <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="ml-2 rounded-lg p-1 text-slate-400 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700">
                      <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-300">
                      Drop your report here or <span className="text-primary-400">browse</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Blood tests, X-ray reports, prescriptions, lab results (max 10MB)</p>
                  </>
                )}
              </div>
            </div>

            {/* Symptoms */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Describe Your Symptoms <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={4}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="e.g., I have been experiencing severe chest pain, shortness of breath, and palpitations for the past 3 days..."
                className="w-full resize-none rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <p className="mt-1 text-right text-xs text-slate-500">{symptoms.length} / 1000</p>
            </div>

            {/* Sample prompts */}
            <div className="mb-6">
              <p className="mb-2 text-xs font-medium text-slate-400">Try an example:</p>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_SYMPTOMS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSymptoms(s)}
                    className="rounded-full border border-slate-600 bg-slate-700/40 px-3 py-1 text-xs text-slate-300 transition-colors hover:border-primary-500/50 hover:bg-primary-500/10 hover:text-primary-300"
                  >
                    {s.length > 45 ? s.slice(0, 45) + "…" : s}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-primary-600 to-cyan-600 px-6 py-4 text-sm font-bold text-white shadow-lg transition-all hover:from-primary-700 hover:to-cyan-700 hover:shadow-primary-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Analyze with OduDoc AI
                </>
              )}
            </button>
          </div>

          {/* Loading animation */}
          {loading && (
            <div className="mt-8 rounded-2xl border border-slate-700/50 bg-slate-800/60 p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/10">
                <svg className="h-8 w-8 animate-spin text-primary-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <p className="font-semibold text-slate-200">Analyzing your medical data…</p>
              <div className="mt-3 space-y-2">
                {["Reading report content", "Identifying conditions", "Matching specialist doctors"].map((step, i) => (
                  <p key={step} className="text-sm text-slate-400" style={{ animationDelay: `${i * 0.5}s` }}>
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
              <div className={`rounded-xl border ${urg.border} ${urg.bg} px-5 py-4`}>
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${urg.dot} animate-pulse`} />
                  <span className={`font-bold ${urg.color}`}>{urg.label}</span>
                </div>
                <p className={`mt-1 text-sm ${urg.color} opacity-80`}>{urg.advice}</p>
              </div>

              {/* AI Summary */}
              <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500/20">
                    <svg className="h-5 w-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h2 className="font-bold text-white">AI Analysis Summary</h2>
                </div>
                <p className="leading-relaxed text-slate-300">{result.summary}</p>

                {/* Detected conditions */}
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Possible Conditions Identified</p>
                  <div className="flex flex-wrap gap-2">
                    {result.detectedConditions.map((c) => (
                      <span key={c} className="rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-xs font-medium text-primary-300">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Specialties */}
                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 rounded-lg bg-slate-700/50 px-3 py-2">
                    <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-slate-300">
                      Primary: <span className="font-semibold text-cyan-400">{result.primarySpecialty}</span>
                    </span>
                  </div>
                  {result.secondarySpecialty && (
                    <div className="flex items-center gap-2 rounded-lg bg-slate-700/50 px-3 py-2">
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs text-slate-300">
                        Also consider: <span className="font-semibold text-slate-200">{result.secondarySpecialty}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recommended Doctors */}
              <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/20">
                    <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h2 className="font-bold text-white">Recommended Doctors</h2>
                </div>

                {result.recommendedDoctors.length === 0 ? (
                  <p className="text-sm text-slate-400">No specific doctors found. Please browse our <Link href="/doctors" className="text-primary-400 underline">full directory</Link>.</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {result.recommendedDoctors.map((doc) => (
                      <div key={doc.id} className="flex flex-col justify-between rounded-xl border border-slate-600/50 bg-slate-700/30 p-4 transition-colors hover:border-primary-500/40 hover:bg-slate-700/50">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${doc.imageColor} text-sm font-bold text-white`}>
                            {doc.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-white">{doc.name}</p>
                            <p className="text-xs text-primary-400">{doc.specialty}</p>
                            <p className="mt-0.5 text-xs text-slate-400">{doc.qualifications}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <svg className="h-3.5 w-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
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
                            <span className="text-sm font-bold text-white">${doc.fee}</span>
                            <span className="text-xs text-slate-400">/consult</span>
                            {doc.available && (
                              <span className="ml-2 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                                Available
                              </span>
                            )}
                          </div>
                          <Link
                            href={`/doctors/${doc.id}`}
                            className="rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
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
                    className="text-sm font-medium text-primary-400 hover:text-primary-300"
                  >
                    View all {result.primarySpecialty}s →
                  </Link>
                </div>
              </div>

              {/* Reset */}
              <div className="text-center">
                <button
                  onClick={() => { setResult(null); setSymptoms(""); setFile(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="rounded-xl border border-slate-600 px-6 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700"
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
        <section className="border-t border-slate-800 px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-10 text-center text-2xl font-bold text-white">How OduDoc AI Works</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Upload or Describe",
                  desc: "Upload your medical report (blood test, X-ray, lab results) or simply describe your symptoms in plain language.",
                  icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12",
                  color: "text-primary-400",
                  bg: "bg-primary-500/10",
                },
                {
                  step: "2",
                  title: "AI Analysis",
                  desc: "Our AI scans keywords, identifies possible conditions, assesses urgency level, and determines the right medical specialty.",
                  icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
                  color: "text-cyan-400",
                  bg: "bg-cyan-500/10",
                },
                {
                  step: "3",
                  title: "Book Your Doctor",
                  desc: "Get matched with top-rated specialist doctors. Book a consultation with one click — online or in-person.",
                  icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
                  color: "text-green-400",
                  bg: "bg-green-500/10",
                },
              ].map((item) => (
                <div key={item.step} className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-6 text-center">
                  <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${item.bg}`}>
                    <svg className={`h-7 w-7 ${item.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                    </svg>
                  </div>
                  <div className={`mb-2 text-xs font-bold uppercase tracking-wider ${item.color}`}>Step {item.step}</div>
                  <h3 className="mb-2 font-bold text-white">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
