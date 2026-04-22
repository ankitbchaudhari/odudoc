"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

const gravatar = (email: string, size = 40) => {
  const letter = (email || "?").charAt(0).toUpperCase();
  return `https://ui-avatars.com/api/?name=${letter}&background=0E7490&color=fff&size=${size}&bold=true`;
};

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  bg: string;
  shadow: string;
  href?: string;
}

function StatCard({ label, value, icon, bg, shadow, href }: StatCardProps) {
  const card = (
    <div className={`relative overflow-hidden rounded-xl p-5 text-white shadow-lg transition-transform hover:scale-[1.02] ${bg} ${shadow}`}>
      <div className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-90">{label}</p>
        <p className="mt-2 text-4xl font-bold">{value}</p>
      </div>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">{icon}</div>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
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

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back. Here is what is happening with OduDoc today.
          </p>
        </div>
        <button
          onClick={refresh}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Revenue strip */}
      {data && (
        <div className="mb-6 grid gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500">Revenue</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">${revenue.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500">Orders</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{stats?.orders ?? 0}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500">Bookings</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{stats?.bookings ?? 0}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500">Form Responses</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{stats?.formResponses ?? 0}</div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Posts" value={stats?.posts ?? "—"} href="/admin/blog" bg="bg-gradient-to-br from-blue-500 to-blue-600" shadow="shadow-blue-500/40"
          icon={<svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>} />
        <StatCard label="Total Users" value={stats?.users ?? "—"} href="/admin/users" bg="bg-gradient-to-br from-emerald-500 to-emerald-600" shadow="shadow-emerald-500/40"
          icon={<svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
        <StatCard label="Total Products" value={stats?.products ?? "—"} href="/admin/products" bg="bg-gradient-to-br from-slate-500 to-slate-600" shadow="shadow-slate-500/40"
          icon={<svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>} />
        <StatCard label="Total Doctors" value={stats?.doctors ?? "—"} href="/admin/doctors" bg="bg-gradient-to-br from-cyan-500 to-sky-600" shadow="shadow-cyan-500/40"
          icon={<svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>} />
        <StatCard label="Total Department" value={stats?.departments ?? "—"} href="/admin/departments" bg="bg-gradient-to-br from-indigo-500 to-indigo-600" shadow="shadow-indigo-500/40"
          icon={<svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>} />
        <StatCard label="Total Comments" value={stats?.comments ?? "—"} href="/admin/reviews" bg="bg-gradient-to-br from-gray-600 to-gray-700" shadow="shadow-gray-500/40"
          icon={<svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>} />
        <StatCard label="Total Subscriber" value={stats?.subscribers ?? "—"} href="/admin/subscribers" bg="bg-gradient-to-br from-green-500 to-emerald-600" shadow="shadow-green-500/40"
          icon={<svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>} />
        <StatCard label="Total Form Responses" value={stats?.formResponses ?? "—"} href="/admin/appointments" bg="bg-gradient-to-br from-blue-500 to-indigo-600" shadow="shadow-blue-500/40"
          icon={<svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} />
      </div>

      {/* Lists */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </span>
            <h2 className="text-base font-bold text-gray-900">Latest Subscribers</h2>
            <Link href="/admin/subscribers" className="ml-auto text-xs font-semibold text-primary-600 hover:underline">View All</Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {loading && <li className="px-5 py-8 text-center text-sm text-gray-400">Loading…</li>}
            {!loading && (data?.subscribers.length ?? 0) === 0 && (
              <li className="px-5 py-8 text-center text-sm text-gray-400">No subscribers found</li>
            )}
            {!loading && data?.subscribers.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                <img src={gravatar(s.email)} alt="" className="h-10 w-10 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-gray-700">{s.email}</div>
                  <div className="text-[11px] text-gray-400">via {s.source}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </span>
            <h2 className="text-base font-bold text-gray-900">Latest Comments</h2>
            <Link href="/admin/reviews" className="ml-auto text-xs font-semibold text-primary-600 hover:underline">View All</Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {loading && <li className="px-5 py-8 text-center text-sm text-gray-400">Loading…</li>}
            {!loading && (data?.comments.length ?? 0) === 0 && (
              <li className="px-5 py-8 text-center text-sm text-gray-400">No comments found</li>
            )}
            {!loading && data?.comments.map((c) => (
              <li key={c.id} className="flex items-start gap-3 px-5 py-4">
                <img src={gravatar(c.email)} alt="" className="h-10 w-10 flex-shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{c.name}</h3>
                    {c.approved ? (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-green-700">Approved</span>
                    ) : (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700">Not Approved</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{c.email}</p>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-3">{c.content}</p>
                  <div className="mt-2 flex gap-3 text-xs">
                    {c.approved ? (
                      <button onClick={() => setApproval(c.id, false)} className="font-medium text-amber-600 hover:underline">Unapprove</button>
                    ) : (
                      <button onClick={() => setApproval(c.id, true)} className="font-medium text-green-600 hover:underline">Approve</button>
                    )}
                    <button onClick={() => deleteComment(c.id)} className="font-medium text-red-600 hover:underline">Delete</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recent orders */}
      {data && data.recentOrders.length > 0 && (
        <div className="mt-8 rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-bold text-gray-900">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs font-semibold text-primary-600 hover:underline">View All</Link>
          </div>
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Order</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.recentOrders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{o.orderNumber || o.id}</td>
                  <td className="px-4 py-3 text-gray-900">{o.customerName}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">${(o.total || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                      {o.orderStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
