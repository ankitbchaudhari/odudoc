"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface Stats {
  posts: number;
  users: number;
  products: number;
  doctors: number;
  departments: number;
  comments: number;
  subscribers: number;
  formResponses: number;
  orders: number;
  bookings: number;
}

interface Subscriber {
  id: string;
  email: string;
  subscribedAt: string;
  source: string;
  active: boolean;
}

interface Comment {
  id: string;
  postSlug?: string;
  name: string;
  email: string;
  content: string;
  approved: boolean;
  createdAt: string;
}

interface RecentOrder {
  id: string;
  orderNumber?: string;
  customerName: string;
  total: number;
  orderStatus: string;
  createdAt: string;
}

interface DashboardResp {
  stats: Stats;
  revenue: number;
  subscribers: Subscriber[];
  comments: Comment[];
  recentOrders: RecentOrder[];
}

// Deterministic gravatar-style avatar — same letter → same colour,
// so the subscriber/comment list looks coherent across reloads.
const gravatar = (email: string, size = 40) => {
  const letter = (email || "?").charAt(0).toUpperCase();
  return `https://ui-avatars.com/api/?name=${letter}&background=0E7490&color=fff&size=${size}&bold=true`;
};

// Modern KPI card — soft tinted background, coloured icon puck, optional
// trend chip on the right. Stays legible on both light hero + page bg.
interface KpiCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tint: string;          // e.g. "from-blue-50 to-blue-100/60 text-blue-700"
  iconBg: string;        // e.g. "bg-blue-500"
  href?: string;
  delta?: string;        // optional "+12%" style chip
}

function KpiCard({ label, value, icon, tint, iconBg, href, delta }: KpiCardProps) {
  const body = (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br p-5 shadow-sm ring-1 ring-black/[0.03] transition-all hover:-translate-y-0.5 hover:shadow-lg ${tint}`}
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md ${iconBg}`}>
          {icon}
        </div>
        {delta && (
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700 ring-1 ring-emerald-200 backdrop-blur">
            {delta}
          </span>
        )}
      </div>
      <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] opacity-75">
        {label}
      </p>
      <div className="mt-1 flex items-end justify-between">
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {href && (
          <span className="text-[11px] font-semibold opacity-0 transition-opacity group-hover:opacity-100">
            View →
          </span>
        )}
      </div>
      <div className="pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-white/40 blur-2xl" />
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const r = await fetch("/api/admin/dashboard", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = (await r.json()) as DashboardResp;
      setData(d);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function setApproval(id: string, approved: boolean) {
    try {
      const r = await fetch("/api/admin/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, approved }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await refresh();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function deleteComment(id: string) {
    if (!confirm("Delete this comment?")) return;
    try {
      const r = await fetch(`/api/admin/comments?id=${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await refresh();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  const stats = data?.stats;
  const revenue = data?.revenue ?? 0;

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    []
  );

  return (
    <div className="space-y-8">
      {/* ── Hero header ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 text-white shadow-xl">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur ring-1 ring-white/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Live · {today}
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Welcome back, Admin 👋
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/70">
              Here is what is happening across OduDoc today — revenue, new signups,
              pending reviews and everything in between.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <svg
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582M4.581 9A8.003 8.003 0 0112 4a8 8 0 018 8M19.418 15A8.003 8.003 0 0112 20a8 8 0 01-8-8M20 20v-5h-.581"
                />
              </svg>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-100"
            >
              View site
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Top-level KPI strip (revenue / orders / bookings / forms) */}
        <div className="relative mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Revenue", value: `$${revenue.toFixed(2)}`, hint: "Gross online sales" },
            { label: "Orders", value: stats?.orders ?? 0, hint: "Across all vendors" },
            { label: "Bookings", value: stats?.bookings ?? 0, hint: "Confirmed appointments" },
            { label: "Form Responses", value: stats?.formResponses ?? 0, hint: "Contact + demo" },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
                {k.label}
              </p>
              <p className="mt-1 text-2xl font-bold">{k.value}</p>
              <p className="mt-0.5 text-[11px] text-white/50">{k.hint}</p>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.73-3L13.73 4a2 2 0 00-3.46 0L3.2 16a2 2 0 001.73 3z" />
          </svg>
          {error}
        </div>
      )}

      {/* ── KPI cards ─────────────────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">
            Platform at a glance
          </h2>
          <span className="text-[11px] text-slate-400">Click any card to dive in</span>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Posts"
            value={stats?.posts ?? "—"}
            href="/admin/blog"
            tint="from-blue-50 to-blue-100/40 text-blue-900"
            iconBg="bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <KpiCard
            label="Users"
            value={stats?.users ?? "—"}
            href="/admin/users"
            tint="from-emerald-50 to-emerald-100/40 text-emerald-900"
            iconBg="bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
          <KpiCard
            label="Products"
            value={stats?.products ?? "—"}
            href="/admin/products"
            tint="from-amber-50 to-amber-100/40 text-amber-900"
            iconBg="bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
          />
          <KpiCard
            label="Doctors"
            value={stats?.doctors ?? "—"}
            href="/admin/doctors"
            tint="from-cyan-50 to-sky-100/40 text-sky-900"
            iconBg="bg-gradient-to-br from-cyan-500 to-sky-600 shadow-sky-500/30"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v.01M8 10v.01M12 14v.01M12 10v.01M16 14v.01M16 10v.01M4 6h16a1 1 0 011 1v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7a1 1 0 011-1z" />
              </svg>
            }
          />
          <KpiCard
            label="Departments"
            value={stats?.departments ?? "—"}
            href="/admin/departments"
            tint="from-indigo-50 to-indigo-100/40 text-indigo-900"
            iconBg="bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/30"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            }
          />
          <KpiCard
            label="Comments"
            value={stats?.comments ?? "—"}
            href="/admin/reviews"
            tint="from-rose-50 to-pink-100/40 text-rose-900"
            iconBg="bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/30"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
          />
          <KpiCard
            label="Subscribers"
            value={stats?.subscribers ?? "—"}
            href="/admin/subscribers"
            tint="from-teal-50 to-emerald-100/40 text-teal-900"
            iconBg="bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/30"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            }
          />
          <KpiCard
            label="Form Responses"
            value={stats?.formResponses ?? "—"}
            href="/admin/appointments"
            tint="from-violet-50 to-purple-100/40 text-violet-900"
            iconBg="bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/30"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          />
        </div>
      </div>

      {/* ── Subscribers + Comments ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Subscribers */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">Latest subscribers</h2>
              <p className="text-[11px] text-slate-500">Newest email signups</p>
            </div>
            <Link href="/admin/subscribers" className="ml-auto rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200">
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-slate-50">
            {loading && (
              <li className="px-5 py-12 text-center text-sm text-slate-400">Loading…</li>
            )}
            {!loading && (data?.subscribers.length ?? 0) === 0 && (
              <li className="px-5 py-12 text-center text-sm text-slate-400">
                No subscribers yet.
              </li>
            )}
            {!loading &&
              data?.subscribers.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gravatar(s.email)} alt="" className="h-10 w-10 rounded-xl ring-2 ring-white shadow-sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">{s.email}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      via {s.source}
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </div>

        {/* Comments */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">Latest comments</h2>
              <p className="text-[11px] text-slate-500">Pending moderation first</p>
            </div>
            <Link href="/admin/reviews" className="ml-auto rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200">
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-slate-50">
            {loading && (
              <li className="px-5 py-12 text-center text-sm text-slate-400">Loading…</li>
            )}
            {!loading && (data?.comments.length ?? 0) === 0 && (
              <li className="px-5 py-12 text-center text-sm text-slate-400">No comments yet.</li>
            )}
            {!loading &&
              data?.comments.map((c) => (
                <li key={c.id} className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gravatar(c.email)} alt="" className="h-10 w-10 flex-shrink-0 rounded-xl ring-2 ring-white shadow-sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{c.name}</h3>
                      {c.approved ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">{c.email}</p>
                    <p className="mt-1.5 text-sm text-slate-600 line-clamp-3">{c.content}</p>
                    <div className="mt-2 flex gap-3 text-xs">
                      {c.approved ? (
                        <button
                          onClick={() => setApproval(c.id, false)}
                          className="font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                        >
                          Unapprove
                        </button>
                      ) : (
                        <button
                          onClick={() => setApproval(c.id, true)}
                          className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => deleteComment(c.id)}
                        className="font-semibold text-red-600 hover:text-red-700 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      </div>

      {/* ── Recent orders ─────────────────────────────────────────── */}
      {data && data.recentOrders.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">Recent orders</h2>
              <p className="text-[11px] text-slate-500">Last 10 online orders</p>
            </div>
            <Link href="/admin/orders" className="ml-auto rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200">
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Order</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Customer</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Total</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.recentOrders.map((o) => {
                  const status = (o.orderStatus || "").toLowerCase();
                  const statusCls =
                    status === "delivered" || status === "completed" || status === "paid"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : status === "shipped" || status === "processing"
                        ? "bg-blue-50 text-blue-700 ring-blue-200"
                        : status === "cancelled" || status === "refunded"
                          ? "bg-red-50 text-red-700 ring-red-200"
                          : "bg-amber-50 text-amber-700 ring-amber-200";
                  return (
                    <tr key={o.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono text-xs text-slate-600">{o.orderNumber || o.id}</td>
                      <td className="px-5 py-3 font-medium text-slate-900">{o.customerName}</td>
                      <td className="px-5 py-3 font-bold text-slate-900">${(o.total || 0).toFixed(2)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ${statusCls}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                          {o.orderStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
