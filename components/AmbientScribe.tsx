"use client";

// Ambient scribe: button + recording UI that captures consultation
// audio in the browser, ships it to /api/ai/scribe, and hands the
// resulting SOAP note back to the parent visit form.
//
// Two modes:
//   - Short (default): one MediaRecorder run, one upload, one Gemini
//     SOAP call. Up to ~25 minutes / 25 MB.
//   - Long: chunks the recording into 4-minute slices client-side,
//     transcribes each via /api/ai/scribe?mode=transcribe-only,
//     concatenates the transcripts, then POSTs them to
//     /api/ai/scribe/finalize for one SOAP structuring pass. Avoids
//     holding any single Lambda open beyond Vercel's function timeout.
//     Auto-engages once a recording crosses ~4 minutes.
//
// Language hint dropdown: pinned to the prompt so Gemini locks onto
// Indian-language consults with English medical terms mixed in.
//
// Audit trail: when patientId is provided, the server writes
// scribe.consent_acknowledged + scribe.recording_started on upload
// and scribe.recording_completed once SOAP is produced.

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
  /** When provided, the API writes audit rows on the patient. Strongly
   *  recommended for any clinic deployment — DPDP/IMC compliance. */
  patientId?: string;
  className?: string;
}

type Phase =
  | "idle"
  | "consent"
  | "recording"
  | "uploading"
  | "done"
  | "error";

const LANGUAGES: Array<{ value: string; label: string }> = [
  { value: "",                  label: "Auto-detect" },
  { value: "English",           label: "English" },
  { value: "Hindi",             label: "Hindi" },
  { value: "Hindi-English code-switch", label: "Hinglish" },
  { value: "Marathi",           label: "Marathi" },
  { value: "Tamil",             label: "Tamil" },
  { value: "Telugu",            label: "Telugu" },
  { value: "Kannada",           label: "Kannada" },
  { value: "Malayalam",         label: "Malayalam" },
  { value: "Bengali",           label: "Bengali" },
  { value: "Gujarati",          label: "Gujarati" },
  { value: "Punjabi",           label: "Punjabi" },
  { value: "Urdu",              label: "Urdu" },
];

const CHUNK_MS = 4 * 60 * 1000; // flush every 4 min in long mode

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function AmbientScribe({ onResult, patientId, className = "" }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>("");
  const [longMode, setLongMode] = useState(false);
  /** When long mode is active and the doctor has stopped, we may still
   *  be uploading the tail chunks — show progress so they don't think
   *  it's frozen. */
  const [chunkProgress, setChunkProgress] = useState<{ done: number; total: number } | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<NodeJS.Timeout | null>(null);
  /** Long-mode: each finalised slice (4-min worth of audio). The last
   *  slice is the live one being recorded into. */
  const slicesRef = useRef<Blob[]>([]);
  const longTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stoppedManually = useRef(false);

  useEffect(() => {
    return () => {
      stopTracksOnly();
      if (tickRef.current) clearInterval(tickRef.current);
      if (longTimerRef.current) clearTimeout(longTimerRef.current);
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
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
      const supported = candidates.find((c) => MediaRecorder.isTypeSupported(c)) || "";
      const recorder = new MediaRecorder(stream, supported ? { mimeType: supported } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      slicesRef.current = [];
      stoppedManually.current = false;
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = handleRecorderStop;
      recorder.start(1000);
      setPhase("recording");
      setElapsed(0);
      setLongMode(false);
      tickRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);

      // Auto-flush every CHUNK_MS to keep memory bounded; engages
      // long-recording mode once we cross the threshold.
      longTimerRef.current = setTimeout(rotateChunk, CHUNK_MS);
    } catch (e) {
      setError(`Microphone access denied: ${(e as Error).message}`);
      setPhase("error");
    }
  }

  /** In long mode: flush the current MediaRecorder, save its blob as a
   *  slice, then start a fresh recorder so memory stays bounded. */
  function rotateChunk() {
    const r = recorderRef.current;
    if (!r || r.state === "inactive") return;
    setLongMode(true);
    // Stash the current chunks as a finalised slice; start a new
    // recorder on the same stream so capture is uninterrupted.
    r.onstop = () => {
      if (chunksRef.current.length > 0) {
        const mime = chunksRef.current[0].type || "audio/webm";
        slicesRef.current.push(new Blob(chunksRef.current, { type: mime }));
        chunksRef.current = [];
      }
      // Start a new recorder if the user hasn't actually stopped.
      if (!stoppedManually.current && streamRef.current) {
        try {
          const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
          const supported = candidates.find((c) => MediaRecorder.isTypeSupported(c)) || "";
          const next = new MediaRecorder(streamRef.current, supported ? { mimeType: supported } : undefined);
          recorderRef.current = next;
          next.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
          };
          next.onstop = handleRecorderStop;
          next.start(1000);
          longTimerRef.current = setTimeout(rotateChunk, CHUNK_MS);
        } catch (e) {
          setError(`Recording failed mid-stream: ${(e as Error).message}`);
          setPhase("error");
        }
      } else {
        // User has stopped; trigger upload of all slices.
        finishUpload();
      }
    };
    try {
      r.stop();
    } catch {
      /* state changed under us — ignore */
    }
  }

  function stopRecording() {
    stoppedManually.current = true;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (longTimerRef.current) {
      clearTimeout(longTimerRef.current);
      longTimerRef.current = null;
    }
    setPhase("uploading");
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
      // handleRecorderStop or rotateChunk's onstop will invoke
      // finishUpload() once the final blob is materialised.
    } else {
      finishUpload();
    }
  }

  /** Default short-mode handler — only fires when the recorder stops
   *  manually before any rotation has occurred. */
  function handleRecorderStop() {
    if (longMode) {
      // Long-mode rotations override onstop dynamically; shouldn't
      // hit this path. Defensive: if we somehow do, fold the live
      // chunks into a slice so finishUpload() sees it.
      if (chunksRef.current.length > 0) {
        const mime = chunksRef.current[0].type || "audio/webm";
        slicesRef.current.push(new Blob(chunksRef.current, { type: mime }));
        chunksRef.current = [];
      }
      finishUpload();
      return;
    }
    finishUpload();
  }

  async function finishUpload() {
    stopTracksOnly();
    try {
      // Short-mode path: a single blob upload.
      if (!longMode && slicesRef.current.length === 0) {
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
        if (patientId) fd.append("patientId", patientId);
        if (language) fd.append("language", language);
        fd.append("mode", "soap");
        const res = await fetch("/api/ai/scribe", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        const soap = data.soap as SoapResult;
        onResult(soap);
        setLastTranscript(soap.transcript || null);
        setPhase("done");
        return;
      }

      // Long-mode path: ensure any in-flight chunk is added as a final
      // slice, then transcribe each slice and finalise.
      if (chunksRef.current.length > 0) {
        const mime = chunksRef.current[0].type || "audio/webm";
        slicesRef.current.push(new Blob(chunksRef.current, { type: mime }));
        chunksRef.current = [];
      }
      const slices = slicesRef.current;
      slicesRef.current = [];
      if (slices.length === 0) {
        setError("No audio captured.");
        setPhase("error");
        return;
      }

      const transcripts: string[] = [];
      setChunkProgress({ done: 0, total: slices.length });
      for (let i = 0; i < slices.length; i++) {
        const slice = slices[i];
        if (slice.size === 0) {
          setChunkProgress({ done: i + 1, total: slices.length });
          continue;
        }
        const mime = slice.type || "audio/webm";
        const fd = new FormData();
        fd.append("audio", slice, `chunk-${i}.${mime.includes("mp4") ? "m4a" : "webm"}`);
        if (language) fd.append("language", language);
        fd.append("mode", "transcribe-only");
        const res = await fetch("/api/ai/scribe", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Chunk ${i + 1} failed`);
        if (typeof data.transcript === "string" && data.transcript) {
          transcripts.push(data.transcript);
        }
        setChunkProgress({ done: i + 1, total: slices.length });
      }

      const fullTranscript = transcripts.join("\n\n").trim();
      if (!fullTranscript) {
        setError("Transcripts came back empty. Try recording again.");
        setPhase("error");
        return;
      }

      const finRes = await fetch("/api/ai/scribe/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: fullTranscript,
          patientId: patientId || undefined,
          language: language || undefined,
        }),
      });
      const finData = await finRes.json();
      if (!finRes.ok) throw new Error(finData.error || "Finalize failed");
      const soap = finData.soap as SoapResult;
      onResult(soap);
      setLastTranscript(
        soap.transcript ||
          `Transcribed ${slices.length} segments (${fullTranscript.split(/\s+/).length} words).`
      );
      setPhase("done");
    } catch (e) {
      setError((e as Error).message);
      setPhase("error");
    } finally {
      setChunkProgress(null);
    }
  }

  function reset() {
    setPhase("idle");
    setElapsed(0);
    setError(null);
    setLastTranscript(null);
    setLongMode(false);
    setChunkProgress(null);
  }

  return (
    <>
      <div className={`inline-flex items-center gap-2 ${className}`}>
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
          }`}
          disabled={phase === "uploading"}
        >
          {phase === "recording" ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-600" />
              </span>
              {longMode ? "Long mode · " : ""}Stop &amp; transcribe · {formatElapsed(elapsed)}
            </>
          ) : phase === "uploading" ? (
            <>
              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {chunkProgress
                ? `Transcribing ${chunkProgress.done}/${chunkProgress.total} segments…`
                : "Transcribing…"}
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

        {(phase === "idle" || phase === "consent" || phase === "error" || phase === "done") && (
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-violet-400 focus:outline-none"
            title="Primary language spoken in the consultation"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        )}
      </div>

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
              Audio is sent to Google Gemini for transcription and is not stored on OduDoc servers. The doctor reviews and edits every note before saving. Consent + recording lifecycle is written to the EMR audit log.
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

      {phase === "done" && lastTranscript && (
        <div className="fixed inset-x-0 bottom-6 z-50 mx-auto max-w-md rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                ✓ Note drafted from audio
              </p>
              <p className="mt-1 text-xs text-emerald-800">{lastTranscript}</p>
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
