// Equipment list + create.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveClinic } from "@/lib/emr-store";
import {
  createEquipment,
  listEquipment,
  summariseEquipment,
} from "@/lib/equipment-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const items = await listEquipment({
    doctorEmail: ownerEmail,
    status: sp.get("status") as never,
    search: sp.get("search") || undefined,
  });
  const summary = await summariseEquipment(ownerEmail);
  return NextResponse.json({ items, summary });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (clinic.role === "lab_tech" || clinic.role === "billing" || clinic.role === "frontdesk" || clinic.role === "nurse") {
    return NextResponse.json({ error: "Your role can't add equipment." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.assetTag || !body.name) {
    return NextResponse.json({ error: "assetTag and name are required" }, { status: 400 });
  }
  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const row = await createEquipment({
    doctorEmail: ownerEmail,
    assetTag: String(body.assetTag),
    name: String(body.name),
    manufacturer: body.manufacturer as string | undefined,
    model: body.model as string | undefined,
    serialNo: body.serialNo as string | undefined,
    location: body.location as string | undefined,
    category: body.category as string | undefined,
    purchaseDate: body.purchaseDate as string | undefined,
    warrantyEnd: body.warrantyEnd as string | undefined,
    amcVendor: body.amcVendor as string | undefined,
    amcEnd: body.amcEnd as string | undefined,
    nextMaintenanceDate: body.nextMaintenanceDate as string | undefined,
    nextCalibrationDate: body.nextCalibrationDate as string | undefined,
    notes: body.notes as string | undefined,
  });
  await awaitAllFlushesStrict().catch(() => {});
  return NextResponse.json({ item: row }, { status: 201 });
}
