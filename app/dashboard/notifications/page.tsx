"use client";

// Full notification inbox. The bell in the navbar gives a 50-item
// preview; this page is the durable archive with filtering, search,
// and bulk mark-read. Unread items get a soft tint + dot; clicking
// a row opens the deep link and marks it read.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

interface Notification {
  id: string; kind: string; severity: "info" | "success" | "warn" | "critical";
  title: string; body: string; link?: string; reference?: string;
  readAt?: string; createdAt: string;
}

const KIND_EMOJI: Record<string, string> = {
  appointment_reminder: "📅", appointment_confirmed: "✓",
  appointment_cancelled: "❌", lab_result_ready: "🧪",
  rx_ready: "💊", refill_due: "🔁",
  transfer_received: "↓", transfer_accepted: "↔",
  wallet_topup: "💰", wallet_refund: "↩",
  abha_linked: "🇮🇳", consent_request: "🔐",
  billing_invoice: "🧾", system: "📣",
};
const KIND_LABEL: Record<string, string> = {
  appointment_reminder: "Appointment", appointment_confirmed: "Appointment",
  appointment_cancelled: "Appointment", lab_result_ready: "Lab",
  rx_ready: "Prescription", refill_due: "Refill",
  transfer_received: "Transfer", transfer_accepted: "Transfer",
  wallet_topup: "Wallet", wallet_refund: "Wallet",
  abha_linked: "ABHA", consent_request: "Consent",
  billing_invoice: "Billing", system: "System",
};
const SEVERITY_BORDER: Record<string, string> = {
  info: "border-l-sky-400", success: "border-l-emerald-500",
  warn: "border-l-amber-500", critical: "border-l-rose-600",
};

type Filter = "all" | "unread" | string;

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsInboxPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setItems(d.notifications || []);
        setUnread(d.unread || 0);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markOne = async (id: string) => {
    await fetch("/api/notifications", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", id }),
    });
    load();
  };
  const markAll = async () => {
    await fetch("/api/notifications", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    });
    load();
  };

  // Categories present in the inbox — only show tabs that have items.
  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const n of items) {
      const cat = (KIND_LABEL[n.kind] || "Other");
      seen.add(cat);
    }
    return Array.from(seen).sort();
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (filter === "unread") list = list.filter((n) => !n.readAt);
    else if (filter !== "all") list = list.filter((n) => (KIND_LABEL[n.kind] || "Other") === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
    }
    return list;
  }, [items, filter, query]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Inbox</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {unread > 0 ? `${unread} unread · ` : ""}{items.length} total
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm">
            Mark all read
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
        <Chip active={filter === "unread"} onClick={() => setFilter("unread")} badge={unread || undefined}>Unread</Chip>
        {categories.map((c) => (
          <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>{c}</Chip>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="ml-auto w-40 rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm sm:w-56"
        />
      </div>

      {loading ? (
        <p className="rounded-xl bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-400 shadow-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white dark:bg-slate-900 p-10 text-center">
          <p className="text-3xl">📭</p>
          <p className="mt-2 text-base font-bold text-slate-700 dark:text-slate-300">No notifications here</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{filter === "all" ? "You're all caught up." : "Try a different filter."}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((n) => (
            <li key={n.id} className={`rounded-xl border-l-4 bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 ${SEVERITY_BORDER[n.severity] || ""} ${!n.readAt ? "bg-indigo-50/30" : ""}`}>
              <Link
                href={n.link || "#"}
                onClick={() => { if (!n.readAt) markOne(n.id); }}
                className="flex items-start gap-3 px-4 py-3"
              >
                <span className="text-2xl leading-none">{KIND_EMOJI[n.kind] || "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{n.title}</p>
                    {!n.readAt && <span className="h-1.5 w-1.5 flex-none rounded-full bg-indigo-500" aria-hidden />}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{n.body}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                      {KIND_LABEL[n.kind] || "Other"}
                    </span>
                    <span>{timeAgo(n.createdAt)}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({ active, onClick, children, badge }: { active: boolean; onClick: () => void; children: React.ReactNode; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? "bg-indigo-600 text-white shadow-sm" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
      }`}
    >
      {children}
      {badge !== undefined && (
        <span className={`rounded-full px-1.5 text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-rose-100 text-rose-700"}`}>
          {badge}
        </span>
      )}
    </button>
  );
}
