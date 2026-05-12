"use client";

// Drop-in notification bell. Polls /api/notifications every 30s,
// shows unread count badge, opens a popover with the inbox.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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
const SEVERITY_TONE: Record<string, string> = {
  info: "border-sky-200 bg-sky-50",
  success: "border-emerald-200 bg-emerald-50",
  warn: "border-amber-200 bg-amber-50",
  critical: "border-rose-300 bg-rose-50",
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function NotificationBell({ className = "" }: { className?: string }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        const next: Notification[] = d.notifications || [];
        // If a fresh org-modules-changed event lands (one we hadn't
        // seen before), dispatch a global event so the admin layout
        // refetches its tenant context. Drives "modules apply
        // immediately" without waiting on the 60s polling interval.
        const seenIds = new Set(items.map((n) => n.id));
        const newOrgModules = next.find((n) => !seenIds.has(n.id) && n.reference?.startsWith("org_modules:"));
        if (newOrgModules && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("odudoc:org-modules-changed"));
        }
        setItems(next);
        setUnread(d.unread || 0);
      }
    } catch { /* best-effort */ }
  }, [items]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", id }),
    });
    await load();
  };
  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    });
    await load();
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 hover:bg-slate-50 dark:bg-slate-900"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[360px] max-w-[92vw] overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Notifications</p>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[11px] font-semibold text-indigo-600">Mark all read</button>
              )}
              <Link href="/dashboard/notifications" onClick={() => setOpen(false)} className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300">
                Open inbox
              </Link>
            </div>
          </div>
          {items.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">No notifications yet.</p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className={`border-b border-slate-100 last:border-0 ${!n.readAt ? "bg-indigo-50/30" : ""}`}>
                  <Link
                    href={n.link || "#"}
                    onClick={() => { setOpen(false); markRead(n.id); }}
                    className={`flex items-start gap-3 px-4 py-3 ${SEVERITY_TONE[n.severity] || ""} hover:bg-slate-50 dark:bg-slate-900`}
                  >
                    <span className="text-xl">{KIND_EMOJI[n.kind] || "🔔"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{n.title}</p>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{n.body}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.createdAt)}{!n.readAt && " · new"}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
