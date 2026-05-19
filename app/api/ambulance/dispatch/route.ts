// POST /api/ambulance/dispatch
//
// Single-shot dispatcher: caller submits pickup lat/lng + severity,
// we return the recommended vehicle and (if confirmed) create a job.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recommendVehicle, createJob } from "@/lib/ambulance-store";
import { routeBetween } from "@/lib/osrm-client";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({
  callerName: nonEmptyString.max(80),
  callerPhone: z.string().trim().min(7).max(20),
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
  pickupAddress: z.string().trim().max(500).optional(),
  severity: z.enum(["stable", "urgent", "critical"]),
  destinationHospitalId: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1000).optional(),
  /** "preview" returns the recommendation without creating a job. */
  mode: z.enum(["preview", "dispatch"]).default("dispatch"),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId;
  if (!orgId) return NextResponse.json({ error: "No tenant context" }, { status: 400 });

  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;

  const rec = recommendVehicle({
    organizationId: orgId,
    pickupLat: parsed.pickupLat,
    pickupLng: parsed.pickupLng,
    severity: parsed.severity,
  });
  if (!rec) {
    return NextResponse.json(
      { error: "No available vehicles. Try a wider net or contact 108." },
      { status: 503 },
    );
  }

  // Upgrade the distance + ETA to road-routed numbers when OSRM
  // is configured. Falls back to the Haversine recommendation if
  // OSRM is unreachable.
  const route = await routeBetween(
    rec.vehicle.lat,
    rec.vehicle.lng,
    parsed.pickupLat,
    parsed.pickupLng,
  );

  if (parsed.mode === "preview") {
    return NextResponse.json({
      recommendation: {
        vehicleId: rec.vehicle.id,
        reg: rec.vehicle.reg,
        class: rec.vehicle.class,
        distanceKm: Number(route.distanceKm.toFixed(2)),
        etaMin: route.etaMin,
        source: route.source,
      },
    });
  }

  const job = createJob({
    organizationId: orgId,
    callerName: parsed.callerName,
    callerPhone: parsed.callerPhone,
    pickupLat: parsed.pickupLat,
    pickupLng: parsed.pickupLng,
    pickupAddress: parsed.pickupAddress,
    destinationHospitalId: parsed.destinationHospitalId,
    severity: parsed.severity,
    notes: parsed.notes,
    vehicleId: rec.vehicle.id,
  });
  return NextResponse.json({ job, vehicle: rec.vehicle, distanceKm: rec.km }, { status: 201 });
}
