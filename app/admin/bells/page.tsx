"use client";

// Bell devices admin — register + see live events.
// Receptionists + ward coordinators land here; managers also see
// device pairing controls.

import { useEffect, useState } from "react";

interface BellDevice {
  id: string;
  kind: "opd_phone" | "ipd_zigbee" | "ot_console";
  organizationId: string;
  label: string;
  identifier: string;
  pairedAt: string;
  active: boolean;
}

interface BellEvent {
  id: string;
  deviceId: string;
  deviceKind: BellDevice["kind"];
  deviceLabel: string;
  reason: string;
  note?: string;
  firedAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  closedAt?: string;
}

const REASON_LABEL: Record<string, string> = {
  opd_queue_advance: "OPD turn",
  ipd_help_request: "Help needed",
  ipd_pain: "Pain",
  ipd_toilet: "Toilet",
  code_blue: "🚨 CODE BLUE",
  code_pink: "🚨 Code Pink",
  other: "Other",
};

export default function BellsAdminPage() {
  const [events, setEvents] = useState<BellEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/bells", { cache: "no-store" });
      const j = await r.json();
      setEvents(j.events || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000); // 5s poll for live alarms
    return () => clearInterval(id);
  }, []);

  const ack = async (id: string) => {
    await fetch(`/api/bells/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "ack" }),
    });
    refresh();
  };

  const close = async (id: string) => {
    await fetch(`/api/bells/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "close" }),
    });
    refresh();
  };

  return (
    <main className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600">Bells &amp; alarms</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Live bell events</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          OPD turn-ups · IPD help requests · code alarms. Auto-refreshes every 5 seconds.
          Click <strong>Acknowledge</strong> to claim a bell; click <strong>Close</strong> when the need is resolved.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          {loading ? "Loading…" : events.length === 0 ? "All clear" : `${events.length} active`}
        </p>
        {events.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">🔕 No active alarms.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => {
              const codeBlue = e.reason === "code_blue" || e.reason === "code_pink";
              const acked = !!e.acknowledgedBy;
              return (
                <li
                  key={e.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${
                    codeBlue
                      ? "border-rose-400 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/40"
                      : acked
                        ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40"
                        : "border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/40"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {REASON_LABEL[e.reason] || e.reason} · {e.deviceLabel}
                    </p>
                    {e.note && <p className="text-xs text-slate-600 dark:text-slate-300">{e.note}</p>}
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Rang {new Date(e.firedAt).toLocaleTimeString()}
                      {acked && <> · Acked by {e.acknowledgedBy} at {new Date(e.acknowledgedAt!).toLocaleTimeString()}</>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!acked && (
                      <button
                        onClick={() => ack(e.id)}
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600"
                      >
                        Acknowledge
                      </button>
                    )}
                    <button
                      onClick={() => close(e.id)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      Close
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <p className="font-semibold text-slate-700 dark:text-slate-200">Device catalogue</p>
        <p className="mt-1">
          Three bell types are supported: <strong>OPD phone-as-bell</strong> (uses the patient&apos;s own phone — no hardware),{" "}
          <strong>IPD Zigbee bedside bell</strong> (Sonoff Zigbee, ~₹600 per bed, paired via the gateway), and{" "}
          <strong>OT console</strong> (wall-mounted button for code handoffs). Devices are paired during onboarding;
          contact your CSM to add new units.
        </p>
      </section>
    </main>
  );
}
