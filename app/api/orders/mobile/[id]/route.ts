// GET /api/orders/mobile/{id}
//
// Returns a single order owned by the caller. We match on the JWT email
// rather than an internal user id because orders-store keys off email —
// the shared Order record is identical to what the web flow creates.

import { NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/lib/orders-store";
import { requireMobileUser } from "@/lib/mobile-auth";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "patient") {
    return NextResponse.json({ error: "wrong_role" }, { status: 403 });
  }
  try {
    const order = getOrderById(params.id);
    if (!order) {
      return NextResponse.json({ error: "order_not_found" }, { status: 404 });
    }
    if (order.email.toLowerCase() !== auth.email.toLowerCase()) {
      return NextResponse.json({ error: "not_owner" }, { status: 403 });
    }
    return NextResponse.json({ order });
  } catch (err) {
    log.error("mobile-order detail error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
