// Single pharmacy-order endpoint.
//
// GET   — visible to the patient who placed it, the owning vendor, and
//         admins. Anyone else gets 404 (not 403) so we don't leak that
//         the order exists.
// PATCH — state transitions. Patient can only cancel `placed` orders;
//         everything else is vendor-driven.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getPharmacyOrder,
  transitionPharmacyOrder,
  type PharmacyOrderStatus,
} from "@/lib/pharmacy-orders-store";
import { resolveVendorAccess } from "@/lib/vendor-permissions";

export const runtime = "nodejs";

async function resolveCaller(id: string) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const order = getPharmacyOrder(id);
  if (!order) return { error: NextResponse.json({ error: "Order not found" }, { status: 404 }) };
  if (!user?.email) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const isPatient = user.email.toLowerCase() === order.patientEmail;
  const isAdmin = user.role === "admin";
  const access = resolveVendorAccess(user.email, order.vendorId);
  const isVendor = !!access;
  // Store-scoped staff can only see orders tied to their stores.
  if (isVendor && access!.storeIds && !access!.storeIds.includes(order.storeId)) {
    return { error: NextResponse.json({ error: "Order not found" }, { status: 404 }) };
  }
  if (!isPatient && !isAdmin && !isVendor) {
    return { error: NextResponse.json({ error: "Order not found" }, { status: 404 }) };
  }
  return { order, isPatient, isAdmin, isVendor, access, userEmail: user.email };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const r = await resolveCaller(params.id);
  if ("error" in r) return r.error;
  // Patients don't need to see the pickup PIN redacted — it's theirs.
  // But delivery-address is hidden from vendors that shouldn't see it…
  // except of course delivery orders need it to ship. So: no redaction
  // needed here beyond access control above.
  return NextResponse.json({ order: r.order });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const r = await resolveCaller(params.id);
  if ("error" in r) return r.error;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const to = body.to as PharmacyOrderStatus;
  if (!to) return NextResponse.json({ error: "Missing 'to' status" }, { status: 400 });

  // Patient can only cancel from `placed`. Vendor/admin drive the rest.
  if (r.isPatient && !r.isVendor && !r.isAdmin) {
    if (to !== "cancelled" || r.order.status !== "placed") {
      return NextResponse.json(
        { error: "Patients can only cancel an order while it's still 'placed'" },
        { status: 403 },
      );
    }
  }

  // Vendor-side: enforce per-role action rights. Any role with order-
  // processing rights can accept/ready/dispatch/complete/cancel.
  if (r.isVendor && !r.isPatient && !r.isAdmin) {
    if (!r.access!.canProcessOrders(r.order.storeId)) {
      return NextResponse.json(
        { error: "You don't have permission to process orders at this store" },
        { status: 403 },
      );
    }
  }

  const result = transitionPharmacyOrder({
    id: params.id,
    to,
    note: typeof body.note === "string" ? body.note : undefined,
    pin: typeof body.pin === "string" ? body.pin : undefined,
    actorEmail: r.userEmail || undefined,
    actorRole: r.access?.role || (r.isPatient ? "patient" : r.isAdmin ? "admin" : undefined),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ order: result.order });
}
