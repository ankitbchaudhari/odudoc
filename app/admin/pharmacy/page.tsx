"use client";

// Pharmacist landing dashboard.
//
// This is the home the middleware bounces a role="pharmacist" user to
// after login. It's designed to give a pharmacist everything they need
// at a glance: what to dispense next, what's running low, what's about
// to expire, and one-click access to the deeper pharmacy modules.
//
// Data sources (all already role-gated server-side):
//   /api/prescriptions          → active Rx queue  (pharmacist GETs all)
//   /api/hospital/inventory     → stock + batches  (tenant-scoped)
//   /api/hospital/dispensing    → recent dispenses (tenant-scoped)
//
// Any endpoint that 403s for a pharmacist without org context is
// tolerated — the corresponding card just shows an empty state rather
// than breaking the whole page.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PrescriptionRecord } from "@/lib/prescriptions-store";
import type { InventoryItem } from "@/lib/hospital/inventory-store";
import type { DispenseRecord } from "@/lib/hospital/dispensing-store";

// Tunable thresholds. Kept client-side because they're purely display-
// level — the underlying stores don't know or care.
const LOW_STOCK_THRESHOLD = 10;
const EXPIRING_WINDOW_DAYS = 30;

function onHand(it: InventoryItem): number {
  return it.batches.reduce((s, b) => s + (b.quantity || 0), 0);
}

function earliestExpiry(it: InventoryItem): string | null {
  const dates = it.batches
    .map((b) => b.expiryDate)
    .filter((d): d is string => !!d)
    .sort();
  return dates[0] ?? null;
}

function daysUntil(iso: string): number {
  const d = new Date(iso).getTime();
  const now = Date.now();
  return Math.floor((d - now) / 86_400_000);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return formatDate(iso);
}

// Reads an endpoint and returns the parsed JSON, or null if the response
// wasn't ok. We deliberately don't throw here so one failing card
// doesn't take the whole dashboard down.
async function safeFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default function PharmacyDashboardPage() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [dispenses, setDispenses] = useState<DispenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date>(new Date());
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const [rx, inv, disp] = await Promise.all([
      safeFetch<{ prescriptions: PrescriptionRecord[] }>("/api/prescriptions"),
      safeFetch<{ items: InventoryItem[] }>("/api/hospital/inventory"),
      safeFetch<{ dispenses: DispenseRecord[] }>("/api/hospital/dispensing"),
    ]);
    setPrescriptions(rx?.prescriptions ?? []);
    setItems(inv?.items ?? []);
    setDispenses(disp?.dispenses ?? []);
    setRefreshedAt(new Date());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // Refresh every 60s so a pharmacist who keeps the tab open sees
    // new prescriptions appear without a manual reload.
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  // ---- Derived KPIs ------------------------------------------------------

  const activeRx = useMemo(
    () => prescriptions.filter((p) => p.status === "active"),
    [prescriptions]
  );

  const dispensedToday = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return dispenses.filter((d) => {
      const t = new Date(d.createdAt ?? d.dispensedAt ?? 0).getTime();
      return t >= start.getTime() && d.status !== "cancelled";
    }).length;
  }, [dispenses]);

  const lowStock = useMemo(() => {
    return items
      .map((it) => ({ it, qty: onHand(it) }))
      .filter(({ qty }) => qty <= LOW_STOCK_THRESHOLD)
      .sort((a, b) => a.qty - b.qty);
  }, [items]);

  const expiringSoon = useMemo(() => {
    return items
      .map((it) => ({ it, exp: earliestExpiry(it) }))
      .filter((x): x is { it: InventoryItem; exp: string } => !!x.exp)
      .map(({ it, exp }) => ({ it, exp, days: daysUntil(exp) }))
      .filter(({ days }) => days <= EXPIRING_WINDOW_DAYS)
      .sort((a, b) => a.days - b.days);
  }, [items]);

  const totalValue = useMemo(() => {
    return items.reduce((sum, it) => {
      return (
        sum +
        it.batches.reduce(
          (s, b) => s + (b.quantity || 0) * (b.sellingPrice || 0),
          0
        )
      );
    }, 0);
  }, [items]);

  const queue = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeRx
      .filter((p) => {
        if (!q) return true;
        const hay = `${p.patientEmail} ${p.doctorEmail} ${p.data?.patientName ?? ""} ${p.data?.diagnosis ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 10);
  }, [activeRx, search]);

  // ---- Render ------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-200" />
              Pharmacy Control Center
            </div>
            <h1 className="text-2xl font-bold sm:text-3xl">Good day, Pharmacist</h1>
            <p className="mt-1 max-w-xl text-sm text-emerald-50/90 sm:text-base">
              Dispense prescriptions, monitor stock health, and stay on top of
              expiring batches — all from one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/dispensing"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Dispense
            </Link>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-60"
            >
              <svg
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
        <p className="relative mt-4 text-xs text-emerald-50/80">
          Last updated {refreshedAt.toLocaleTimeString()} · auto-refreshes every 60s
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Pending Rx"
          value={activeRx.length}
          hint="awaiting dispense"
          accent="from-emerald-500 to-teal-500"
          icon={
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m-8 5h10a2 2 0 002-2V7a2 2 0 00-2-2H8.5L4 9.5V19a2 2 0 002 2z" />
          }
        />
        <KpiCard
          label="Dispensed today"
          value={dispensedToday}
          hint="so far"
          accent="from-cyan-500 to-sky-500"
          icon={
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          }
        />
        <KpiCard
          label="Low stock"
          value={lowStock.length}
          hint={`≤ ${LOW_STOCK_THRESHOLD} on hand`}
          accent="from-amber-500 to-orange-500"
          warn={lowStock.length > 0}
          icon={
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          }
        />
        <KpiCard
          label="Expiring soon"
          value={expiringSoon.length}
          hint={`within ${EXPIRING_WINDOW_DAYS} days`}
          accent="from-rose-500 to-pink-500"
          warn={expiringSoon.length > 0}
          icon={
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          }
        />
      </div>

      {/* Quick actions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Quick actions
          </h2>
          <span className="text-xs text-gray-400">
            Inventory value ₹{totalValue.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <QuickAction href="/admin/prescriptions" label="Prescriptions" color="emerald"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
          />
          <QuickAction href="/admin/dispensing" label="Dispense" color="cyan"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />}
          />
          <QuickAction href="/admin/pharmacy-inventory" label="Inventory" color="amber"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />}
          />
          <QuickAction href="/admin/formulary" label="Formulary" color="indigo"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />}
          />
          <QuickAction href="/admin/hospital-rx" label="Hospital Rx" color="teal"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />}
          />
          <QuickAction href="/admin/orders" label="Online orders" color="rose"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />}
          />
        </div>
      </div>

      {/* Queue + Alerts grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Rx queue */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Prescription queue</h2>
              <p className="text-xs text-gray-500">
                Active prescriptions ready to dispense.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient, doctor, diagnosis…"
                className="w-56 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <Link
                href="/admin/prescriptions"
                className="whitespace-nowrap text-sm font-medium text-emerald-700 hover:text-emerald-900"
              >
                View all →
              </Link>
            </div>
          </div>
          {loading && queue.length === 0 ? (
            <SkeletonRows />
          ) : queue.length === 0 ? (
            <EmptyState
              title={activeRx.length === 0 ? "Inbox zero" : "No matches"}
              body={
                activeRx.length === 0
                  ? "No active prescriptions waiting. New ones will appear here automatically."
                  : "Try a different search term."
              }
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {queue.map((p) => {
                const meds = p.data?.medications?.length ?? 0;
                return (
                  <li
                    key={p.id}
                    className="group flex items-center justify-between gap-4 p-4 transition hover:bg-emerald-50/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {p.data?.patientName || p.patientEmail}
                        </p>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                          {meds} med{meds === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-gray-500">
                        {p.data?.diagnosis || "No diagnosis recorded"} · by{" "}
                        {p.doctorEmail}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <span className="whitespace-nowrap text-xs text-gray-400">
                        {formatRelative(p.createdAt)}
                      </span>
                      <Link
                        href={`/admin/prescriptions`}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100"
                      >
                        Open
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Alerts column */}
        <div className="space-y-6">
          <AlertCard
            title="Low stock"
            linkLabel="Restock"
            href="/admin/pharmacy-inventory"
            tone="amber"
            empty={!loading && lowStock.length === 0}
            emptyBody="Every item is above the minimum threshold."
            loading={loading && lowStock.length === 0}
          >
            {lowStock.slice(0, 5).map(({ it, qty }) => (
              <li key={it.id} className="flex items-center justify-between py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {it.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {it.sku} · {it.unit}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    qty === 0
                      ? "bg-rose-100 text-rose-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {qty} {it.unit}
                </span>
              </li>
            ))}
          </AlertCard>

          <AlertCard
            title="Expiring soon"
            linkLabel="Review"
            href="/admin/pharmacy-inventory"
            tone="rose"
            empty={!loading && expiringSoon.length === 0}
            emptyBody="No batches expiring in the next 30 days."
            loading={loading && expiringSoon.length === 0}
          >
            {expiringSoon.slice(0, 5).map(({ it, exp, days }) => (
              <li key={it.id} className="flex items-center justify-between py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {it.name}
                  </p>
                  <p className="text-xs text-gray-500">Expires {formatDate(exp)}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    days <= 7
                      ? "bg-rose-100 text-rose-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {days <= 0 ? "expired" : `${days}d`}
                </span>
              </li>
            ))}
          </AlertCard>
        </div>
      </div>

      {/* Tips footer */}
      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 p-4 text-sm text-emerald-900">
        <strong className="font-semibold">Tip · </strong>
        Cancellations and amendments must still come from the prescribing
        doctor. If you spot a duplicate or a dosage concern, flag it through
        the prescription page instead of dispensing.
      </div>
    </div>
  );
}

// ---- Presentational helpers ---------------------------------------------

function KpiCard({
  label,
  value,
  hint,
  accent,
  warn,
  icon,
}: {
  label: string;
  value: number;
  hint: string;
  accent: string;
  warn?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl transition group-hover:opacity-40`}
      />
      <div className="relative flex items-center justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${accent} text-white shadow`}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {icon}
          </svg>
        </div>
        {warn ? (
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-rose-500" />
        ) : null}
      </div>
      <p className="relative mt-3 text-2xl font-bold text-gray-900">{value}</p>
      <p className="relative text-xs font-medium text-gray-600">{label}</p>
      <p className="relative text-[11px] text-gray-400">{hint}</p>
    </div>
  );
}

function QuickAction({
  href,
  label,
  color,
  icon,
}: {
  href: string;
  label: string;
  color: "emerald" | "cyan" | "amber" | "indigo" | "teal" | "rose";
  icon: React.ReactNode;
}) {
  // Using concrete class names so Tailwind's JIT picks them up.
  const palette: Record<typeof color, string> = {
    emerald: "from-emerald-50 to-emerald-100 text-emerald-700 hover:border-emerald-300",
    cyan: "from-cyan-50 to-cyan-100 text-cyan-700 hover:border-cyan-300",
    amber: "from-amber-50 to-amber-100 text-amber-700 hover:border-amber-300",
    indigo: "from-indigo-50 to-indigo-100 text-indigo-700 hover:border-indigo-300",
    teal: "from-teal-50 to-teal-100 text-teal-700 hover:border-teal-300",
    rose: "from-rose-50 to-rose-100 text-rose-700 hover:border-rose-300",
  };
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl border border-gray-200 bg-gradient-to-br p-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-md ${palette[color]}`}
    >
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {icon}
      </svg>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function AlertCard({
  title,
  linkLabel,
  href,
  tone,
  children,
  empty,
  emptyBody,
  loading,
}: {
  title: string;
  linkLabel: string;
  href: string;
  tone: "amber" | "rose";
  children: React.ReactNode;
  empty?: boolean;
  emptyBody?: string;
  loading?: boolean;
}) {
  const border =
    tone === "amber" ? "border-amber-200" : "border-rose-200";
  const tint =
    tone === "amber" ? "bg-amber-50/50" : "bg-rose-50/50";
  const link =
    tone === "amber"
      ? "text-amber-700 hover:text-amber-900"
      : "text-rose-700 hover:text-rose-900";
  return (
    <div
      className={`rounded-xl border ${border} ${tint} p-4 shadow-sm`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <Link href={href} className={`text-xs font-medium ${link}`}>
          {linkLabel} →
        </Link>
      </div>
      {loading ? (
        <div className="space-y-2 py-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-8 animate-pulse rounded bg-white/60"
            />
          ))}
        </div>
      ) : empty ? (
        <p className="py-4 text-xs text-gray-500">{emptyBody}</p>
      ) : (
        <ul className="divide-y divide-white">{children}</ul>
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="p-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="mb-3 h-14 animate-pulse rounded-lg bg-gray-100"
        />
      ))}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="max-w-xs text-xs text-gray-500">{body}</p>
    </div>
  );
}
