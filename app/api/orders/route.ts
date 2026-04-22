import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listOrders,
  createOrder,
  type OrderStatus,
} from "@/lib/orders-store";
import { reserveStock, getProductById } from "@/lib/products-store";
import { recordOrderPayouts } from "@/lib/payouts-store";
import { sendOrderConfirmationEmail, sendVendorNewOrderEmail } from "@/lib/email";
import { getVendorById } from "@/lib/vendors-store";

import { log } from "@/lib/log";
export const runtime = "nodejs";

function canManage(role: string | undefined): boolean {
  return role === "admin" || role === "staff";
}

// GET /api/orders
//   - admin/staff: see everything (optionally filter by ?status=)
//   - patient: only their own orders (by session email)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const email = session?.user?.email || undefined;

  const statusParam = req.nextUrl.searchParams.get("status") as
    | OrderStatus
    | "All"
    | null;

  if (canManage(role)) {
    const orders = listOrders({ status: statusParam || undefined });
    return NextResponse.json({ orders });
  }

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orders = listOrders({ email, status: statusParam || undefined });
  return NextResponse.json({ orders });
}

// POST /api/orders — customer places an order
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const sessionEmail = session?.user?.email;

  let body: {
    customer?: string;
    email?: string;
    phone?: string;
    items?: Array<{ productId?: string; name: string; quantity: number; price: number }>;
    shipping?: number;
    shippingAddress?: string;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }
  if (!body.customer || !body.email || !body.phone || !body.shippingAddress) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Reserve stock for any items that reference a real product id.
  const stockItems = items
    .filter((it) => it.productId)
    .map((it) => ({ productId: it.productId!, quantity: it.quantity }));

  if (stockItems.length) {
    const r = reserveStock(stockItems);
    if (!r.ok) {
      return NextResponse.json(
        { error: "Some items are out of stock", unavailable: r.unavailable },
        { status: 409 }
      );
    }
  }

  // Stamp each item with vendor info (if any) so per-vendor views work.
  const enrichedItems = items.map((it) => {
    if (!it.productId) return it;
    const prod = getProductById(it.productId);
    if (!prod?.vendorId) return it;
    return { ...it, vendorId: prod.vendorId, vendorName: prod.vendorName };
  });

  const order = createOrder({
    customer: body.customer,
    email: sessionEmail || body.email,
    phone: body.phone,
    items: enrichedItems,
    shipping: body.shipping,
    shippingAddress: body.shippingAddress,
    notes: body.notes,
  });

  // Record payout ledger entries if the order was paid up-front.
  if (order.paymentStatus === "Paid") recordOrderPayouts(order);

  // Notify each vendor whose products are in this order.
  const byVendor = new Map<string, { items: typeof order.items; subtotal: number }>();
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
    }).catch((err) => log.error("[orders] vendor notify failed:", err));
  });

  // Fire-and-forget order confirmation.
  sendOrderConfirmationEmail({
    to: order.email,
    customerName: order.customer,
    orderNumber: order.orderNumber,
    items: order.items,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    shippingAddress: order.shippingAddress,
  }).catch((err) => log.error("[orders] confirmation email failed:", err));

  return NextResponse.json({ order }, { status: 201 });
}
