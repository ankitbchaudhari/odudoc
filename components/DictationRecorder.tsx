"use client";

// Post-call dictation recorder for doctors.
//
// Flow: doctor taps "Record" → browser captures mic via MediaRecorder
// (webm/opus) → on "Stop" we upload the blob to /api/ai/dictation,
// which asks Gemini to both transcribe and structure the dictation
// into the same Suggestion shape as the text AI helper. The parent
// receives the suggestion via onResult and fills the Rx form.
//
// Sits in the post-call panel so it doesn't compete with the active
// call's audio routing.

import { useEffect, useRef, useState } from "react";

export interface DictationSuggestion {
  treatment: string;
  investigations: string[];
  medicines: { name: string; dose: string; frequency: string; duration: string }[];
  warning?: string;
}

interface DictationRecorderProps {
  context?: { patientName?: string; age?: number; sex?: string; allergies?: string };
  onResult: (result: { suggestion: DictationSuggestion; transcript: string }) => void;
}

export default function DictationRecorder({ context, onResult }: DictationRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Release the mic on unmount so the OS-level recording indicator
  // doesn't linger if the doctor navigates away mid-recording.
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const pickMime = (): string => {
    if (typeof MediaRecorder === "undefined") return "";
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    for (const c of candidates) {
      try {
        if (MediaRecorder.isTypeSupported(c)) return c;
      } catch {
        /* ignore */
      }
    }
    return "";
  };

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = handleStop;
      rec.start(1000);
      mediaRecorderRef.current = rec;
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      setError("Couldn't access your microphone. Check browser permissions.");
    }
  };

  const stop = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      /* already stopped */
    }
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleStop = async () => {
    // Release the mic immediately — we don't need it past this point.
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const rec = mediaRecorderRef.current;
    const mime = rec?.mimeType || "audio/webm";
    const blob = new Blob(chunksRef.current, { type: mime });
    chunksRef.current = [];
    mediaRecorderRef.current = null;

    if (blob.size < 500) {
      setError("Recording was too short. Please try again.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.set("audio", blob, `dictation.${mime.includes("mp4") ? "m4a" : "webm"}`);
      if (context) form.set("context", JSON.stringify(context));
      const res = await fetch("/api/ai/dictation", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Transcription failed.");
        return;
      }
      setTranscript(data.transcript || "");
      onResult({
        suggestion: data.suggestion,
        transcript: data.transcript || "",
      });
    } catch {
      setError("Network error — please try again.");
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Dictate findings & prescription</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Record a short voice note; Gemini transcribes it and auto-fills the Rx form.
          </p>
        </div>
        {recording && (
          <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Recording · {formatTime(elapsed)}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        {!recording ? (
          <button
            onClick={start}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8m-4-8a3 3 0 003-3V6a3 3 0 00-6 0v5a3 3 0 003 3z" />
            </svg>
            {uploading ? "Transcribing…" : "Start recording"}
          </button>
        ) : (
          <button
            onClick={stop}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" />
            </svg>
            Stop & transcribe
          </button>
        )}
        {uploading && (
          <span className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 dark:border-slate-700 border-t-primary-500" />
            Sending to Gemini…
          </span>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {transcript && (
        <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 dark:bg-slate-900 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            Transcript
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800 dark:text-slate-200">{transcript}</p>
        </div>
      )}
    </div>
  );
}
