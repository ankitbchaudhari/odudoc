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
import { sendToEmail } from "@/lib/fcm";

import { log } from "@/lib/log";
export const runtime = "nodejs";

// Map an OrderStatus to a tray-friendly title + body. Kept in one place
// so the copy stays consistent if we tweak one of them.
function pushCopyForStatus(
  status: OrderStatus,
  orderNumber: string,
  trackingNumber?: string
): { title: string; body: string } | null {
  switch (status) {
    case "Processing":
      return {
        title: "Order being prepared",
        body: `${orderNumber} · we'll let you know when it ships.`,
      };
    case "Shipped":
      return {
        title: "Order shipped",
        body: trackingNumber
          ? `${orderNumber} · tracking ${trackingNumber}`
          : `${orderNumber} is on its way.`,
      };
    case "Delivered":
      return {
        title: "Order delivered",
        body: `${orderNumber} arrived. Pay the courier in cash if it was COD.`,
      };
    case "Cancelled":
      return {
        title: "Order cancelled",
        body: `${orderNumber} was cancelled. Any payment will be refunded.`,
      };
    default:
      return null;
  }
}

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

  // Only fire notifications when the status actually changed, and not for
  // "Pending" (that's covered by the confirmation email on create).
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

    // Mobile push, best-effort. We key off the customer's email (not a
    // userId) because pre-mobile orders have no userId; sendToEmail
    // fans out across every device they've registered.
    const copy = pushCopyForStatus(
      next.orderStatus,
      next.orderNumber,
      next.trackingNumber
    );
    if (copy) {
      void sendToEmail(next.email, {
        title: copy.title,
        body: copy.body,
        deepLink: `order/${next.id}`,
        channel: "orders",
      });
    }
  }

  return NextResponse.json({ order: next });
}
