"use client";

// Patient-facing post-consultation chat. Lives on the patient's
// /dashboard/consultations/[id] page after the doctor has issued a
// prescription. Lets the patient ask follow-up questions ("can I take
// this with food?", "what was the dose again?") and gets context-aware
// answers grounded in the consultation record.
//
// Hard guarantees baked in by the API + system prompt:
//   - Never diagnoses new conditions
//   - Never changes doses
//   - Surfaces an emergency banner if the question contains red-flag
//     phrases ("chest pain", "can't breathe", etc.)
//   - Otherwise refers tricky questions back to the doctor

import { useRef, useState } from "react";

interface Turn {
  role: "user" | "assistant" | "system";
  text: string;
  emergency?: boolean;
  escalate?: boolean;
  escalationReason?: string;
}

interface Props {
  consultationId: string;
  className?: string;
}

const SUGGESTED: string[] = [
  "Can I take my medicine with food?",
  "What was the dose again?",
  "What if I miss a dose?",
  "Are there common side effects to watch for?",
];

export default function PostVisitChat({ consultationId, className = "" }: Props) {
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: "system",
      text: "Ask follow-up questions about your prescription or treatment plan. For new symptoms, please book a fresh consultation — I won't diagnose.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 30);
  }

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setDraft("");
    setTurns((prev) => [...prev, { role: "user", text: q }]);
    scrollToBottom();
    setBusy(true);
    try {
      const res = await fetch("/api/ai/postvisit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId, question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const r = data.result;
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          text: r.answer,
          emergency: r.emergency,
          escalate: r.escalate,
          escalationReason: r.escalationReason,
        },
      ]);
    } catch (e) {
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Couldn't answer: ${(e as Error).message}. Please contact your doctor or clinic directly.`,
        },
      ]);
    } finally {
      setBusy(false);
      scrollToBottom();
    }
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm ${className}`}>
      <div className="flex items-center gap-3 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Ask a follow-up</h3>
          <p className="text-[11px] text-slate-500">
            AI assistant grounded in your consultation. Not a substitute for medical advice.
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="max-h-96 overflow-y-auto bg-violet-50/30 p-4">
        <div className="space-y-3">
          {turns.map((t, i) => {
            if (t.role === "system") {
              return (
                <p key={i} className="rounded-lg border border-violet-100 bg-white px-3 py-2 text-xs text-slate-500">
                  {t.text}
                </p>
              );
            }
            const isUser = t.role === "user";
            return (
              <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                    isUser
                      ? "bg-violet-600 text-white"
                      : "bg-white text-slate-800 border border-slate-100"
                  }`}
                >
                  {t.emergency && !isUser && (
                    <p className="mb-1 rounded-md bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-800">
                      ⛔ Emergency — call your local emergency number now
                    </p>
                  )}
                  {t.escalate && !isUser && !t.emergency && (
                    <p className="mb-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                      Escalate to your doctor: {t.escalationReason || "needs clinician"}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{t.text}</p>
                </div>
              </div>
            );
          })}
          {busy && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl border border-slate-100 bg-white px-3.5 py-2.5 text-sm text-slate-400 shadow-sm">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400 [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400 [animation-delay:240ms]" />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {turns.length <= 1 && (
        <div className="flex flex-wrap gap-2 border-t border-violet-100 bg-white px-4 py-3">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={busy}
              className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs text-violet-700 hover:bg-violet-100 disabled:opacity-60"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex items-center gap-2 border-t border-violet-100 bg-white px-3 py-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type your follow-up question…"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
