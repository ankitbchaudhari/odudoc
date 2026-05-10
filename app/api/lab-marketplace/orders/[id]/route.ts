// Per-order: read + transition.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getOrder,
  transitionLabOrder,
  type LabOrderStatus,
} from "@/lib/lab-marketplace/order-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx { params: Promise<{ id: string }> }
const ALLOWED: LabOrderStatus[] = ["confirmed", "sample_collected", "in_lab", "reported", "closed", "cancelled"];

export async function GET(_req: NextRequest, ctxParam: RouteCtx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await ctxParam.params;
  const o = getOrder(id);
  if (!o) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ order: o });
}

export async function PATCH(req: NextRequest, ctxParam: RouteCtx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await ctxParam.params;
  const body = await req.json();
  const to = body.to as LabOrderStatus;
  if (!ALLOWED.includes(to)) return NextResponse.json({ error: "invalid_target" }, { status: 400 });
  const o = transitionLabOrder({ id, to, note: body.note, reportUrl: body.reportUrl, results: body.results });
  if (!o) return NextResponse.json({ error: "transition_failed" }, { status: 409 });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ order: o });
}
