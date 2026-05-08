// Lab order PATCH — drives status flips, result entry, abnormal flag.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveClinic } from "@/lib/emr-store";
import { updateLabOrder, type LabOrderStatus } from "@/lib/lab-orders-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";

interface RouteContext { params: Promise<{ id: string }>; }

const VALID_STATUS: LabOrderStatus[] = [
  "pending", "collected", "in_progress", "ready", "delivered", "rejected", "cancelled",
];

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const status = body.status as LabOrderStatus | undefined;
  if (status && !VALID_STATUS.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  const r = await updateLabOrder(id, ownerEmail, {
    status,
    resultValue: body.resultValue as string | undefined,
    refRange: body.refRange as string | undefined,
    abnormal: typeof body.abnormal === "boolean" ? body.abnormal : undefined,
    notes: body.notes as string | undefined,
    reportedBy: clinic.userEmail,
  });
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await awaitAllFlushesStrict().catch(() => {});
  return NextResponse.json({ order: r });
}
