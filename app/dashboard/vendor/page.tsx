"use client";

// Modern vendor dashboard.
//
// Consolidates everything a pharmacy owner wants to see at a glance:
//   - greeting + store identity + commission
//   - Stripe onboarding status
//   - KPI row (revenue / orders / AOV / units / pending payout / active listings)
//   - 30-day revenue sparkline
//   - order-status distribution
//   - low-stock alerts
//   - top-selling products
//   - recent orders feed
//   - quick-action grid
//   - onboarding checklist for new vendors
//
// Everything reuses the existing /api/vendors/me/* endpoints — no new
// backend. All layout is client-side + inline SVG for the charts so we
// don't add a chart library dependency.

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Vendor {
  id: string;
  name: string;
  ownerName?: string;
  status: "pending" | "approved" | "suspended" | "rejected";
  commissionPercent: number;
  stripeAccountId?: string;
  stripePayoutsEnabled?: boolean;
  stripeDetailsSubmitted?: boolean;
  phone?: string;
  city?: string;
  country?: string;
}
interface VendorProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  image?: string;
}
interface VendorOrder {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  orderStatus: string;
  paymentStatus: string;
  vendorSubtotal: number;
  createdAt: string;
  items: { name: string; quantity: number; price: number }[];
}
interface AnalyticsResponse {
  totals: {
    revenue: number;
    orders: number;
    units: number;
    avgOrderValue: number;
    pendingPayout: number;
    paidPayout: number;
  };
  timeseries: { date: string; revenue: number; orders: number; units: number }[];
  topProducts: { name: string; units: number; revenue: number }[];
  statusBreakdown: { status: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800 ring-amber-200",
  Processing: "bg-sky-100 text-sky-800 ring-sky-200",
  Shipped: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  Delivered: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  Cancelled: "bg-rose-100 text-rose-800 ring-rose-200",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function money(n: number): string {
  if (n >= 1000)
    return "$" + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return "$" + n.toFixed(0);
}

export default function VendorDashboard() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [stripeBusy, setStripeBusy] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated")
      router.replace("/login?next=/dashboard/vendor");
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    (async () => {
      const vRes = await fetch("/api/vendors/me");
      const vData = await vRes.json();
      setVendor(vData.vendor);
      if (vData.vendor?.status === "approved") {
        const [pRes, oRes, aRes] = await Promise.all([
          fetch("/api/vendors/me/products"),
          fetch("/api/vendors/me/orders"),
          fetch("/api/vendors/me/analytics?days=30"),
        ]);
        const [pData, oData, aData] = await Promise.all([
          pRes.json(),
          oRes.json(),
          aRes.json(),
        ]);
        setProducts(pData.products || []);
        setOrders(oData.orders || []);
        setAnalytics(aData || null);
        if (typeof window !== "undefined") {
          const qs = new URLSearchParams(window.location.search);
          if (qs.get("stripe") === "return" || vData.vendor.stripeAccountId) {
            fetch("/api/vendors/me/stripe/refresh")
              .then((r) => r.json())
              .then((d) => { if (d.vendor) setVendor(d.vendor); })
              .catch(() => {});
          }
        }
      }
      setLoading(false);
    })();
  }, [authStatus]);

  const startStripeOnboarding = async () => {
    setStripeBusy(true);
    try {
      const res = await fetch("/api/vendors/me/stripe/onboard", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) window.location.href = data.url;
      else alert(data.error || "Could not start Stripe onboarding");
    } finally {
      setStripeBusy(false);
    }
  };

  const active = useMemo(
    () => products.filter((p) => p.status === "Active").length,
    [products],
  );
  const oos = useMemo(
    () => products.filter((p) => p.status === "Out of Stock").length,
    [products],
  );
  const lowStock = useMemo(
    () =>
      products
        .filter((p) => p.stock > 0 && p.stock <= 5)
        .sort((a, b) => a.stock - b.stock),
    [products],
  );
  const totalStockValue = useMemo(
    () => products.reduce((s, p) => s + p.price * p.stock, 0),
    [products],
  );
  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);
  const pendingOrders = useMemo(
    () =>
      orders.filter(
        (o) => o.orderStatus === "Pending" || o.orderStatus === "Processing",
      ).length,
    [orders],
  );

  if (loading || authStatus !== "authenticated")
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-gradient-to-b from-indigo-50/40 via-white to-white">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
          <p className="text-sm">Loading your dashboard…</p>
        </div>
      </div>
    );

  if (!vendor) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          You&apos;re not registered as a vendor yet
        </h1>
        <p className="mt-2 text-gray-600">
          Apply to sell your pharmacy&apos;s products on OduDoc.
        </p>
        <Link href="/sell" className="btn-primary mt-6 inline-block">
          Apply to sell
        </Link>
      </div>
    );
  }

  if (vendor.status !== "approved") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{vendor.name}</h1>
        <p className="mt-2 text-gray-600">
          Your vendor application is currently <strong>{vendor.status}</strong>.
        </p>
        <Link
          href="/sell"
          className="mt-6 inline-block text-sm text-primary-600 hover:underline"
        >
          View application →
        </Link>
      </div>
    );
  }

  const totals = analytics?.totals;
  const series = analytics?.timeseries || [];
  const maxRevenue = Math.max(1, ...series.map((d) => d.revenue));
  const topProducts = analytics?.topProducts || [];
  const statusBreakdown = analytics?.statusBreakdown || [];

  // Onboarding checklist
  const steps = [
    {
      done: true,
      label: "Vendor application approved",
    },
    {
      done: Boolean(vendor.stripePayoutsEnabled),
      label: "Stripe payouts connected",
      href: !vendor.stripePayoutsEnabled ? "#stripe" : undefined,
    },
    {
      done: products.length > 0,
      label: "First product listed",
      href: products.length === 0 ? "/dashboard/vendor/products/new" : undefined,
    },
    {
      done: orders.length > 0,
      label: "First order received",
    },
  ];
  const stepsDone = steps.filter((s) => s.done).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 via-white to-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                {greeting()}
                {vendor.ownerName ? `, ${vendor.ownerName.split(" ")[0]}` : ""}
              </p>
              <h1 className="mt-1 truncate text-3xl font-bold sm:text-4xl">
                {vendor.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/80">
                <span>Commission {vendor.commissionPercent}%</span>
                {vendor.city && (
                  <span className="flex items-center gap-1">
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                    </svg>
                    {vendor.city}
                    {vendor.country ? `, ${vendor.country}` : ""}
                  </span>
                )}
                {vendor.stripePayoutsEnabled ? (
                  <span className="rounded-full bg-emerald-400/30 px-2 py-0.5 font-semibold ring-1 ring-emerald-200/40">
                    ✓ Payouts live
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-400/30 px-2 py-0.5 font-semibold ring-1 ring-amber-200/40">
                    Stripe pending
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/vendor/products/new"
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow hover:bg-indigo-50"
              >
                + Add product
              </Link>
              <Link
                href="/dashboard/vendor/orders"
                className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/20"
              >
                Orders
                {pendingOrders > 0 && (
                  <span className="ml-1.5 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                    {pendingOrders}
                  </span>
                )}
              </Link>
              <Link
                href="/dashboard/vendor/analytics"
                className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/20"
              >
                Analytics
              </Link>
            </div>
          </div>
        </div>

        {/* Stripe Connect status card */}
        {!vendor.stripePayoutsEnabled && (
          <div
            id="stripe"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {vendor.stripeAccountId
                    ? "Finish connecting your Stripe payout account"
                    : "Connect a Stripe payout account to receive automatic payouts"}
                </p>
                <p className="mt-1 text-xs text-amber-800">
                  Until Stripe onboarding is complete, payouts are tracked in
                  your ledger and released manually by OduDoc.
                </p>
              </div>
            </div>
            <button
              onClick={startStripeOnboarding}
              disabled={stripeBusy}
              className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-amber-700 disabled:opacity-60"
            >
              {stripeBusy
                ? "Opening Stripe…"
                : vendor.stripeAccountId
                ? "Resume onboarding"
                : "Connect Stripe"}
            </button>
          </div>
        )}

        {/* KPIs */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi
            label="Revenue · 30d"
            value={totals ? money(totals.revenue) : "$0"}
            tone="indigo"
            icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 9v1"
          />
          <Kpi
            label="Orders · 30d"
            value={String(totals?.orders ?? 0)}
            tone="sky"
            icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
          <Kpi
            label="Avg order"
            value={totals ? money(totals.avgOrderValue) : "$0"}
            tone="violet"
            icon="M3 3v18h18M7 14l4-4 4 4 5-5"
          />
          <Kpi
            label="Units sold"
            value={String(totals?.units ?? 0)}
            tone="emerald"
            icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
          <Kpi
            label="Pending payout"
            value={totals ? money(totals.pendingPayout) : "$0"}
            tone="amber"
            icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <Kpi
            label="Active listings"
            value={`${active}/${products.length}`}
            tone="rose"
            icon="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </div>

        {/* Revenue chart + status breakdown */}
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
                  Revenue · last 30 days
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Your vendor subtotal per day
                </p>
              </div>
              <Link
                href="/dashboard/vendor/analytics"
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Full analytics →
              </Link>
            </div>
            <SparkBar series={series} maxRevenue={maxRevenue} />
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
              Order status
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">Last 30 days</p>
            <div className="mt-4 space-y-2">
              {statusBreakdown.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-400">
                  No orders yet in this window.
                </p>
              ) : (
                statusBreakdown.map((s) => {
                  const total = statusBreakdown.reduce(
                    (x, y) => x + y.count,
                    0,
                  );
                  const pct = total > 0 ? (s.count / total) * 100 : 0;
                  return (
                    <div key={s.status}>
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                            STATUS_COLORS[s.status] || "bg-gray-100 text-gray-700 ring-gray-200"
                          }`}
                        >
                          {s.status}
                        </span>
                        <span className="font-semibold text-gray-700">
                          {s.count} · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            href="/dashboard/vendor/products/new"
            label="Add product"
            desc="List a new item for sale"
            emoji="🧪"
            tone="from-indigo-500 to-violet-500"
          />
          <QuickAction
            href="/dashboard/vendor/orders"
            label="Fulfill orders"
            desc={`${pendingOrders} pending`}
            emoji="📦"
            tone="from-sky-500 to-cyan-500"
          />
          <QuickAction
            href="/dashboard/vendor/payouts"
            label="Payouts"
            desc={`${totals ? money(totals.pendingPayout) : "$0"} pending`}
            emoji="💸"
            tone="from-emerald-500 to-teal-500"
          />
          <QuickAction
            href="/dashboard/vendor/analytics"
            label="Analytics"
            desc="Deep dive by product"
            emoji="📊"
            tone="from-amber-500 to-orange-500"
          />
        </div>

        {/* Main content grid */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Left: recent orders + products */}
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
                  Recent orders
                </h2>
                <Link
                  href="/dashboard/vendor/orders"
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  View all →
                </Link>
              </div>
              {recentOrders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
                  <p className="text-4xl">📭</p>
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    No orders yet
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    List more products and share your store to land your first
                    sale.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {recentOrders.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {o.orderNumber}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                              STATUS_COLORS[o.orderStatus] ||
                              "bg-gray-100 text-gray-700 ring-gray-200"
                            }`}
                          >
                            {o.orderStatus}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {o.customer} · {o.items.length} item
                          {o.items.length > 1 ? "s" : ""} · {relTime(o.createdAt)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-gray-900">
                        ${o.vendorSubtotal.toFixed(2)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
                  Your products
                </h2>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-500">
                    Stock value {money(totalStockValue)}
                  </span>
                  <Link
                    href="/dashboard/vendor/products/new"
                    className="font-semibold text-indigo-600 hover:underline"
                  >
                    + Add new
                  </Link>
                </div>
              </div>

              {products.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
                  <p className="text-4xl">🛍️</p>
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    No products yet
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Add your first listing to start selling.
                  </p>
                  <Link
                    href="/dashboard/vendor/products/new"
                    className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    Add a product
                  </Link>
                </div>
              ) : (
                <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                        <th className="py-2">Name</th>
                        <th className="py-2">Category</th>
                        <th className="py-2">Price</th>
                        <th className="py-2">Stock</th>
                        <th className="py-2">Status</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {products.slice(0, 10).map((p) => (
                        <tr
                          key={p.id}
                          className="border-b border-gray-50 transition hover:bg-gray-50/50"
                        >
                          <td className="py-3 font-medium text-gray-900">
                            {p.name}
                          </td>
                          <td className="py-3 text-gray-600">{p.category}</td>
                          <td className="py-3 text-gray-900">${p.price}</td>
                          <td className="py-3 text-gray-900">
                            <span
                              className={
                                p.stock === 0
                                  ? "font-semibold text-rose-600"
                                  : p.stock <= 5
                                  ? "font-semibold text-amber-600"
                                  : ""
                              }
                            >
                              {p.stock}
                            </span>
                          </td>
                          <td className="py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                                p.status === "Active"
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                  : p.status === "Out of Stock"
                                  ? "bg-rose-50 text-rose-700 ring-rose-200"
                                  : "bg-gray-100 text-gray-700 ring-gray-200"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <Link
                              href={`/dashboard/vendor/products/${p.id}`}
                              className="text-xs font-semibold text-indigo-600 hover:underline"
                            >
                              Edit
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {products.length > 10 && (
                    <p className="mt-3 text-center text-xs text-gray-500">
                      Showing 10 of {products.length}. Open the Products area
                      for the full list.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: top products + low stock + checklist */}
          <div className="space-y-4">
            {stepsDone < steps.length && (
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
                    Getting started
                  </h2>
                  <span className="text-xs font-semibold text-gray-500">
                    {stepsDone}/{steps.length}
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all"
                    style={{ width: `${(stepsDone / steps.length) * 100}%` }}
                  />
                </div>
                <ul className="mt-4 space-y-2">
                  {steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                          s.done
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {s.done ? "✓" : ""}
                      </span>
                      {s.href && !s.done ? (
                        <Link
                          href={s.href}
                          className="text-gray-700 hover:text-indigo-600 hover:underline"
                        >
                          {s.label}
                        </Link>
                      ) : (
                        <span className={s.done ? "text-gray-500 line-through" : "text-gray-700"}>
                          {s.label}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
                  Top sellers
                </h2>
                <span className="text-[10px] text-gray-400">last 30d</span>
              </div>
              {topProducts.length === 0 ? (
                <p className="mt-4 text-center text-xs text-gray-400">
                  No sales yet.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {topProducts.map((t, i) => (
                    <li key={t.name} className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {t.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t.units} unit{t.units !== 1 ? "s" : ""} · $
                          {t.revenue.toFixed(2)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
                Inventory alerts
              </h2>
              {oos === 0 && lowStock.length === 0 ? (
                <p className="mt-3 text-xs text-gray-500">
                  ✅ All good — no low-stock or out-of-stock items.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {oos > 0 && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs">
                      <p className="font-semibold text-rose-900">
                        {oos} product{oos > 1 ? "s" : ""} out of stock
                      </p>
                      <Link
                        href="/dashboard/vendor/products"
                        className="mt-1 inline-block font-semibold text-rose-700 hover:underline"
                      >
                        Restock now →
                      </Link>
                    </div>
                  )}
                  {lowStock.length > 0 && (
                    <ul className="space-y-2">
                      {lowStock.slice(0, 5).map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs"
                        >
                          <Link
                            href={`/dashboard/vendor/products/${p.id}`}
                            className="min-w-0 flex-1 truncate font-medium text-gray-800 hover:underline"
                          >
                            {p.name}
                          </Link>
                          <span className="shrink-0 font-bold text-amber-800">
                            {p.stock} left
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
                Store details
              </h2>
              <dl className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Commission</dt>
                  <dd className="font-semibold text-gray-900">
                    {vendor.commissionPercent}%
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Stripe</dt>
                  <dd className="font-semibold text-gray-900">
                    {vendor.stripePayoutsEnabled
                      ? "Connected"
                      : vendor.stripeAccountId
                      ? "Pending"
                      : "Not connected"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Owner</dt>
                  <dd className="truncate font-semibold text-gray-900">
                    {vendor.ownerName || "—"}
                  </dd>
                </div>
                {vendor.phone && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500">Phone</dt>
                    <dd className="truncate font-semibold text-gray-900">
                      {vendor.phone}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------ components ------------------------------

function Kpi({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: string;
  tone: "indigo" | "sky" | "violet" | "emerald" | "amber" | "rose";
}) {
  const tones: Record<typeof tone, string> = {
    indigo: "from-indigo-500 to-violet-500",
    sky: "from-sky-500 to-cyan-500",
    violet: "from-violet-500 to-fuchsia-500",
    emerald: "from-emerald-500 to-teal-500",
    amber: "from-amber-500 to-orange-500",
    rose: "from-rose-500 to-pink-500",
  };
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md">
      <div className="flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm ${tones[tone]}`}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </p>
      </div>
      <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function QuickAction({
  href,
  label,
  desc,
  emoji,
  tone,
}: {
  href: string;
  label: string;
  desc: string;
  emoji: string;
  tone: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-2xl text-white shadow-sm ${tone}`}
      >
        <span>{emoji}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-900">{label}</p>
        <p className="truncate text-xs text-gray-500">{desc}</p>
      </div>
      <svg
        className="h-4 w-4 text-gray-300 transition group-hover:translate-x-1 group-hover:text-indigo-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

function SparkBar({
  series,
  maxRevenue,
}: {
  series: { date: string; revenue: number; orders: number }[];
  maxRevenue: number;
}) {
  if (series.length === 0)
    return <p className="py-8 text-center text-xs text-gray-400">No data.</p>;
  return (
    <div>
      <div className="flex h-32 items-end gap-[3px]">
        {series.map((d) => {
          const h = Math.max(2, (d.revenue / maxRevenue) * 100);
          const active = d.revenue > 0;
          return (
            <div
              key={d.date}
              className="group relative flex-1"
              title={`${d.date} · $${d.revenue.toFixed(2)} · ${d.orders} orders`}
            >
              <div
                className={`w-full rounded-t transition ${
                  active
                    ? "bg-gradient-to-t from-indigo-500 to-violet-500 group-hover:from-indigo-600 group-hover:to-violet-600"
                    : "bg-gray-100"
                }`}
                style={{ height: `${h}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
        <span>{series[0]?.date}</span>
        <span>peak {money(maxRevenue)}</span>
        <span>{series[series.length - 1]?.date}</span>
      </div>
    </div>
  );
}
