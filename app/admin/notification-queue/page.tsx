"use client";

// Notification dispatch queue admin view.
// Shows pending escalation rows + lets admin run a manual tick.

import { useCallback, useEffect, useState } from "react";

type Level = 0 | 1 | 2 | 3 | 4;
type State = "queued" | "delivering" | "delivered" | "acknowledged" | "escalated" | "failed";
type Channel = "in_app" | "push" | "sms" | "whatsapp" | "voice" | "email";

interface Dispatch {
  id: string;
  eventKey: string;
  reason: string;
  level: Level;
  recipient: string;
  channel: Channel;
  body: string;
  queuedAt: string;
  firedAt?: string;
  state: State;
  rung: number;
  escalateAt?: string;
}

const LEVEL_TONE: Record<Level, string> = {
  0: "bg-slate-100 text-slate-700",
  1: "bg-sky-100 text-sky-800",
  2: "bg-amber-100 text-amber-900",
  3: "bg-orange-100 text-orange-900",
  4: "bg-rose-200 text-rose-900",
};

const LEVEL_LABEL: Record<Level, string> = {
  0: "Info", 1: "Routine", 2: "Actionable", 3: "Urgent", 4: "Emergency",
};

const CHANNEL_EMOJI: Record<Channel, string> = {
  in_app: "📱",
  push: "🔔",
  sms: "💬",
  whatsapp: "🟢",
  voice: "📞",
  email: "✉️",
};

export default function NotificationQueuePage() {
  const [pending, setPending] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/notification-dispatch", { cache: "no-store" });
      const j = await r.json();
      setPending(j.pending || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const tick = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/notification-dispatch", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "tick" }),
      });
      const j = await r.json();
      alert(`Tick: ${j.fired} fired, ${j.escalated} escalated.`);
      refresh();
    } finally { setBusy(false); }
  };

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Infrastructure · Notifications</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Dispatch queue</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Pending escalation rows. Each clinical event fans out across the level&apos;s channel mix; if
            the rung isn&apos;t acknowledged within the window, the next level fires automatically.
          </p>
        </div>
        <button
          onClick={tick}
          disabled={busy}
          className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white shadow"
        >
          {busy ? "Ticking…" : "Run tick"}
        </button>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading && pending.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">Queue empty — no pending or in-flight dispatches.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {pending.map((d) => (
              <li key={d.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${LEVEL_TONE[d.level]}`}>
                        L{d.level} · {LEVEL_LABEL[d.level]}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {CHANNEL_EMOJI[d.channel]} {d.channel}
                      </span>
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                        Rung {d.rung}
                      </span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                        {d.state}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                      <strong>{d.reason}</strong> → {d.recipient}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{d.body}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Queued {new Date(d.queuedAt).toLocaleTimeString()}
                      {d.escalateAt && <> · Escalate at {new Date(d.escalateAt).toLocaleTimeString()}</>}
                      {" · Event "}<code>{d.eventKey.slice(0, 12)}</code>
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
