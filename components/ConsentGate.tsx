"use client";

// Pre-join consent modal. We legally need explicit opt-in before
// capturing live transcript audio (DPDP in India, HIPAA-equivalent
// elsewhere). The user must tick at least the "I'm ready to join"
// box; transcript consent is optional — if they decline, the call
// still proceeds but the transcript panel is disabled.
//
// Consent state is cached per-room in localStorage so a page reload
// during the same call doesn't re-prompt.

import { useEffect, useState } from "react";

interface ConsentGateProps {
  roomId: string;
  onContinue: (consent: { transcript: boolean }) => void;
  doctorName: string;
}

const STORAGE_KEY = (roomId: string) => `odudoc:consent:${roomId}`;

interface StoredConsent {
  transcript: boolean;
  acceptedAt: string;
}

export default function ConsentGate({ roomId, onContinue, doctorName }: ConsentGateProps) {
  const [ready, setReady] = useState(false);
  const [transcript, setTranscript] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If the user already consented for this room, skip the gate.
    try {
      const raw = localStorage.getItem(STORAGE_KEY(roomId));
      if (raw) {
        const parsed = JSON.parse(raw) as StoredConsent;
        onContinue({ transcript: !!parsed.transcript });
        return;
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [roomId, onContinue]);

  const handleContinue = () => {
    try {
      const stored: StoredConsent = {
        transcript,
        acceptedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY(roomId), JSON.stringify(stored));
    } catch {
      /* ignore */
    }
    onContinue({ transcript });
  };

  if (loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
          Before you join your consultation with {doctorName}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Please review and accept the following to continue.
        </p>

        <div className="mt-5 space-y-4">
          <label className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-slate-800 p-3 hover:bg-gray-50 dark:hover:bg-slate-800">
            <input
              type="checkbox"
              checked={ready}
              onChange={(e) => setReady(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-slate-700 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-800 dark:text-slate-200">
              <span className="font-semibold">I&apos;m ready to join the consultation.</span>{" "}
              I understand OduDoc is a telemedicine service and that in an
              emergency I should call local emergency services instead.
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-slate-800 p-3 hover:bg-gray-50 dark:hover:bg-slate-800">
            <input
              type="checkbox"
              checked={transcript}
              onChange={(e) => setTranscript(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-slate-700 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-800 dark:text-slate-200">
              <span className="font-semibold">Enable live transcript (optional).</span>{" "}
              I consent to my side of the conversation being transcribed on
              this device and shared with the doctor for clinical notes.
              Transcripts stay with the consultation record and can be turned
              off anytime during the call.
            </span>
          </label>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-gray-400 dark:text-slate-500">
            You can leave the call at any time.
          </p>
          <button
            onClick={handleContinue}
            disabled={!ready}
            className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
