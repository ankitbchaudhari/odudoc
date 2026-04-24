"use client";

// Live transcript side panel for an in-progress video consult.
//
// The Web Speech API is local-mic only, so each side transcribes its
// own speech and POSTs fragments to the server; both sides poll GET
// to render the merged, role-labeled log. This keeps the transcription
// free (no cloud ASR bill for the live path) and privacy-reasonable
// (audio never leaves the browser).
//
// Limitations to flag:
//   - Web Speech API is best on Chrome/Edge. On other browsers we
//     silently degrade to "receive-only" — the user still sees the
//     peer's transcript, just can't contribute to it.
//   - Recognition is approximate; the post-call dictation flow (which
//     uploads a real audio file to Gemini) handles the high-quality
//     record-for-notes path.
//
// Props:
//   roomId      — server key for sync
//   enabled     — consent flag from the gate; if false, panel isn't
//                 rendered at all
//   selfRole    — "doctor" | "patient", used for role resolution server-side

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings for the vendor-prefixed SpeechRecognition APIs.
interface SpeechRecognitionAlternative { transcript: string }
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface Fragment {
  id: string;
  role: "doctor" | "patient";
  speaker: string;
  text: string;
  ts: number;
}

interface LiveTranscriptProps {
  roomId: string;
  enabled: boolean;
  selfRole: "doctor" | "patient";
}

export default function LiveTranscript({ roomId, enabled, selfRole }: LiveTranscriptProps) {
  const [open, setOpen] = useState(false);
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const lastSeenTsRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fragment POST — fire-and-forget, server echoes back the authoritative
  // id/ts so we don't need to handle the response here.
  const postFragment = useCallback(
    async (text: string) => {
      try {
        await fetch(`/api/rooms/${encodeURIComponent(roomId)}/transcript`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text, role: selfRole }),
        });
      } catch {
        /* transient — recognition keeps going */
      }
    },
    [roomId, selfRole],
  );

  // Poll for new fragments every 2s. We only ask for everything newer
  // than `lastSeenTs` so the payload stays tiny even on long calls.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const pull = async () => {
      try {
        const r = await fetch(
          `/api/rooms/${encodeURIComponent(roomId)}/transcript?since=${lastSeenTsRef.current}`,
          { cache: "no-store" },
        );
        if (!r.ok || cancelled) return;
        const j = (await r.json()) as { fragments: Fragment[]; serverTs: number };
        if (cancelled || !j.fragments?.length) return;
        setFragments((prev) => {
          const seen = new Set(prev.map((f) => f.id));
          const fresh = j.fragments.filter((f) => !seen.has(f.id));
          return [...prev, ...fresh];
        });
        const maxTs = j.fragments.reduce((m, f) => Math.max(m, f.ts), lastSeenTsRef.current);
        lastSeenTsRef.current = maxTs;
      } catch {
        /* ignore */
      }
    };
    pull();
    const i = setInterval(pull, 2000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, [roomId, enabled]);

  // Auto-scroll the log as new fragments arrive.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [fragments]);

  // Feature-detect Web Speech API.
  useEffect(() => {
    setSupported(!!getRecognitionCtor());
  }, []);

  const startListening = () => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    let pending = ""; // accumulates interim results for the current utterance
    rec.onresult = (ev: SpeechRecognitionEvent) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i];
        const text = result[0]?.transcript?.trim() || "";
        if (!text) continue;
        if (result.isFinal) {
          // Prefer the newly finalized text; flush and POST.
          const toSend = text;
          pending = "";
          if (toSend) postFragment(toSend);
        } else {
          pending = text;
        }
      }
    };
    rec.onerror = () => {
      // e.g. no-speech, network — recognition auto-restarts via onend.
    };
    rec.onend = () => {
      // Restart if still active — Web Speech stops after ~60s of silence.
      if (recRef.current) {
        try {
          rec.start();
        } catch {
          /* sometimes double-start throws */
        }
      }
    };
    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch {
      /* already running */
    }
  };

  const stopListening = () => {
    if (recRef.current) {
      try {
        recRef.current.onend = null;
        recRef.current.stop();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    }
    setListening(false);
  };

  // Clean up on unmount so the mic isn't held after the call ends.
  useEffect(() => {
    return () => stopListening();
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* Toggle button — sits next to End Call in the iframe overlay */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="absolute right-28 top-4 z-50 rounded-lg bg-gray-900/80 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-gray-900"
      >
        {open ? "Hide transcript" : `Transcript${fragments.length ? ` · ${fragments.length}` : ""}`}
      </button>

      {open && (
        <aside className="absolute right-0 top-0 z-40 flex h-full w-full max-w-sm flex-col border-l border-white/10 bg-gray-900/95 text-white backdrop-blur-sm">
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Live transcript</p>
              <p className="text-[11px] text-gray-400">
                {supported ? "Web Speech API · English" : "Receive-only on this browser"}
              </p>
            </div>
            {supported && (
              <button
                onClick={listening ? stopListening : startListening}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${
                  listening
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {listening ? "Stop mic capture" : "Start mic capture"}
              </button>
            )}
          </header>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {fragments.length === 0 ? (
              <p className="text-xs text-gray-400">
                Transcript will appear here as you and {selfRole === "doctor" ? "the patient" : "the doctor"} speak.
              </p>
            ) : (
              fragments.map((f) => (
                <div key={f.id}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${
                    f.role === "doctor" ? "text-sky-300" : "text-amber-300"
                  }`}>
                    {f.speaker} · {new Date(f.ts).toLocaleTimeString()}
                  </p>
                  <p className="mt-0.5 text-gray-100">{f.text}</p>
                </div>
              ))
            )}
          </div>
          <footer className="border-t border-white/10 px-4 py-2 text-[11px] text-gray-400">
            Transcripts are for clinical notes. Dictate full findings after
            the call using the Dictation panel.
          </footer>
        </aside>
      )}
    </>
  );
}
