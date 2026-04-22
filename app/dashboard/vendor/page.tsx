"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Vendor {
  id: string;
  name: string;
  status: "pending" | "approved" | "suspended" | "rejected";
  commissionPercent: number;
  stripeAccountId?: string;
  stripePayoutsEnabled?: boolean;
  stripeDetailsSubmitted?: boolean;
}
interface VendorProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: string;
}

export default function VendorDashboard() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/login?next=/dashboard/vendor");
  }, [authStatus, router]);

  const [stripeBusy, setStripeBusy] = useState(false);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    (async () => {
      const vRes = await fetch("/api/vendors/me");
      const vData = await vRes.json();
      setVendor(vData.vendor);
      if (vData.vendor?.status === "approved") {
        const pRes = await fetch("/api/vendors/me/products");
        const pData = await pRes.json();
        setProducts(pData.products || []);
        // If we just came back from onboarding, sync state with Stripe.
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
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Could not start Stripe onboarding");
      }
    } finally { setStripeBusy(false); }
  };

  if (loading || authStatus !== "authenticated") return <div className="p-12 text-center text-gray-500">Loading…</div>;

  if (!vendor) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">You&apos;re not registered as a vendor yet</h1>
        <p className="mt-2 text-gray-600">Apply to sell your pharmacy&apos;s products on OduDoc.</p>
        <Link href="/sell" className="btn-primary mt-6 inline-block">Apply to sell</Link>
      </div>
    );
  }

  if (vendor.status !== "approved") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{vendor.name}</h1>
        <p className="mt-2 text-gray-600">Your vendor application is currently <strong>{vendor.status}</strong>.</p>
        <Link href="/sell" className="mt-6 inline-block text-sm text-primary-600 hover:underline">View application →</Link>
      </div>
    );
  }

  const active = products.filter((p) => p.status === "Active").length;
  const oos = products.filter((p) => p.status === "Out of Stock").length;
  const totalStockValue = products.reduce((s, p) => s + p.price * p.stock, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:flex-wrap md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{vendor.name}</h1>
            <p className="mt-1 text-sm text-gray-500">Vendor dashboard · Platform commission {vendor.commissionPercent}%</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/vendor/analytics" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Analytics
            </Link>
            <Link href="/dashboard/vendor/orders" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              View orders
            </Link>
            <Link href="/dashboard/vendor/payouts" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Payouts
            </Link>
            <Link href="/dashboard/vendor/products/new" className="btn-primary !py-2 !text-sm">
              + Add product
            </Link>
          </div>
        </div>

        {/* Stripe Connect status card */}
        {!vendor.stripePayoutsEnabled && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {vendor.stripeAccountId
                  ? "Finish connecting your Stripe payout account"
                  : "Connect a Stripe payout account to receive automatic payouts"}
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Until Stripe onboarding is complete, payouts are tracked in your ledger and released manually by OduDoc.
              </p>
            </div>
            <button onClick={startStripeOnboarding} disabled={stripeBusy}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
              {stripeBusy ? "Opening Stripe…" : vendor.stripeAccountId ? "Resume onboarding" : "Connect Stripe"}
            </button>
          </div>
        )}
        {vendor.stripePayoutsEnabled && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-3 text-sm text-green-900">
            ✓ Stripe payouts enabled. Future paid orders will be settled automatically.
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Products listed" value={String(products.length)} />
          <StatCard label="Active" value={String(active)} />
          <StatCard label="Out of stock" value={String(oos)} />
          <StatCard label="Stock value" value={`$${totalStockValue.toFixed(0)}`} />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Your products</h2>
            <Link href="/dashboard/vendor/products/new" className="text-sm font-medium text-primary-600 hover:underline">+ Add new</Link>
          </div>

          {products.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">No products yet. Add your first listing to start selling.</p>
          ) : (
            <div className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="py-2">Name</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Price</th>
                  <th className="py-2">Stock</th>
                  <th className="py-2">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="py-3 text-gray-600">{p.category}</td>
                    <td className="py-3 text-gray-900">${p.price}</td>
                    <td className="py-3 text-gray-900">{p.stock}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        p.status === "Active" ? "bg-green-50 text-green-700"
                          : p.status === "Out of Stock" ? "bg-rose-50 text-rose-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>{p.status}</span>
                    </td>
                    <td className="py-3 text-right">
                      <Link href={`/dashboard/vendor/products/${p.id}`} className="text-xs font-medium text-primary-600 hover:underline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}
