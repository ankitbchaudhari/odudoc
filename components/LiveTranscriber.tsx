"use client";

// Live in-browser transcriber.
//
// Complementary to the existing AmbientScribe (which ships audio to
// Gemini). This one uses the Web Speech API — captured speech never
// leaves the device, so it's a privacy-preserving fallback for clinics
// that haven't BAA-signed an LLM provider yet, and a useful real-time
// preview while a longer recording is in progress on the cloud path.
//
// Pairs with /api/clinical/soap-note (deterministic structurer) to
// produce a SOAP note from the transcript. No LLM dependency.

import { useEffect, useRef, useState } from "react";

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type Speaker = "doctor" | "patient" | "nurse";

interface Props {
  initialTranscript?: string;
  onTranscript?: (transcript: string) => void;
  language?: string;     // BCP-47 e.g. "en-IN", "hi-IN"
}

const LANGS: Array<[string, string]> = [
  ["en-IN", "English (India)"],
  ["en-US", "English (US)"],
  ["hi-IN", "Hindi"],
  ["mr-IN", "Marathi"],
  ["ta-IN", "Tamil"],
  ["te-IN", "Telugu"],
  ["kn-IN", "Kannada"],
  ["bn-IN", "Bengali"],
  ["gu-IN", "Gujarati"],
];

function prefixForSpeaker(s: Speaker): string {
  return s === "doctor" ? "Doctor: " : s === "patient" ? "Patient: " : "Nurse: ";
}

export default function LiveTranscriber({
  initialTranscript = "",
  onTranscript,
  language: initialLang = "en-IN",
}: Props) {
  const [transcript, setTranscript] = useState(initialTranscript);
  const [interim, setInterim] = useState("");
  const [recording, setRecording] = useState(false);
  const [speaker, setSpeaker] = useState<Speaker>("doctor");
  const [lang, setLang] = useState(initialLang);
  const [supportError, setSupportError] = useState<string | null>(null);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);

  // Push transcript upstream whenever it changes.
  useEffect(() => { onTranscript?.(transcript); }, [transcript, onTranscript]);

  function ensure(): SpeechRecognitionLike | null {
    if (typeof window === "undefined") return null;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setSupportError("Web Speech API not supported in this browser. Use Chrome / Edge / Safari, or paste a transcript manually.");
      return null;
    }
    if (recogRef.current) return recogRef.current;
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = lang;
    r.onresult = (e) => {
      let interimAcc = "";
      let finalAcc = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const t = res[0].transcript;
        if (res.isFinal) finalAcc += t + " ";
        else interimAcc += t;
      }
      if (finalAcc.trim()) {
        const labelled = finalAcc.trim().replace(/\s+/g, " ");
        setTranscript((prev) => {
          const tail = prev.trimEnd();
          const sep = tail ? "\n" : "";
          return `${tail}${sep}${prefixForSpeaker(speaker)}${labelled}`;
        });
      }
      setInterim(interimAcc);
    };
    r.onerror = (e) => {
      if (e?.error === "not-allowed") {
        setSupportError("Microphone permission denied. Allow access in browser settings to record.");
      } else if (e?.error === "no-speech") {
        // benign — user paused
      }
    };
    r.onend = () => {
      setRecording(false);
      setInterim("");
    };
    recogRef.current = r;
    return r;
  }

  // Re-init when language changes.
  useEffect(() => {
    if (recogRef.current) {
      try { recogRef.current.stop(); } catch { /* ok */ }
      recogRef.current = null;
    }
  }, [lang]);

  const start = () => {
    setSupportError(null);
    const r = ensure();
    if (!r) return;
    r.lang = lang;
    try { r.start(); setRecording(true); } catch { /* already started */ }
  };
  const stop = () => { recogRef.current?.stop(); };
  const clear = () => { setTranscript(""); setInterim(""); };

  // Hot-keys for speaker labelling.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "TEXTAREA" || target?.tagName === "INPUT") return;
      if (e.key === "d" || e.key === "D") setSpeaker("doctor");
      else if (e.key === "p" || e.key === "P") setSpeaker("patient");
      else if (e.key === "n" || e.key === "N") setSpeaker("nurse");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="space-y-3">
      {supportError && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{supportError}</div>
      )}
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white dark:bg-slate-900 p-3 shadow-sm">
        {recording ? (
          <button onClick={stop} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white dark:bg-slate-900" /> Stop
          </button>
        ) : (
          <button onClick={start} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
            🎙 Start live capture
          </button>
        )}
        <div className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
          {(["doctor", "patient", "nurse"] as Speaker[]).map((s) => (
            <button key={s} onClick={() => setSpeaker(s)} className={`rounded-md px-3 py-1.5 capitalize ${speaker === s ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400"}`}>
              {s} <span className="text-[10px] text-slate-400">[{s[0].toUpperCase()}]</span>
            </button>
          ))}
        </div>
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="rounded-md border border-slate-300 bg-white dark:bg-slate-900 px-2 py-1 text-xs">
          {LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button onClick={clear} className="ml-auto rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">Clear</button>
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Transcript
          {recording && <span className="ml-2 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-700">live</span>}
          <span className="ml-2 text-slate-400 normal-case">— hot-keys D / P / N to switch speaker</span>
        </label>
        <textarea
          rows={10}
          value={transcript + (interim ? "\n" + prefixForSpeaker(speaker) + interim : "")}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Press Start, or paste / type the consultation transcript here. Use prefixes 'Doctor:' / 'Patient:' / 'Nurse:' to label speakers (auto-added when recording)."
          className="w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 p-3 font-mono text-sm leading-6"
        />
      </div>
    </div>
  );
}
