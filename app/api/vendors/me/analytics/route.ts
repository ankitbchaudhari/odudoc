import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVendorByEmail } from "@/lib/vendors-store";
import { listOrdersByVendor } from "@/lib/orders-store";
import { listPayouts } from "@/lib/payouts-store";

export const runtime = "nodejs";

// GET /api/vendors/me/analytics?days=30
//   Computes lightweight analytics for the signed-in vendor:
//     - Revenue timeseries (per-day, from orders that include this vendor)
//     - Top-selling products (by units sold)
//     - Order count / status distribution
//     - Payout totals (pending vs paid)
//
// All math is local to this vendor's items — no cross-vendor leakage.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vendor = getVendorByEmail(email);
  if (!vendor) return NextResponse.json({ error: "Not a vendor" }, { status: 404 });
  if (vendor.status !== "approved") {
    return NextResponse.json({ error: "Vendor not approved" }, { status: 403 });
  }

  const days = Math.max(7, Math.min(Number(req.nextUrl.searchParams.get("days") || 30), 180));
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const orders = listOrdersByVendor(vendor.id);
  const payouts = listPayouts({ vendorId: vendor.id });

  // Build a day bucket [YYYY-MM-DD] → {revenue, orders, units}.
  const bucket = new Map<string, { revenue: number; orders: number; units: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    bucket.set(d.toISOString().slice(0, 10), { revenue: 0, orders: 0, units: 0 });
  }

  // Product aggregates.
  const productAgg = new Map<string, { name: string; units: number; revenue: number }>();
  const statusAgg = new Map<string, number>();
  let totalRevenue = 0;
  let totalUnits = 0;
  let totalOrders = 0;

  for (const o of orders) {
    const day = o.createdAt.slice(0, 10);
    const b = bucket.get(day);
    const orderDate = new Date(o.createdAt);
    const withinWindow = orderDate >= since;
    if (withinWindow && b) {
      b.orders += 1;
      b.revenue += o.vendorSubtotal;
      b.units += o.items.reduce((s, it) => s + it.quantity, 0);
    }
    if (withinWindow) {
      totalRevenue += o.vendorSubtotal;
      totalOrders += 1;
      statusAgg.set(o.orderStatus, (statusAgg.get(o.orderStatus) || 0) + 1);
      for (const it of o.items) {
        const key = it.productId || it.name;
        const cur = productAgg.get(key) || { name: it.name, units: 0, revenue: 0 };
        cur.units += it.quantity;
        cur.revenue += it.price * it.quantity;
        productAgg.set(key, cur);
        totalUnits += it.quantity;
      }
    }
  }

  const timeseries = Array.from(bucket.entries()).map(([date, v]) => ({
    date,
    revenue: Math.round(v.revenue * 100) / 100,
    orders: v.orders,
    units: v.units,
  }));

  const topProducts = Array.from(productAgg.values())
    .sort((a, b) => b.units - a.units)
    .slice(0, 5)
    .map((p) => ({
      name: p.name,
      units: p.units,
      revenue: Math.round(p.revenue * 100) / 100,
    }));

  const statusBreakdown = Array.from(statusAgg.entries()).map(([status, count]) => ({
    status,
    count,
  }));

  const pendingPayout = payouts
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + p.netAmount, 0);
  const paidPayout = payouts
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.netAmount, 0);

  return NextResponse.json({
    window: { days, from: since.toISOString(), to: new Date().toISOString() },
    totals: {
      revenue: Math.round(totalRevenue * 100) / 100,
      orders: totalOrders,
      units: totalUnits,
      avgOrderValue:
        totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0,
      pendingPayout: Math.round(pendingPayout * 100) / 100,
      paidPayout: Math.round(paidPayout * 100) / 100,
    },
    timeseries,
    topProducts,
    statusBreakdown,
  });
}
