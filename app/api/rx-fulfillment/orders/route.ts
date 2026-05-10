// Place + list Rx-fulfillment orders.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createOrder,
  listOrdersForPatient,
  listOrdersForPharmacy,
  type OrderLine,
} from "@/lib/rx-fulfillment/order-store";
import { decrementStock } from "@/lib/rx-fulfillment/pharmacy-stock-store";
import { findUserById } from "@/lib/users-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const view = url.searchParams.get("view") || "patient";
  const pharmacyId = url.searchParams.get("pharmacyId");
  if (view === "pharmacy" && pharmacyId) {
    return NextResponse.json({ orders: listOrdersForPharmacy(pharmacyId) });
  }
  return NextResponse.json({ orders: listOrdersForPatient(userId) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const user = findUserById(userId);
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  const body = await req.json();
  const pharmacyId = String(body.pharmacyId || "").trim();
  const pharmacyName = String(body.pharmacyName || "").trim();
  const deliveryAddress = String(body.deliveryAddress || "").trim();
  if (!pharmacyId || !pharmacyName) {
    return NextResponse.json({ error: "missing_pharmacy" }, { status: 400 });
  }
  if (!deliveryAddress) {
    return NextResponse.json({ error: "missing_address" }, { status: 400 });
  }
  const lines: OrderLine[] = Array.isArray(body.lines) ? body.lines : [];
  if (lines.length === 0) return NextResponse.json({ error: "no_lines" }, { status: 400 });

  // Reserve stock — decrement each stocked line. We don't roll back
  // on partial decrement errors; the demo stays simple.
  for (const ln of lines) {
    if (ln.stockId) decrementStock(ln.stockId, ln.quantity);
  }

  const order = createOrder({
    patientUserId: userId,
    patientName: user.name,
    patientPhone: user.phone,
    deliveryAddress,
    pharmacyId,
    pharmacyName,
    rxId: body.rxId,
    lines,
    estimatedDeliveryHours: typeof body.estimatedDeliveryHours === "number" ? body.estimatedDeliveryHours : 24,
    deliveryFeeRupees: typeof body.deliveryFeeRupees === "number" ? body.deliveryFeeRupees : 0,
    marketplaceFeePct: typeof body.marketplaceFeePct === "number" ? body.marketplaceFeePct : undefined,
  });

  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ order });
}
