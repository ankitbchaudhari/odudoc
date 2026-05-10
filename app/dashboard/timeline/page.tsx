"use client";

// One-page chronological view of everything that has happened in
// this patient's care: appointments, prescriptions, lab orders +
// transitions, wallet activity, and important notifications.
//
// Filtering is local — server returns up to 200 events, the page
// chips down by kind/date. Designed for the "what was that lab from
// last month?" kind of lookup where the user knows roughly when but
// not where to find it.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type TimelineKind = "appointment" | "prescription" | "lab_order" | "wallet" | "notification";

interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  at: string;
  title: string;
  body?: string;
  href?: string;
  tone?: "neutral" | "ok" | "warn" | "critical";
  meta?: Record<string, string | number | undefined>;
}

const KIND_LABEL: Record<TimelineKind, string> = {
  appointment: "Appointment",
  prescription: "Prescription",
  lab_order: "Lab",
  wallet: "Wallet",
  notification: "Alert",
};
const KIND_EMOJI: Record<TimelineKind, string> = {
  appointment: "📅",
  prescription: "💊",
  lab_order: "🧪",
  wallet: "💰",
  notification: "🔔",
};
const TONE_DOT: Record<NonNullable<TimelineEvent["tone"]>, string> = {
  neutral: "bg-slate-300",
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  critical: "bg-rose-600",
};

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dDate = new Date(d); dDate.setHours(0, 0, 0, 0);
  const diff = (today.getTime() - dDate.getTime()) / 86400000;
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [filter, setFilter] = useState<"all" | TimelineKind>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/timeline", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((d) => { if (!cancelled) setEvents(d.events || []); })
      .catch((e) => { if (!cancelled) setError(typeof e === "number" ? `Failed (${e})` : "Failed to load timeline"); });
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    for (const e of events || []) {
      c.all++;
      c[e.kind] = (c[e.kind] || 0) + 1;
    }
    return c;
  }, [events]);

  const filtered = useMemo(() => {
    if (!events) return null;
    if (filter === "all") return events;
    return events.filter((e) => e.kind === filter);
  }, [events, filter]);

  // Bucket by day for the rail header.
  const grouped = useMemo(() => {
    if (!filtered) return null;
    const groups: Array<{ label: string; items: TimelineEvent[] }> = [];
    for (const e of filtered) {
      const label = formatDateLabel(e.at);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(e);
      else groups.push({ label, items: [e] });
    }
    return groups;
  }, [filtered]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Health timeline</h1>
        <p className="mt-1 text-sm text-slate-500">
          Everything that has happened across your appointments, prescriptions, labs, and wallet — newest first.
        </p>
      </div>

      {/* Filter chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(["all", "appointment", "prescription", "lab_order", "wallet", "notification"] as const).map((k) => {
          const active = filter === k;
          const c = counts[k] || 0;
          if (k !== "all" && c === 0) return null;
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {k === "all" ? "All" : `${KIND_EMOJI[k]} ${KIND_LABEL[k]}`}
              <span className={`rounded-full px-1.5 text-[10px] font-bold ${active ? "bg-white/20" : "bg-slate-100 text-slate-600"}`}>
                {c}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>
      )}
      {!error && events === null && (
        <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm">Loading…</p>
      )}
      {!error && events && events.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-3xl">🩺</p>
          <p className="mt-2 text-base font-bold text-slate-700">Your timeline starts here</p>
          <p className="mt-1 text-sm text-slate-500">Book a consult, top up the wallet, or order a lab test — events show up automatically.</p>
        </div>
      )}

      {grouped && grouped.length > 0 && (
        <div className="relative">
          {/* Vertical rail */}
          <div aria-hidden className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-indigo-200 via-slate-200 to-transparent" />
          <div className="space-y-6">
            {grouped.map((g) => (
              <section key={g.label}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow ring-4 ring-white">
                    {g.items.length}
                  </span>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{g.label}</p>
                </div>
                <ul className="ml-4 space-y-2">
                  {g.items.map((e) => (
                    <li key={e.id} className="relative pl-7">
                      <span aria-hidden className={`absolute left-0 top-3 h-2.5 w-2.5 rounded-full ring-4 ring-white ${TONE_DOT[e.tone || "neutral"]}`} />
                      <EventCard event={e} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: TimelineEvent }) {
  const inner = (
    <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">{KIND_EMOJI[event.kind]}</span>
            <p className="truncate text-sm font-semibold text-slate-900">{event.title}</p>
          </div>
          {event.body && <p className="mt-1 text-xs text-slate-600">{event.body}</p>}
        </div>
        <p className="flex-none text-[10px] font-medium tabular-nums text-slate-400">{formatTime(event.at)}</p>
      </div>
    </div>
  );
  if (event.href) {
    const isExternal = /^https?:\/\//i.test(event.href);
    return isExternal ? (
      <a href={event.href} target="_blank" rel="noreferrer" className="block">{inner}</a>
    ) : (
      <Link href={event.href} className="block">{inner}</Link>
    );
  }
  return inner;
}
