"use client";

// V17 — public OPD display board. Optimised for the lobby TV / kiosk.
// Polls every 5 seconds. Shows: current token, next 5, doctor name.

import { useCallback, useEffect, useState } from "react";

interface OpdToken {
  id: string; displayNumber: string; patientName: string;
  doctorName: string; status: "waiting" | "called" | "in_consult" | "completed" | "no_show" | "cancelled";
  arrivedAt: string;
}

export default function OpdBoardPage() {
  const [tokens, setTokens] = useState<OpdToken[]>([]);

  const load = useCallback(async () => {
    const r = await fetch("/api/opd/queue?liveOnly=1", { cache: "no-store" });
    if (r.ok) setTokens((await r.json()).tokens || []);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  // Group by doctor for the lobby layout.
  const byDoctor = new Map<string, { doctorName: string; tokens: OpdToken[] }>();
  for (const t of tokens) {
    const k = t.doctorName;
    if (!byDoctor.has(k)) byDoctor.set(k, { doctorName: t.doctorName, tokens: [] });
    byDoctor.get(k)!.tokens.push(t);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#042C53] via-[#0A5942] to-[#0F6E56] p-8 text-white">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-2xl">
            <span className="absolute h-[60%] w-[22%] rounded bg-[#0F6E56]" />
            <span className="absolute h-[22%] w-[60%] rounded bg-[#0F6E56]" />
          </span>
          <div>
            <p className="text-sm text-white/70">OduDoc · OPD Board</p>
            <p className="text-2xl font-extrabold">Now serving</p>
          </div>
        </div>
        <p className="font-mono text-3xl font-bold tabular-nums">{new Date().toLocaleTimeString()}</p>
      </header>

      {byDoctor.size === 0 ? (
        <div className="flex h-[60vh] items-center justify-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <p className="text-2xl font-semibold text-white/60">Queue is empty.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {[...byDoctor.values()].map((group) => {
            const current = group.tokens.find((t) => t.status === "in_consult" || t.status === "called");
            const waiting = group.tokens.filter((t) => t.status === "waiting").slice(0, 5);
            return (
              <div key={group.doctorName} className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl shadow-2xl">
                <p className="text-xs font-bold uppercase tracking-widest text-white/60">{group.doctorName}</p>
                {current ? (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">{current.status === "in_consult" ? "In consult" : "Now calling"}</p>
                    <p className="mt-1 font-mono text-7xl font-extrabold tabular-nums text-emerald-200">{current.displayNumber}</p>
                    <p className="mt-1 text-xl text-white/85">{current.patientName}</p>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Waiting for next</p>
                    <p className="mt-1 font-mono text-6xl font-extrabold tabular-nums text-white/30">—</p>
                  </div>
                )}
                {waiting.length > 0 && (
                  <div className="mt-6 border-t border-white/10 pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Next up</p>
                    <ul className="mt-2 space-y-1">
                      {waiting.map((t, i) => (
                        <li key={t.id} className="flex items-baseline justify-between font-mono text-lg">
                          <span className="text-white/30">{i + 1}.</span>
                          <span className="font-bold">{t.displayNumber}</span>
                          <span className="text-white/60">{new Date(t.arrivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
