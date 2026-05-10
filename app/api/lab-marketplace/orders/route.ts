// Place + list lab orders.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createLabOrder,
  listOrdersForPatient,
  listOrdersForLab,
  type LabOrderLine,
} from "@/lib/lab-marketplace/order-store";
import { findUserById } from "@/lib/users-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  if (url.searchParams.get("view") === "lab" && url.searchParams.get("labId")) {
    return NextResponse.json({ orders: listOrdersForLab(String(url.searchParams.get("labId"))) });
  }
  return NextResponse.json({ orders: listOrdersForPatient(userId) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const u = findUserById(userId);
  if (!u) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  const body = await req.json();
  const labId = String(body.labId || "").trim();
  const labName = String(body.labName || "").trim();
  const fulfilment = body.fulfilment === "in_lab" ? "in_lab" : "home_collection";
  const lines: LabOrderLine[] = Array.isArray(body.lines) ? body.lines : [];
  if (!labId || !labName) return NextResponse.json({ error: "missing_lab" }, { status: 400 });
  if (lines.length === 0) return NextResponse.json({ error: "no_tests" }, { status: 400 });
  if (fulfilment === "home_collection" && !body.address) {
    return NextResponse.json({ error: "missing_address" }, { status: 400 });
  }
  const o = createLabOrder({
    patientUserId: userId,
    patientName: u.name,
    patientPhone: u.phone,
    fulfilment,
    address: body.address,
    scheduledFor: body.scheduledFor,
    labId, labName,
    source: body.encounterId ? "encounter" : "self_request",
    encounterId: body.encounterId,
    doctorName: body.doctorName,
    lines,
    collectionFeeRupees: typeof body.collectionFeeRupees === "number" ? body.collectionFeeRupees : 0,
  });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ order: o });
}
