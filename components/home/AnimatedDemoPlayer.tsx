"use client";

// Self-playing animated demo of the AI EMR — used as a stopgap until
// you record a real screencast. Cycles through the 5 chapters from
// docs/marketing-video-scripts.md in 60 seconds, then loops.
//
// Each phase renders an inline mock of the actual UI state — patient
// summary card, consent modal, recording HUD, SOAP fields filling in,
// ICD-10 picker. A faux cursor animates between elements so the
// section reads like a real screencast, not a slideshow.
//
// To replace with a real recording: drop the MP4 at
// /public/demo/odudoc-ai-emr-demo.mp4 OR set NEXT_PUBLIC_DEMO_VIDEO_URL.
// DemoVideoSection prefers the real video over this animated mock.

import { useEffect, useMemo, useRef, useState } from "react";

const PHASES = [
  { id: "summary",    duration: 12000, startSec: 0  },
  { id: "consent",    duration: 12000, startSec: 12 },
  { id: "recording",  duration: 18000, startSec: 24 },
  { id: "soap",       duration: 8000,  startSec: 42 },
  { id: "code-save",  duration: 10000, startSec: 50 },
] as const;

const TOTAL_MS = PHASES.reduce((s, p) => s + p.duration, 0);

type PhaseId = (typeof PHASES)[number]["id"];

/** Simulated mouse cursor that animates between elements. */
function Cursor({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="pointer-events-none absolute z-30 transition-all duration-700 ease-out"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <svg className="h-5 w-5 drop-shadow-lg" viewBox="0 0 24 24" fill="white" stroke="black" strokeWidth={1}>
        <path d="M3 2 L3 18 L7.5 14 L10 20 L12.5 19 L10 13 L16 13 Z" />
      </svg>
    </div>
  );
}

interface Props {
  /** When false the component renders idle (poster) — used by the
   *  parent player to show a Play button overlay. Once the user
   *  clicks, parent flips to true. */
  playing: boolean;
  /** Seek the animation to this millisecond offset. Bumping this
   *  prop (e.g. via a counter incremented by the parent on chapter-
   *  marker click) triggers a re-anchor of the start timestamp so
   *  the loop continues from the new offset. */
  seekToMs?: number;
  /** Generation counter — change it to force a seek even when
   *  seekToMs equals the previously-applied value (e.g. clicking
   *  the same chapter twice). */
  seekToken?: number;
}

export default function AnimatedDemoPlayer({ playing, seekToMs, seekToken }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Restart the RAF loop when `playing` flips OR when seekToken
  // changes (chapter-marker click).
  useEffect(() => {
    if (!playing) {
      startedAt.current = null;
      setElapsed(0);
      return;
    }
    const offset = Math.max(0, Math.min(TOTAL_MS - 1, seekToMs || 0));
    // Anchor start so that performance.now() - start === offset
    // immediately, then RAF advances from there.
    startedAt.current = performance.now() - offset;
    setElapsed(offset);
    const tick = (t: number) => {
      const start = startedAt.current ?? t;
      const e = (t - start) % TOTAL_MS;
      setElapsed(e);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, seekToken]);

  // Resolve the current phase from elapsed time.
  const { phase, phaseElapsed } = useMemo(() => {
    let acc = 0;
    for (const p of PHASES) {
      if (elapsed < acc + p.duration) {
        return { phase: p.id as PhaseId, phaseElapsed: elapsed - acc };
      }
      acc += p.duration;
    }
    const last = PHASES[PHASES.length - 1];
    return { phase: last.id as PhaseId, phaseElapsed: last.duration };
  }, [elapsed]);

  // Cursor target per phase — coordinates are % of the player viewport.
  const cursor = useMemo(() => {
    switch (phase) {
      case "summary":    return { x: 22, y: 25 };
      case "consent":    return { x: 60, y: 78 };
      case "recording":  return { x: 60, y: 25 };
      case "soap":       return { x: 50, y: 60 };
      case "code-save":  return { x: 70, y: 80 };
    }
  }, [phase]);

  const totalSec = Math.floor(TOTAL_MS / 1000);
  const elapsedSec = Math.floor(elapsed / 1000);
  const progress = Math.min(100, (elapsed / TOTAL_MS) * 100);

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950">
      {/* Faux browser chrome */}
      <div className="flex items-center gap-2 border-b border-white/10 bg-slate-900/80 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        <div className="ml-3 flex-1 truncate rounded-md bg-white/5 px-3 py-1 font-mono text-[10px] text-white/60">
          odudoc.com/dashboard/doctor/emr/patients/p-238
        </div>
      </div>

      {/* Stage */}
      <div className="relative h-[calc(100%-32px)] w-full p-4 md:p-6">
        <PatientChartStage phase={phase} phaseElapsed={phaseElapsed} />
        <Cursor x={cursor.x} y={cursor.y} />
      </div>

      {/* Faux video controls */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-4 py-2 text-xs text-white">
        <span className="font-mono">
          {String(Math.floor(elapsedSec / 60))}:{String(elapsedSec % 60).padStart(2, "0")}
        </span>
        <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full bg-gradient-to-r from-violet-400 to-cyan-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="font-mono">
          {String(Math.floor(totalSec / 60))}:{String(totalSec % 60).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

/* ============================================================ */
/*  Stage — renders the right mock for the current phase         */
/* ============================================================ */

function PatientChartStage({ phase, phaseElapsed }: { phase: PhaseId; phaseElapsed: number }) {
  return (
    <div className="relative h-full w-full">
      {/* Always-visible patient header */}
      <div className="rounded-2xl bg-white/95 p-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-sm font-bold text-white">
            RP
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Rajesh Patel</p>
            <p className="text-[11px] text-slate-500">52 yrs · Male · +91 98xxxxxxx0</p>
          </div>
          <div className="ml-auto flex gap-1">
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">B+</span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">⚠ Penicillin</span>
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">HTN, T2DM</span>
          </div>
        </div>
      </div>

      {/* Phase-specific overlays */}
      <div className="mt-3">
        {phase === "summary" && <SummaryCard elapsed={phaseElapsed} />}
        {(phase === "consent" || phase === "recording") && <SummaryCard elapsed={12000} />}
        {phase === "soap" && <SoapForm fillRatio={Math.min(1, phaseElapsed / 6000)} />}
        {phase === "code-save" && <SoapForm fillRatio={1} showIcd={phaseElapsed > 1500} showSaving={phaseElapsed > 6000} />}
      </div>

      {/* Floating modal on consent / recording phases */}
      {phase === "consent" && <ConsentModal />}
      {phase === "recording" && (
        <RecordingHud seconds={Math.floor(phaseElapsed / 1000)} />
      )}
    </div>
  );
}

/* ---------- Summary card ---------- */

function SummaryCard({ elapsed }: { elapsed: number }) {
  const lines = [
    { delay: 0,    text: "Diabetic hypertensive male, 52, on metformin + amlodipine for 3 years.", source: "Mar 12" },
    { delay: 1500, text: "Last HbA1c 7.8 (Mar 12) — uptrending from 7.1 in Dec.", source: "Mar 12" },
    { delay: 2800, text: "Reports new-onset peripheral tingling at last 2 visits.", source: "Apr 5" },
    { delay: 3800, text: "Penicillin allergy noted on demographics — anaphylaxis history.", source: "Chart header" },
  ];
  const focus = "Address neuropathy work-up; recheck HbA1c; consider statin given ASCVD risk.";
  const focusVisible = elapsed > 5000;

  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-4 shadow-md">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17 9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z" />
          </svg>
        </div>
        <p className="text-xs font-bold text-slate-800">AI chart summary</p>
      </div>
      <p className="mb-3 text-xs font-semibold text-slate-900">
        Long-standing T2DM + HTN with rising HbA1c and emerging peripheral neuropathy symptoms.
      </p>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-700">Key points</p>
      <ul className="space-y-1">
        {lines.map((l, i) => (
          <li
            key={i}
            className="flex gap-2 text-[11px] text-slate-700 transition-opacity duration-500"
            style={{ opacity: elapsed > l.delay ? 1 : 0 }}
          >
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-500" />
            <span className="flex-1">
              {l.text}
              <span className="ml-1 inline-block rounded bg-violet-100 px-1 py-0.5 text-[9px] font-semibold text-violet-700">
                {l.source}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {focusVisible && (
        <p className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2 py-1.5 text-[11px] text-indigo-900">
          <span className="font-bold uppercase tracking-wider text-[9px] text-indigo-700">Today&rsquo;s focus</span>{" "}
          {focus}
        </p>
      )}
    </div>
  );
}

/* ---------- Consent modal ---------- */

function ConsentModal() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <h3 className="text-base font-bold text-slate-900">Patient consent required</h3>
        <p className="mt-1.5 text-xs text-slate-600">
          The ambient scribe will record audio of this consultation and transcribe it into a SOAP note.
        </p>
        <ul className="mt-2 space-y-0.5 text-[11px] text-slate-700">
          <li>✓ Tell the patient the visit is being recorded</li>
          <li>✓ Confirm verbally that they consent</li>
          <li>✓ Stop the recording before discussing anything off-topic</li>
        </ul>
        <div className="mt-4 flex gap-2">
          <button className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">
            Cancel
          </button>
          <button className="flex-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md">
            I have consent — start
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Recording HUD ---------- */

function RecordingHud({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  // Animated speech-like waveform bars.
  const bars = Array.from({ length: 16 }).map((_, i) => {
    const h = 6 + ((Math.sin(seconds * 4 + i * 0.7) + 1) * 8);
    return Math.max(4, Math.min(20, h));
  });

  return (
    <div className="absolute inset-x-4 top-3 z-20 flex items-center justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50/95 px-3 py-2 shadow-lg backdrop-blur md:inset-x-6">
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-600" />
        </span>
        <span className="text-xs font-bold text-rose-800">
          Recording · {m}:{String(s).padStart(2, "0")}
        </span>
      </div>
      <div className="flex h-5 items-end gap-0.5">
        {bars.map((h, i) => (
          <div
            key={i}
            className="w-0.5 rounded-full bg-rose-500 transition-all duration-150"
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
      <span className="hidden text-[10px] text-rose-700 sm:inline">Auto-transcribing in 12 Indian languages</span>
    </div>
  );
}

/* ---------- SOAP form (fills progressively) ---------- */

function SoapForm({ fillRatio, showIcd, showSaving }: {
  fillRatio: number;
  showIcd?: boolean;
  showSaving?: boolean;
}) {
  const fields = [
    { label: "Chief complaint", text: "Tingling in both feet for 3 weeks, worse at night.", at: 0.0 },
    { label: "Subjective (S)", text: "52M, T2DM × 5y, HTN × 7y. Numbness + pins-and-needles bilateral feet, ascending. Denies weakness, bowel/bladder change.", at: 0.2 },
    { label: "Objective (O)", text: "BP 138/86. HR 78. BMI 28.4. Monofilament reduced bilaterally below ankles. Reflexes 1+ achilles. Skin intact.", at: 0.45 },
    { label: "Assessment (A)", text: "Likely diabetic peripheral neuropathy, length-dependent. R/O B12 deficiency.", at: 0.7 },
    { label: "Plan (P)", text: "HbA1c, B12, TSH today. Start gabapentin 100mg HS, titrate. Foot-care education. Recheck 4 weeks.", at: 0.85 },
  ];

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold text-slate-700">New visit · auto-filled from audio</p>
        {showSaving ? (
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">Saving…</span>
        ) : (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">✓ Draft ready</span>
        )}
      </div>
      <div className="space-y-2">
        {fields.map((f, i) => {
          const visible = fillRatio >= f.at;
          return (
            <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/60 p-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{f.label}</p>
              <p className="mt-0.5 min-h-[14px] text-[11px] text-slate-800 transition-opacity duration-700"
                 style={{ opacity: visible ? 1 : 0.15 }}
              >
                {visible ? f.text : "▌"}
              </p>
            </div>
          );
        })}
      </div>

      {showIcd && (
        <div className="mt-3 space-y-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 p-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-700">AI ICD-10 suggestions</p>
          <div className="flex items-center justify-between rounded-md bg-white px-2 py-1">
            <span className="font-mono text-[10px] font-bold text-indigo-700">E11.40</span>
            <span className="flex-1 truncate px-2 text-[10px] text-slate-700">T2DM with diabetic neuropathy, unspecified</span>
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">94%</span>
          </div>
          <div className="flex items-center justify-between rounded-md bg-white px-2 py-1">
            <span className="font-mono text-[10px] font-bold text-indigo-700">G62.9</span>
            <span className="flex-1 truncate px-2 text-[10px] text-slate-700">Polyneuropathy, unspecified</span>
            <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-800">61%</span>
          </div>
        </div>
      )}
    </div>
  );
}
