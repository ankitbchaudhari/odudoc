"use client";

// Homepage symptom checker. 3-step wizard:
//   1) Pick a body region (8 buttons with emoji)
//   2) Pick a specific complaint (subset of that region)
//   3) Duration + severity (two radio rows)
// → Recommendation card with specialty + urgency + two CTAs.
//
// Pre-signup — drives Google traffic ("headache doctor", etc.)
// straight into the booking funnel without forcing an account.

import { useEffect, useState } from "react";
import Link from "next/link";
import { REGIONS, recommend, type Duration, type Severity, type Recommendation, type SymptomOption } from "@/lib/symptom-router";

type Step = 1 | 2 | 3 | 4;

export default function SymptomChecker() {
  const [step, setStep] = useState<Step>(1);
  const [region, setRegion] = useState<SymptomOption | null>(null);
  const [complaintId, setComplaintId] = useState<string | null>(null);
  const [duration, setDuration] = useState<Duration | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);

  const reset = () => {
    setStep(1);
    setRegion(null);
    setComplaintId(null);
    setDuration(null);
    setSeverity(null);
  };

  const result: Recommendation | null =
    region && complaintId && duration && severity
      ? recommend(region, complaintId, duration, severity)
      : null;

  return (
    <section className="relative mx-auto mt-12 max-w-3xl px-4">
      <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl shadow-indigo-500/10">
        <header className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-5 text-white">
          <div className="relative flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Not sure who to see?</p>
              <h2 className="mt-1 text-xl font-bold sm:text-2xl">Find the right doctor in 3 taps</h2>
              <p className="mt-1 text-xs text-white/75 sm:text-sm">
                Answer a few questions about your symptoms. We&apos;ll route you to the specialist who can help.
              </p>
            </div>
            <Stepper step={step} />
          </div>
          <div className="pointer-events-none absolute -right-12 -bottom-12 h-32 w-32 rounded-full border-2 border-white/10" />
        </header>

        <div className="px-6 py-6">
          {step === 1 && (
            <Step1
              onPick={(r) => { setRegion(r); setComplaintId(null); setStep(2); }}
            />
          )}
          {step === 2 && region && (
            <Step2
              region={region}
              onBack={() => setStep(1)}
              onPick={(cId) => { setComplaintId(cId); setStep(3); }}
            />
          )}
          {step === 3 && region && complaintId && (
            <Step3
              duration={duration}
              severity={severity}
              setDuration={setDuration}
              setSeverity={setSeverity}
              onBack={() => setStep(2)}
              onContinue={() => setStep(4)}
              canContinue={!!duration && !!severity}
            />
          )}
          {step === 4 && result && (
            <Step4 recommendation={result} onReset={reset} />
          )}
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-gray-500 dark:text-slate-400">
        ⚕️ This is triage guidance, not a diagnosis. If you have a life-threatening emergency, call 911 or go to the nearest ER.
      </p>
    </section>
  );
}

function Stepper({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className={`flex h-7 w-7 items-center justify-center rounded-full ring-1 ${
            n === step ? "bg-white text-indigo-700 ring-white" :
            n < step ? "bg-white/30 text-white ring-white/40" :
            "bg-white/10 text-white/60 ring-white/20"
          }`}
        >
          {n < step ? "✓" : n}
        </div>
      ))}
    </div>
  );
}

// Pull whatever fields we can from a partial / in-flight Gemini JSON
// string. Gemini emits keys roughly in schema order, so once
// "specialty" has its closing quote we know it for sure; same for
// urgency / specialtyLabel / reasoning. Arrays are read partially —
// every completed string element is included.
//
// Hand-rolled regex extractor instead of pulling a partial-JSON
// library, because the schema is fixed and the surface this needs to
// cover is tiny. Returns null when nothing has landed yet.
function parsePartialTriage(text: string): Partial<{
  specialty: string;
  specialtyLabel: string;
  urgency: "routine" | "soon" | "urgent" | "emergency";
  reasoning: string;
  redFlags: string[];
  possibleConditions: string[];
}> | null {
  if (!text) return null;
  const out: Record<string, unknown> = {};
  const m = (re: RegExp) => text.match(re)?.[1];
  const sp = m(/"specialty"\s*:\s*"([^"]+)"/);
  if (sp) out.specialty = sp;
  const lab = m(/"specialtyLabel"\s*:\s*"([^"]+)"/);
  if (lab) out.specialtyLabel = lab;
  const urg = m(/"urgency"\s*:\s*"([^"]+)"/);
  if (urg) out.urgency = urg;
  // Reasoning may contain escaped quotes — grab text up to an
  // unescaped closing quote.
  const rs = text.match(/"reasoning"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (rs) out.reasoning = rs[1].replace(/\\"/g, '"').replace(/\\n/g, "\n");
  // Pull completed string entries out of in-progress arrays.
  const pullArray = (key: string): string[] | undefined => {
    const start = text.indexOf(`"${key}"`);
    if (start < 0) return undefined;
    const arrStart = text.indexOf("[", start);
    if (arrStart < 0) return undefined;
    const slice = text.slice(arrStart);
    const re = /"((?:[^"\\]|\\.)*)"/g;
    const items: string[] = [];
    let mm: RegExpExecArray | null;
    while ((mm = re.exec(slice))) items.push(mm[1]);
    return items;
  };
  const rf = pullArray("redFlags");
  if (rf) out.redFlags = rf;
  const pc = pullArray("possibleConditions");
  if (pc) out.possibleConditions = pc;
  return Object.keys(out).length === 0 ? null : (out as Partial<{
    specialty: string;
    specialtyLabel: string;
    urgency: "routine" | "soon" | "urgent" | "emergency";
    reasoning: string;
    redFlags: string[];
    possibleConditions: string[];
  }>);
}

// Rotating status messages shown while the AI call is in flight.
// A silent multi-second wait feels twice as long as one with motion —
// these change every ~900ms so the user always sees something
// progressing. Keep them generic so even a slow call doesn't look
// like the UI lied.
const AI_PROGRESS_STAGES = [
  "Reading your description…",
  "Identifying symptoms…",
  "Checking for red flags…",
  "Routing to the right specialist…",
];

function Step1({ onPick }: { onPick: (r: SymptomOption) => void }) {
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiStage, setAiStage] = useState(0);
  const [aiResult, setAiResult] = useState<AiTriage | null>(null);
  const [aiErr, setAiErr] = useState<string | null>(null);

  // Cycle progress messages while busy. Stops at the last stage so
  // we don't loop forever if the API genuinely hangs.
  useEffect(() => {
    if (!aiBusy) return;
    setAiStage(0);
    const id = setInterval(() => {
      setAiStage((s) => Math.min(s + 1, AI_PROGRESS_STAGES.length - 1));
    }, 900);
    return () => clearInterval(id);
  }, [aiBusy]);

  const runAi = async () => {
    if (aiText.trim().length < 8) {
      setAiErr("Please describe your symptoms in at least a sentence.");
      return;
    }
    setAiErr(null);
    setAiBusy(true);
    setAiResult(null);
    try {
      const r = await fetch("/api/ai/symptom-triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText.trim() }),
      });
      if (!r.ok || !r.body) {
        // Non-stream error path — server may have returned a JSON
        // error body before the stream started.
        const d = await r.json().catch(() => ({}));
        setAiErr(d.message || d.error || "AI triage failed.");
        return;
      }

      // Read the SSE stream from the server. Each `event: chunk` carries
      // the cumulative JSON-in-progress; we feed it through a tolerant
      // partial-JSON parser and patch fields onto state the moment they
      // land. By the time Gemini finishes, the user usually already
      // sees the specialty + urgency badge.
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: AiTriage | null = null;
      let sawError = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep;
        while ((sep = buffer.indexOf("\n\n")) >= 0) {
          const block = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          // Pull `event:` and `data:` out of the SSE block.
          let event = "message";
          let dataLine = "";
          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
          }
          if (!dataLine) continue;
          try {
            const payload = JSON.parse(dataLine) as Record<string, unknown>;
            if (event === "chunk" && typeof payload.text === "string") {
              const partial = parsePartialTriage(payload.text);
              if (partial) setAiResult((prev) => ({ ...prev, ...partial } as AiTriage));
            } else if (event === "result") {
              finalResult = payload as unknown as AiTriage;
              setAiResult(finalResult);
            } else if (event === "error") {
              sawError = true;
              setAiErr(
                (payload.message as string) || "AI triage failed.",
              );
            }
          } catch {
            // Ignore malformed SSE — next event usually parses.
          }
        }
      }
      if (!finalResult && !sawError) {
        setAiErr("Stream ended without a final result. Try again.");
      }
    } catch {
      setAiErr("Network error. Try the visual checker below.");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Free-text AI triage — leads the wizard because it covers
          symptoms the 8-region grid can't (e.g. "I feel anxious AND
          my hands tingle"). Falls back to the visual checker
          gracefully when AI is unconfigured or rate-limited. */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
          ✨ Describe what you&apos;re feeling
        </p>
        <div className="rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/60 via-violet-50/60 to-fuchsia-50/60 dark:from-indigo-950/30 dark:via-violet-950/30 dark:to-fuchsia-950/30 p-3">
          <textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            rows={3}
            placeholder="e.g. I&apos;ve had a throbbing headache on the right side for 3 days, with some nausea when I move."
            className="w-full resize-none rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[11px] text-gray-500 dark:text-slate-400">
              AI reads your description and routes you to the right specialist.
            </p>
            <button
              onClick={runAi}
              disabled={aiBusy}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {aiBusy && (
                <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {aiBusy ? AI_PROGRESS_STAGES[aiStage] : "Analyze with AI →"}
            </button>
          </div>
          {/* Inline progress row under the textarea — gives the user
              something to look at during the multi-second Gemini call.
              Hidden when not busy so the layout doesn't shift. */}
          {aiBusy && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 px-3 py-2 text-[11px] text-indigo-700 dark:text-indigo-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
              </span>
              <span>{AI_PROGRESS_STAGES[aiStage]}</span>
              <span className="ml-auto text-[10px] opacity-70">
                usually 3-5s
              </span>
            </div>
          )}
          {aiErr && (
            <p className="mt-2 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
              {aiErr}
            </p>
          )}
          {aiResult && <AiResultCard r={aiResult} streaming={aiBusy} />}
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-y-1/2 inset-x-0 h-px bg-gray-200 dark:bg-slate-800" />
        <p className="relative mx-auto w-fit bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
          Or pick visually
        </p>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
          Step 1 · Where is it?
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {REGIONS.map((r) => (
            <button
              key={r.id}
              onClick={() => onPick(r)}
              className="group flex flex-col items-center gap-1.5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 transition hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 hover:shadow-md"
            >
              <span className="text-3xl transition group-hover:scale-110">{r.emoji}</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">{r.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Looser shape than the server contract — every field is optional so
// the card renders progressively as Gemini streams values in. The
// final committed shape is identical to the server's TriageResult.
interface AiTriage {
  specialty?: string;
  specialtyLabel?: string;
  urgency?: "routine" | "soon" | "urgent" | "emergency";
  reasoning?: string;
  redFlags?: string[];
  possibleConditions?: string[];
}

function AiResultCard({ r, streaming }: { r: AiTriage; streaming?: boolean }) {
  const URGENCY_TONE = {
    routine:   "from-emerald-500 to-teal-500",
    soon:      "from-amber-500 to-orange-500",
    urgent:    "from-rose-500 to-red-500",
    emergency: "from-red-600 to-rose-700",
  } as const;
  const URGENCY_LABEL = {
    routine: "Routine — book within the week",
    soon: "Soon — book today or tomorrow",
    urgent: "Urgent — try Consult Now",
    emergency: "Emergency — go to the ER or call 911",
  } as const;
  // Default tone while urgency is in-flight — keeps the card calm
  // until Gemini commits a level.
  const tone = r.urgency ? URGENCY_TONE[r.urgency] : "from-indigo-500 to-violet-500";
  const urgencyLabel = r.urgency ? URGENCY_LABEL[r.urgency] : "Analysing…";
  const redFlags = r.redFlags || [];
  return (
    <div className="mt-3 space-y-2">
      <div className={`rounded-2xl bg-gradient-to-br ${tone} px-4 py-3 text-white shadow-md`}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">{urgencyLabel}</p>
        <p className="mt-0.5 text-xl font-bold">
          {r.specialtyLabel || (streaming ? "Routing…" : "")}
          {streaming && !r.specialtyLabel && (
            <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-white/60 align-middle" />
          )}
        </p>
        <p className="mt-1 text-xs text-white/90">
          {r.reasoning || (streaming ? "Generating reasoning…" : "")}
          {streaming && r.reasoning && (
            <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-white/60 align-middle" />
          )}
        </p>
      </div>
      {redFlags.length > 0 && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">⚠️ Red flags spotted</p>
          <ul className="mt-1 ml-4 list-disc text-xs text-rose-700 dark:text-rose-300">
            {redFlags.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}
      {(r.possibleConditions || []).length > 0 && (
        <p className="text-[11px] text-gray-500 dark:text-slate-400">
          <span className="font-semibold">Possibilities (not a diagnosis):</span>{" "}
          {(r.possibleConditions || []).join(", ")}
        </p>
      )}
      {/* CTAs only render once the specialty has landed — partial
          streaming state would otherwise route to /specialty/undefined. */}
      {r.specialty && !streaming &&
        (r.urgency === "emergency" ? (
          <div className="flex flex-wrap gap-2">
            <a href="tel:911" className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow">📞 911</a>
            <a href="tel:+13028992625" className="rounded-xl border-2 border-red-300 dark:border-red-900/60 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-red-700 dark:text-red-300">OduDoc helpline</a>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <Link href={`/consult-now?specialty=${encodeURIComponent(r.specialty)}`} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-center text-sm font-bold text-white shadow-md shadow-emerald-500/30">
              ⚡ Consult now (live)
            </Link>
            <Link href={`/specialty/${r.specialty}`} className="rounded-xl border-2 border-indigo-500 bg-white dark:bg-slate-950 px-4 py-2 text-center text-sm font-bold text-indigo-700 dark:text-indigo-300">
              Browse {r.specialtyLabel}s
            </Link>
          </div>
        ))}
    </div>
  );
}

function Step2({
  region, onBack, onPick,
}: {
  region: SymptomOption;
  onBack: () => void;
  onPick: (id: string) => void;
}) {
  return (
    <div>
      <button onClick={onBack} className="mb-3 text-xs text-gray-500 dark:text-slate-400 hover:text-indigo-600">
        ← Back
      </button>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
        Step 2 · {region.emoji} {region.label} — what specifically?
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {region.complaints.map((c) => (
          <button
            key={c.id}
            onClick={() => onPick(c.id)}
            className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-slate-300 transition hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30"
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Step3({
  duration, severity, setDuration, setSeverity, onBack, onContinue, canContinue,
}: {
  duration: Duration | null;
  severity: Severity | null;
  setDuration: (d: Duration) => void;
  setSeverity: (s: Severity) => void;
  onBack: () => void;
  onContinue: () => void;
  canContinue: boolean;
}) {
  const durations: Array<{ id: Duration; label: string; emoji: string }> = [
    { id: "today",     label: "Today",       emoji: "🆕" },
    { id: "few_days",  label: "Few days",    emoji: "📆" },
    { id: "weeks",     label: "Weeks",       emoji: "🗓️" },
    { id: "months",    label: "Months",      emoji: "📅" },
  ];
  const severities: Array<{ id: Severity; label: string; tone: string }> = [
    { id: "mild",     label: "🟢 Mild",     tone: "from-emerald-500 to-teal-500" },
    { id: "moderate", label: "🟡 Moderate", tone: "from-amber-500 to-orange-500" },
    { id: "severe",   label: "🔴 Severe",   tone: "from-rose-500 to-red-500" },
  ];
  return (
    <div>
      <button onClick={onBack} className="mb-3 text-xs text-gray-500 dark:text-slate-400 hover:text-indigo-600">
        ← Back
      </button>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
        Step 3 · How long? How bad?
      </p>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium text-gray-600 dark:text-slate-400">How long have you had it?</p>
          <div className="grid grid-cols-4 gap-2">
            {durations.map((d) => (
              <button
                key={d.id}
                onClick={() => setDuration(d.id)}
                className={
                  duration === d.id
                    ? "rounded-xl border-2 border-indigo-500 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/20 dark:to-violet-500/20 px-2 py-3 text-xs font-semibold text-indigo-700 dark:text-indigo-300"
                    : "rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-3 text-xs font-medium text-gray-700 dark:text-slate-300 hover:border-indigo-300"
                }
              >
                <span className="block text-lg">{d.emoji}</span>
                <span>{d.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-gray-600 dark:text-slate-400">How severe is it?</p>
          <div className="grid grid-cols-3 gap-2">
            {severities.map((s) => {
              const selected = severity === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSeverity(s.id)}
                  className={
                    selected
                      ? `rounded-xl bg-gradient-to-r ${s.tone} px-3 py-3 text-xs font-bold text-white shadow-md`
                      : "rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-xs font-medium text-gray-700 dark:text-slate-300 hover:border-indigo-300"
                  }
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <button
        disabled={!canContinue}
        onClick={onContinue}
        className="mt-5 w-full rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        See recommendation →
      </button>
    </div>
  );
}

function Step4({ recommendation, onReset }: { recommendation: Recommendation; onReset: () => void }) {
  const URGENCY_TONE = {
    routine:   "from-emerald-500 to-teal-500",
    soon:      "from-amber-500 to-orange-500",
    urgent:    "from-rose-500 to-red-500",
    emergency: "from-red-600 to-rose-700",
  } as const;
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
        Your recommendation
      </p>
      <div className={`rounded-2xl bg-gradient-to-br ${URGENCY_TONE[recommendation.urgency]} px-5 py-4 text-white shadow-lg`}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">{recommendation.urgencyLabel}</p>
        <p className="mt-1 text-2xl font-bold">{recommendation.specialtyLabel}</p>
        <p className="mt-1 text-sm text-white/90">{recommendation.reason}</p>
      </div>

      {recommendation.urgency === "emergency" ? (
        <div className="mt-4 rounded-2xl border-2 border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4">
          <p className="text-sm font-bold text-red-900 dark:text-red-200">🚨 This may be a medical emergency</p>
          <p className="mt-1 text-xs text-red-800 dark:text-red-300">
            Please go to the nearest emergency room immediately or call:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="tel:911" className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow">📞 911</a>
            <a href="tel:+13028992625" className="rounded-xl bg-white dark:bg-slate-900 border border-red-300 dark:border-red-900/60 px-4 py-2 text-sm font-bold text-red-700 dark:text-red-300 shadow">OduDoc 24/7 helpline</a>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link
            href={`/consult-now?specialty=${encodeURIComponent(recommendation.specialty)}`}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-center text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:shadow-xl"
          >
            <span className="relative z-10">⚡ Consult now (live)</span>
          </Link>
          <Link
            href={`/specialty/${recommendation.specialty}`}
            className="rounded-2xl border-2 border-indigo-500 bg-white dark:bg-slate-950 px-5 py-3 text-center text-sm font-bold text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30"
          >
            Browse {recommendation.specialtyLabel}s
          </Link>
        </div>
      )}

      <button onClick={onReset} className="mt-4 w-full text-center text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-indigo-600">
        ← Start over
      </button>
    </div>
  );
}
