// /api/ambulance/vehicles
//   GET — list fleet for the calling tenant.
//   POST — register a new vehicle.
//   PATCH — GPS ping (?id=…) body { lat, lng, status? }

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listVehicles, pingVehicle, registerVehicle } from "@/lib/ambulance-store";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";

const RegisterSchema = z.object({
  reg: nonEmptyString.max(40),
  class: z.enum(["BLS", "ALS", "ICU", "MORTUARY"]),
  crew: z.array(z.string().trim().max(120)).max(10).default([]),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  status: z.enum(["available", "en_route", "on_scene", "transporting", "out_of_service"]).default("available"),
});

const PingSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  status: z.enum(["available", "en_route", "on_scene", "transporting", "out_of_service"]).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId;
  return NextResponse.json({ vehicles: listVehicles(orgId) });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId || "default";
  const parsed = await parseJson(request, RegisterSchema);
  if (parsed instanceof NextResponse) return parsed;
  const v = registerVehicle({ ...parsed, organizationId: orgId });
  return NextResponse.json({ vehicle: v }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const parsed = await parseJson(request, PingSchema);
  if (parsed instanceof NextResponse) return parsed;
  const v = pingVehicle(id, parsed.lat, parsed.lng, parsed.status);
  if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ vehicle: v });
}
