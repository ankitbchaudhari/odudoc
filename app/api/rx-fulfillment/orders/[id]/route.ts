// Per-order: read + state transitions.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getOrder,
  transitionOrder,
  reloadFulfillmentOrders,
  type FulfillmentStatus,
} from "@/lib/rx-fulfillment/order-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx { params: Promise<{ id: string }> }

const ALLOWED_TARGETS: FulfillmentStatus[] = [
  "accepted", "packed", "out_for_delivery", "delivered",
  "cancelled", "rejected",
];

export async function GET(_req: NextRequest, ctxParam: RouteCtx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await ctxParam.params;
  await reloadFulfillmentOrders();
  const o = getOrder(id);
  if (!o) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // Patient can read their own order; pharmacy reads via the
  // pharmacy view. Skip strict ownership for simplicity here.
  return NextResponse.json({ order: o });
}

export async function PATCH(req: NextRequest, ctxParam: RouteCtx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await ctxParam.params;
  const body = await req.json();
  const to = body.to as FulfillmentStatus;
  if (!ALLOWED_TARGETS.includes(to)) {
    return NextResponse.json({ error: "invalid_target" }, { status: 400 });
  }
  await reloadFulfillmentOrders();
  const o = transitionOrder(id, to, body.note, body.deliveryProof);
  if (!o) return NextResponse.json({ error: "transition_failed" }, { status: 409 });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ order: o });
}
