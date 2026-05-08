// Log a maintenance / calibration event for a piece of equipment.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveClinic } from "@/lib/emr-store";
import { logMaintenance, listMaintenance } from "@/lib/equipment-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";

interface RouteContext { params: Promise<{ id: string }>; }

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const log = await listMaintenance(id);
  return NextResponse.json({ log });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
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
  const kind = body.kind as "preventive" | "corrective" | "calibration" | "inspection" | undefined;
  if (!kind) return NextResponse.json({ error: "kind is required" }, { status: 400 });

  const row = await logMaintenance({
    equipmentId: id,
    doctorEmail: ownerEmail,
    kind,
    performedAt: (body.performedAt as string) || new Date().toISOString(),
    performedBy: body.performedBy as string | undefined,
    cost: typeof body.cost === "number" ? body.cost : undefined,
    notes: body.notes as string | undefined,
    nextDueAt: body.nextDueAt as string | undefined,
  });
  await awaitAllFlushesStrict().catch(() => {});
  return NextResponse.json({ entry: row }, { status: 201 });
}
