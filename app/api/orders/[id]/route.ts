import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getOrderById,
  updateOrder,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orders-store";
import { sendOrderStatusUpdateEmail } from "@/lib/email";
import { recordOrderPayouts } from "@/lib/payouts-store";

import { log } from "@/lib/log";
export const runtime = "nodejs";

function canManage(role: string | undefined): boolean {
  return role === "admin" || role === "staff";
}

const VALID_ORDER_STATUSES: OrderStatus[] = [
  "Pending",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];
const VALID_PAYMENT_STATUSES: PaymentStatus[] = ["Paid", "Pending", "Refunded"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const email = session?.user?.email;

  const { id } = await params;
  const order = getOrderById(id);
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Non-admin/staff callers can only fetch their own orders.
  if (!canManage(role) && order.email.toLowerCase() !== (email || "").toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ order });
}

// PATCH /api/orders/[id] — admin/staff update status / payment / tracking / notes.
// Status changes (Processing/Shipped/Delivered/Cancelled) fire an email.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!canManage(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let body: {
    orderStatus?: OrderStatus;
    paymentStatus?: PaymentStatus;
    trackingNumber?: string;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.orderStatus && !VALID_ORDER_STATUSES.includes(body.orderStatus)) {
    return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
  }
  if (
    body.paymentStatus &&
    !VALID_PAYMENT_STATUSES.includes(body.paymentStatus)
  ) {
    return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
  }

  const result = updateOrder(id, body);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { prev, next } = result;

  // When payment transitions into "Paid", generate vendor payout ledger entries.
  if (prev.paymentStatus !== "Paid" && next.paymentStatus === "Paid") {
    recordOrderPayouts(next);
  }

  // Only fire an email when the status actually changed, and not for "Pending"
  // (that's covered by the confirmation email on create).
  if (
    prev.orderStatus !== next.orderStatus &&
    next.orderStatus !== "Pending"
  ) {
    sendOrderStatusUpdateEmail({
      to: next.email,
      customerName: next.customer,
      orderNumber: next.orderNumber,
      status: next.orderStatus as "Processing" | "Shipped" | "Delivered" | "Cancelled",
      trackingNumber: next.trackingNumber,
    }).catch((err) =>
      log.error("[orders] status email failed:", err)
    );
  }

  return NextResponse.json({ order: next });
}
