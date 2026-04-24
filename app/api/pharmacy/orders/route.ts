// Pharmacy-order API: create + list-my-orders.
//
// POST is patient-side: after they pick a store in PharmacyPicker, we
// create the order with a pickup PIN and return it so the UI can show
// the order number + PIN to the patient immediately.
//
// GET is also patient-side: returns orders for the signed-in patient
// (admins see theirs too — vendor views live under /api/vendors/me/*).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createPharmacyOrder,
  listPharmacyOrdersByPatient,
} from "@/lib/pharmacy-orders-store";
import { getStoreLocation } from "@/lib/vendor-inventory-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orders = listPharmacyOrdersByPatient(email);
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; name?: string } | undefined;
  if (!user?.email) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const storeId = String(body.storeId || "").trim();
  const fulfillment = body.fulfillment === "delivery" ? "delivery" : "pickup";
  const lines = Array.isArray(body.lines) ? body.lines : [];
  const store = getStoreLocation(storeId);
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });
  if (!store.active) return NextResponse.json({ error: "Store is not accepting orders" }, { status: 409 });
  if (fulfillment === "pickup" && !store.pickup) {
    return NextResponse.json({ error: "Store doesn't support pickup" }, { status: 409 });
  }
  if (fulfillment === "delivery" && !store.delivery) {
    return NextResponse.json({ error: "Store doesn't support delivery" }, { status: 409 });
  }

  const cleanLines = (lines as Array<Record<string, unknown>>)
    .map((l) => ({
      rxLabel: String(l.rxLabel || "").trim(),
      medicineId: typeof l.medicineId === "string" ? l.medicineId : null,
      catalogName: typeof l.catalogName === "string" ? l.catalogName : undefined,
      brandLabel: typeof l.brandLabel === "string" ? l.brandLabel : undefined,
      strength: typeof l.strength === "string" ? l.strength : undefined,
      unit: typeof l.unit === "string" ? l.unit : undefined,
      priceInr: Number(l.priceInr) || 0,
      quantity: typeof l.quantity === "number" && l.quantity > 0 ? l.quantity : 1,
    }))
    .filter((l) => l.rxLabel && l.priceInr >= 0);

  if (cleanLines.length === 0) {
    return NextResponse.json({ error: "At least one in-stock item required" }, { status: 400 });
  }

  const order = createPharmacyOrder({
    patientEmail: user.email,
    patientName: user.name || user.email,
    patientPhone: typeof body.patientPhone === "string" ? body.patientPhone : undefined,
    storeId,
    vendorId: store.vendorId,
    roomId: typeof body.roomId === "string" ? body.roomId : undefined,
    doctorName: typeof body.doctorName === "string" ? body.doctorName : undefined,
    fulfillment,
    deliveryAddress:
      typeof body.deliveryAddress === "string" ? body.deliveryAddress : undefined,
    lines: cleanLines,
  });

  return NextResponse.json({ order }, { status: 201 });
}
