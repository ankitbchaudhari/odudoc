"use client";

// Voice Station — bedside hands-free order capture.
//
// Nurse opens the page next to a patient, presses Start, speaks
// natural-language orders ("Bed 12 vitals BP 130 over 85, pulse 92,
// sat 96. Order CBC and CRP stat."). Web Speech API streams into
// a transcript; the parser splits it into structured orders that
// render as cards. Nurse confirms each → order moves to "confirmed"
// queue. Vitals confirms also push into the wearable readings store
// when a patient id is supplied, so the tele-ICU dashboard updates.

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
interface SpeechRecognitionLike {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void;
}

interface ParsedOrder {
  kind: "vitals" | "medication" | "lab_order" | "stop_med" | "note";
  bedRef?: string;
  vitals?: { systolic?: number; diastolic?: number; hr?: number; rr?: number; spo2?: number; tempC?: number; glucose?: number; weight?: number };
  medication?: { drugName: string; dose?: string; route?: string; frequency?: string };
  stopMed?: { drugName: string };
  labOrders?: { tests: string[]; urgency?: "routine" | "stat" };
  note?: string;
  matchedSpan: string;
  confidence: number;
}

interface CapturedOrder extends ParsedOrder {
  id: string; status: "draft" | "confirmed" | "executed" | "cancelled" | "flagged";
  capturedByName?: string;
  transcript: string;
  createdAt: string;
}

const KIND_TONE: Record<string, string> = {
  vitals: "border-emerald-300 bg-emerald-50",
  medication: "border-rose-300 bg-rose-50",
  stop_med: "border-slate-400 bg-slate-50",
  lab_order: "border-sky-300 bg-sky-50",
  note: "border-amber-300 bg-amber-50",
};
const KIND_LABEL: Record<string, string> = {
  vitals: "📊 Vitals", medication: "💊 Medication",
  stop_med: "🛑 Stop med", lab_order: "🧪 Lab order", note: "📝 Note",
};
const STATUS_PILL: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  executed: "bg-emerald-200 text-emerald-900",
  cancelled: "bg-slate-200 text-slate-600",
  flagged: "bg-rose-100 text-rose-800",
};

function summarise(o: ParsedOrder): string {
  if (o.kind === "vitals" && o.vitals) {
    const p: string[] = [];
    if (o.vitals.systolic && o.vitals.diastolic) p.push(`BP ${o.vitals.systolic}/${o.vitals.diastolic}`);
    if (o.vitals.hr) p.push(`HR ${o.vitals.hr}`);
    if (o.vitals.spo2) p.push(`SpO₂ ${o.vitals.spo2}%`);
    if (o.vitals.rr) p.push(`RR ${o.vitals.rr}`);
    if (o.vitals.tempC) p.push(`${Math.round(o.vitals.tempC * 10) / 10}°C`);
    if (o.vitals.glucose) p.push(`Gluc ${o.vitals.glucose}`);
    if (o.vitals.weight) p.push(`${o.vitals.weight}kg`);
    return p.join(" · ");
  }
  if (o.kind === "medication" && o.medication) {
    const m = o.medication;
    return `${m.drugName}${m.dose ? ` ${m.dose}` : ""}${m.route ? ` ${m.route}` : ""}${m.frequency ? ` ${m.frequency}` : ""}`;
  }
  if (o.kind === "stop_med" && o.stopMed) return `Stop ${o.stopMed.drugName}`;
  if (o.kind === "lab_order" && o.labOrders) return `${o.labOrders.tests.join(", ")}${o.labOrders.urgency === "stat" ? " (STAT)" : ""}`;
  if (o.kind === "note" && o.note) return o.note;
  return o.matchedSpan;
}

export default function VoiceStationPage() {
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [recording, setRecording] = useState(false);
  const [defaultBed, setDefaultBed] = useState("");
  const [parsedQueue, setParsedQueue] = useState<ParsedOrder[]>([]);
  const [unclassified, setUnclassified] = useState<string[]>([]);
  const [recent, setRecent] = useState<CapturedOrder[]>([]);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [patientId, setPatientId] = useState("");
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadRecent = useCallback(async () => {
    const r = await fetch("/api/voice-orders", { cache: "no-store" });
    if (r.ok) setRecent((await r.json()).orders || []);
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  // Re-parse the transcript every 500ms after typing/speaking pause.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!transcript.trim()) { setParsedQueue([]); setUnclassified([]); return; }
    debounceRef.current = setTimeout(async () => {
      const r = await fetch("/api/voice-orders/parse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, defaultBedRef: defaultBed || undefined }),
      });
      if (r.ok) {
        const d = await r.json();
        setParsedQueue(d.orders || []);
        setUnclassified(d.unclassified || []);
      }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [transcript, defaultBed]);

  const ensureRecogniser = (): SpeechRecognitionLike | null => {
    if (typeof window === "undefined") return null;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setSupportError("Live speech-to-text not supported. Use Chrome / Edge / Safari.");
      return null;
    }
    if (recogRef.current) return recogRef.current;
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-IN";
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
        setTranscript((prev) => (prev + " " + finalAcc).trim().replace(/\s+/g, " "));
      }
      setInterim(interimAcc);
    };
    r.onerror = (e) => {
      if (e?.error === "not-allowed") setSupportError("Microphone permission denied.");
    };
    r.onend = () => { setRecording(false); setInterim(""); };
    recogRef.current = r;
    return r;
  };

  const start = () => {
    setSupportError(null);
    const r = ensureRecogniser();
    if (!r) return;
    try { r.start(); setRecording(true); } catch { /* already started */ }
  };
  const stop = () => recogRef.current?.stop();
  const clear = () => { setTranscript(""); setInterim(""); setParsedQueue([]); setUnclassified([]); };

  const captureOne = async (parsed: ParsedOrder) => {
    const r = await fetch("/api/voice-orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, parsed }),
    });
    if (r.ok) {
      setToast({ kind: "ok", text: "Captured." });
      // Remove this parsed item so the list shrinks visibly.
      setParsedQueue((prev) => prev.filter((x) => x !== parsed));
      await loadRecent();
    } else {
      setToast({ kind: "err", text: "Capture failed." });
    }
  };

  const captureAll = async () => {
    let n = 0;
    for (const p of parsedQueue) {
      const r = await fetch("/api/voice-orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, parsed: p }),
      });
      if (r.ok) n++;
    }
    if (n > 0) {
      setToast({ kind: "ok", text: `${n} order${n === 1 ? "" : "s"} captured.` });
      setParsedQueue([]);
      setTranscript("");
      await loadRecent();
    }
  };

  const transition = async (id: string, to: string, extra: Record<string, unknown> = {}) => {
    const r = await fetch(`/api/voice-orders/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, ...extra }),
    });
    if (r.ok) { setToast({ kind: "ok", text: `→ ${to}` }); await loadRecent(); }
    else { setToast({ kind: "err", text: "Failed." }); }
  };

  return (
    <div>
      {toast && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${toast.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Voice Station</h2>
        <p className="mt-1 text-sm text-gray-500">
          Hands-free bedside capture. Press Start, speak natural-language orders, and the parser splits them into structured vitals / meds / labs / notes for confirmation.
        </p>
      </div>

      {supportError && <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{supportError}</div>}

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        {/* Capture column */}
        <div className="space-y-3">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {recording ? (
                <button onClick={stop} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" /> Stop
                </button>
              ) : (
                <button onClick={start} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
                  🎙 Start dictation
                </button>
              )}
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Default bed (optional)" value={defaultBed} onChange={(e) => setDefaultBed(e.target.value)} />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Patient user id (for vitals push)" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
              <button onClick={clear} className="ml-auto rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">Clear</button>
            </div>
            <textarea
              value={transcript + (interim ? " " + interim : "")}
              onChange={(e) => setTranscript(e.target.value)}
              rows={6}
              placeholder='Try: "Bed 12 vitals BP 130 over 85, pulse 92, sat 96, temp 99 point 4. Give paracetamol 500 mg PO stat. Order CBC and CRP stat."'
              className="w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-sm leading-6"
            />
            {recording && <p className="mt-1 text-[11px] text-rose-700">🎙 Recording — speak naturally; the parser updates 500ms after each pause.</p>}
          </div>

          {parsedQueue.length > 0 && (
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900">Detected ({parsedQueue.length})</p>
                <button onClick={captureAll} className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">Capture all</button>
              </div>
              <ul className="space-y-2">
                {parsedQueue.map((o, i) => (
                  <li key={i} className={`rounded-lg border-l-4 p-2 text-sm ${KIND_TONE[o.kind]}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{KIND_LABEL[o.kind]}{o.bedRef ? ` · ${o.bedRef}` : ""}</p>
                        <p className="mt-0.5 font-semibold text-slate-900">{summarise(o)}</p>
                        <p className="text-[10px] italic text-slate-500 mt-0.5">&ldquo;{o.matchedSpan}&rdquo;</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${o.confidence < 0.7 ? "bg-rose-200 text-rose-800" : "bg-slate-200 text-slate-700"}`}>{Math.round(o.confidence * 100)}%</span>
                        <button onClick={() => captureOne(o)} className="rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white">Capture</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {unclassified.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">
              <p className="font-bold text-amber-900">Unclassified spans ({unclassified.length})</p>
              <ul className="mt-1 space-y-1">
                {unclassified.map((u, i) => <li key={i} className="italic text-amber-800">&ldquo;{u}&rdquo;</li>)}
              </ul>
              <p className="mt-1 text-amber-700">Reword these or capture them as a free-text note.</p>
            </div>
          )}
        </div>

        {/* Recent column */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-bold text-slate-900">Recent orders ({recent.length})</p>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-400">Captured orders appear here for confirmation.</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((o) => (
                <li key={o.id} className={`rounded-lg border-l-4 p-2 text-sm ${KIND_TONE[o.kind]}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{KIND_LABEL[o.kind]}{o.bedRef ? ` · ${o.bedRef}` : ""}</p>
                      <p className="mt-0.5 font-semibold text-slate-900">{summarise(o)}</p>
                      <p className="text-[10px] text-slate-500">{o.capturedByName || "—"} · {new Date(o.createdAt).toLocaleString()}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_PILL[o.status]}`}>{o.status}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(o.status === "draft" || o.status === "flagged") && (
                      <>
                        <button onClick={() => transition(o.id, "confirmed")} className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">Confirm</button>
                        <button onClick={() => transition(o.id, "cancelled")} className="rounded-md border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-600">Discard</button>
                      </>
                    )}
                    {o.status === "confirmed" && (
                      <button onClick={() => transition(o.id, "executed", { patientUserId: patientId || undefined, deviceId: "voice-station" })} className="rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white">Execute → push</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-white p-4 text-xs text-slate-600 shadow-sm">
        <p className="font-bold text-slate-900">Recognised patterns</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li><strong>Vitals:</strong> &ldquo;Bed 12 vitals BP 130 over 85, pulse 92, sat 96, temp 99 point 4.&rdquo;</li>
          <li><strong>Medication:</strong> &ldquo;Bed 14 give paracetamol 500 mg PO stat.&rdquo;</li>
          <li><strong>Lab order:</strong> &ldquo;Bed 7 order CBC and CRP and troponin stat.&rdquo;</li>
          <li><strong>Stop med:</strong> &ldquo;Bed 3 stop morphine.&rdquo;</li>
          <li><strong>Note:</strong> &ldquo;Bed 9 note: patient agitated, started haloperidol per protocol.&rdquo;</li>
        </ul>
      </div>
    </div>
  );
}
