"use client";

// Ambient scribe: button + recording UI that captures consultation
// audio in the browser, ships it to /api/ai/scribe, and hands the
// resulting SOAP note back to the parent visit form.
//
// Flow:
//   1. Doctor clicks "Start ambient note" → consent modal opens.
//   2. Doctor + patient verbally consent → doctor clicks "I have consent".
//   3. Browser starts MediaRecorder. Mic indicator pulses, timer ticks.
//   4. Doctor clicks "Stop & transcribe" when done.
//   5. Audio uploads to /api/ai/scribe → SOAP JSON returns.
//   6. Parent's `onResult` callback receives the SOAP and merges it
//      into the visit form fields.
//
// Security: the recording stays in the browser until the doctor
// presses Stop. We never upload mid-stream. The Blob is also
// dropped from memory after the upload completes.

import { useEffect, useRef, useState } from "react";

interface SoapResult {
  chiefComplaint: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  vitals?: string;
  transcript?: string;
}

interface Props {
  onResult: (soap: SoapResult) => void;
  className?: string;
}

type Phase =
  | "idle"          // not started
  | "consent"       // showing consent modal
  | "recording"     // capturing audio
  | "uploading"     // sending to API
  | "done"          // showed result, dismissable
  | "error";

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function AmbientScribe({ onResult, className = "" }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  // Tidy up on unmount — never leave the mic light on.
  useEffect(() => {
    return () => {
      stopTracksOnly();
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  function stopTracksOnly() {
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
  }

  async function beginRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // Pick the first MIME type the browser supports. Safari is finicky.
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
      const supported = candidates.find((c) => MediaRecorder.isTypeSupported(c)) || "";
      const recorder = new MediaRecorder(stream, supported ? { mimeType: supported } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = handleStopped;
      recorder.start(1000); // chunk every 1s — keeps memory bounded
      setPhase("recording");
      setElapsed(0);
      tickRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (e) {
      setError(`Microphone access denied: ${(e as Error).message}`);
      setPhase("error");
    }
  }

  function stopRecording() {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
      // onstop fires async; phase flips in handleStopped()
      setPhase("uploading");
    }
  }

  async function handleStopped() {
    stopTracksOnly();
    const chunks = chunksRef.current;
    chunksRef.current = [];
    if (chunks.length === 0) {
      setError("No audio captured. Try again.");
      setPhase("error");
      return;
    }
    const mime = chunks[0].type || "audio/webm";
    const blob = new Blob(chunks, { type: mime });
    if (blob.size === 0) {
      setError("Recording was empty.");
      setPhase("error");
      return;
    }

    const fd = new FormData();
    fd.append("audio", blob, `consultation.${mime.includes("mp4") ? "m4a" : "webm"}`);
    try {
      const res = await fetch("/api/ai/scribe", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const soap = data.soap as SoapResult;
      onResult(soap);
      setLastTranscript(soap.transcript || null);
      setPhase("done");
    } catch (e) {
      setError((e as Error).message);
      setPhase("error");
    }
  }

  function reset() {
    setPhase("idle");
    setElapsed(0);
    setError(null);
    setLastTranscript(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (phase === "idle" || phase === "error" || phase === "done") {
            reset();
            setPhase("consent");
          } else if (phase === "recording") {
            stopRecording();
          }
        }}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
          phase === "recording"
            ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
            : phase === "uploading"
              ? "border-violet-200 bg-violet-50 text-violet-700"
              : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
        } ${className}`}
        disabled={phase === "uploading"}
      >
        {phase === "recording" ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-600" />
            </span>
            Stop &amp; transcribe · {formatElapsed(elapsed)}
          </>
        ) : phase === "uploading" ? (
          <>
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Transcribing…
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 11-14 0m7 7v4m0 0H8m4 0h4m-7-9V5a3 3 0 016 0v8a3 3 0 11-6 0z" />
            </svg>
            Ambient note
          </>
        )}
      </button>

      {/* Consent modal */}
      {phase === "consent" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Patient consent required</h3>
            <p className="mt-2 text-sm text-slate-600">
              The ambient scribe will record audio of this consultation and transcribe it into a SOAP note. Before you start:
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
              <li>✓ Tell the patient the visit is being recorded for note-taking.</li>
              <li>✓ Confirm verbally that they consent.</li>
              <li>✓ Stop the recording before discussing anything off-topic.</li>
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              Audio is sent to Google Gemini for transcription and is not stored on OduDoc servers. The doctor reviews and edits every note before saving.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={reset}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={beginRecording}
                className="flex-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-500/30 hover:bg-violet-700"
              >
                I have consent — start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error toast */}
      {phase === "error" && error && (
        <div className="fixed inset-x-0 bottom-6 z-50 mx-auto max-w-md rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <p>{error}</p>
            <button onClick={reset} className="text-xs font-bold uppercase tracking-wide text-rose-700">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Transcript review modal */}
      {phase === "done" && lastTranscript && (
        <div className="fixed inset-x-0 bottom-6 z-50 mx-auto max-w-md rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                ✓ Note drafted from audio
              </p>
              <p className="mt-1 text-xs text-emerald-800">
                {lastTranscript}
              </p>
              <p className="mt-1.5 text-xs text-emerald-700">
                Review the SOAP fields above before saving.
              </p>
            </div>
            <button onClick={reset} className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
