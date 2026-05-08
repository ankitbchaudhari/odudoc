// Lab order list + create.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveClinic } from "@/lib/emr-store";
import { createLabOrder, listLabOrders, type LabOrderStatus } from "@/lib/lab-orders-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  // Lab tech sees only their own orders (matches patient-acl matrix).
  const orderedBy = clinic.role === "lab_tech" ? clinic.userEmail : (sp.get("orderedBy") || undefined);
  const orders = await listLabOrders({
    doctorEmail: ownerEmail,
    status: (sp.get("status") || undefined) as LabOrderStatus | "All" | undefined,
    orderedBy,
    patientId: sp.get("patientId") || undefined,
  });
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (clinic.role === "billing" || clinic.role === "lab_tech") {
    return NextResponse.json({ error: "Your role can't order labs." }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.patientId || !body.patientName || !body.testName) {
    return NextResponse.json({ error: "patientId, patientName, testName are required" }, { status: 400 });
  }
  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const row = await createLabOrder({
    doctorEmail: ownerEmail,
    patientId: String(body.patientId),
    patientName: String(body.patientName),
    orderedBy: clinic.userEmail,
    testName: String(body.testName),
    testCode: body.testCode as string | undefined,
    panel: body.panel as string | undefined,
    visitId: body.visitId as string | undefined,
    notes: body.notes as string | undefined,
  });
  await awaitAllFlushesStrict().catch(() => {});
  return NextResponse.json({ order: row }, { status: 201 });
}
