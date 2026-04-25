// /api/orders/mobile
//
// Mobile pharmacy orders. Identity comes from the JWT — both list and
// create refuse to take email/name/phone from the request body.
//
// GET  → list the caller's orders (most recent first)
// POST → place an order. Items carry productId so stock reserves work.
//
// Scope for v1: COD only (paymentStatus defaults to "Pending"). Online
// payment for orders arrives in a later pass — reuse the Stripe pattern
// from /api/payments/mobile/{create-order,verify} and key off the Order
// id instead of a booking id.

import { NextRequest, NextResponse } from "next/server";
import {
  listOrders,
  createOrder,
  type OrderItem,
} from "@/lib/orders-store";
import { reserveStock, getProductById } from "@/lib/products-store";
import { getVendorById } from "@/lib/vendors-store";
import { recordOrderPayouts } from "@/lib/payouts-store";
import { findUserByEmail, reloadUsers } from "@/lib/users-store";
import { sendOrderConfirmationEmail, sendVendorNewOrderEmail } from "@/lib/email";
import { requireMobileUser } from "@/lib/mobile-auth";
import { sendToUser } from "@/lib/fcm";
import { parseJson, z, nonEmptyString } from "@/lib/validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const CreateOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1).max(64),
        quantity: z.number().int().positive().max(100),
      })
    )
    .min(1)
    .max(50),
  shippingAddress: nonEmptyString.max(500),
  notes: z.string().max(500).optional(),
  // Patient can override phone on a per-order basis (delivery contact)
  // without touching their profile.
  phone: z.string().trim().max(32).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "patient") {
    return NextResponse.json(
      { error: "wrong_role", message: "Only patients can view their orders here." },
      { status: 403 }
    );
  }
  try {
    const orders = listOrders({ email: auth.email });
    return NextResponse.json({ orders });
  } catch (err) {
    log.error("mobile-orders list error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "patient") {
    return NextResponse.json(
      { error: "wrong_role", message: "Only patients can place orders." },
      { status: 403 }
    );
  }

  const parsed = await parseJson(request, CreateOrderSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed;

  try {
    await reloadUsers();
    const patient = findUserByEmail(auth.email);
    if (!patient) {
      return NextResponse.json({ error: "patient_not_found" }, { status: 404 });
    }

    // Resolve each cart line against the live product so we can trust
    // name + price server-side. Client-supplied price is ignored.
    const resolved: OrderItem[] = [];
    const missing: string[] = [];
    for (const line of body.items) {
      const p = getProductById(line.productId);
      if (!p || p.status !== "Active") {
        missing.push(line.productId);
        continue;
      }
      resolved.push({
        productId: p.id,
        name: p.name,
        price: p.price,
        quantity: line.quantity,
        vendorId: p.vendorId,
        vendorName: p.vendorName,
      });
    }
    if (missing.length) {
      return NextResponse.json(
        {
          error: "items_unavailable",
          message: "Some items in your cart are no longer available.",
          missing,
        },
        { status: 409 }
      );
    }

    // Reserve stock for tracked products.
    const stockCheck = reserveStock(
      resolved.map((it) => ({ productId: it.productId!, quantity: it.quantity }))
    );
    if (!stockCheck.ok) {
      return NextResponse.json(
        {
          error: "out_of_stock",
          message: "Some items are out of stock.",
          unavailable: stockCheck.unavailable,
        },
        { status: 409 }
      );
    }

    // Geo-restriction: country-bound vendors only ship to their country.
    // Mirrors the logic in /api/orders to avoid accepting orders we'll
    // immediately have to cancel.
    const shippingLower = body.shippingAddress.toLowerCase();
    const blocked: Array<{ name: string; vendorCountry: string }> = [];
    for (const it of resolved) {
      if (!it.vendorId) continue;
      const vendor = getVendorById(it.vendorId);
      if (!vendor) continue;
      const vc = vendor.country?.trim();
      if (!vc || vc.toLowerCase() === "global") continue;
      if (!shippingLower.includes(vc.toLowerCase())) {
        blocked.push({ name: it.name, vendorCountry: vc });
      }
    }
    if (blocked.length > 0) {
      return NextResponse.json(
        {
          error: "shipping_restricted",
          message:
            `This order can't be shipped to the address you entered. ` +
            blocked
              .map((b) => `"${b.name}" only ships within ${b.vendorCountry}`)
              .join("; ") +
            `.`,
          blocked,
        },
        { status: 409 }
      );
    }

    const shipping = 0; // flat — keep delivery free for v1

    const order = createOrder({
      customer: patient.name,
      email: patient.email,
      phone: body.phone || patient.phone,
      items: resolved,
      shipping,
      shippingAddress: body.shippingAddress,
      notes: body.notes,
      paymentStatus: "Pending", // COD — paid on delivery
    });

    // No payouts yet (Pending payment) — recorded on delivery.
    void recordOrderPayouts;

    // Fire-and-forget confirmation emails (best-effort).
    sendOrderConfirmationEmail({
      to: order.email,
      customerName: order.customer,
      orderNumber: order.orderNumber,
      items: order.items,
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total,
      shippingAddress: order.shippingAddress,
    }).catch((err) => log.error("mobile-orders confirmation email failed", err));

    // Per-vendor notifications.
    const byVendor = new Map<string, { items: OrderItem[]; subtotal: number }>();
    for (const it of order.items) {
      if (!it.vendorId) continue;
      const bucket = byVendor.get(it.vendorId) || { items: [], subtotal: 0 };
      bucket.items.push(it);
      bucket.subtotal += it.price * it.quantity;
      byVendor.set(it.vendorId, bucket);
    }
    byVendor.forEach(({ items: vItems, subtotal }, vendorId) => {
      const vendor = getVendorById(vendorId);
      if (!vendor?.ownerEmail) return;
      sendVendorNewOrderEmail({
        to: vendor.ownerEmail,
        ownerName: vendor.ownerName,
        vendorName: vendor.name,
        orderNumber: order.orderNumber,
        items: vItems.map((it) => ({ name: it.name, quantity: it.quantity, price: it.price })),
        vendorSubtotal: Math.round(subtotal * 100) / 100,
        shippingAddress: order.shippingAddress,
      }).catch((err) => log.error("mobile-orders vendor notify failed", err));
    });

    // Confirm via push too — the email may be filtered to spam.
    void sendToUser(patient.id, {
      title: "Order placed",
      body: `${order.orderNumber} · ₹${order.total.toFixed(0)} · pay on delivery`,
      deepLink: `order/${order.id}`,
      channel: "orders",
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    log.error("mobile-orders create error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
