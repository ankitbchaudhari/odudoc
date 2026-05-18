// /api/home-healthcare
//   GET            — list active services.
//   POST           — patient creates a visit request.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listServices, createVisit, getService } from "@/lib/home-healthcare-store";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({
  serviceId: nonEmptyString.max(40),
  address: nonEmptyString.max(500),
  scheduledFor: nonEmptyString.max(40),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export async function GET(request: NextRequest) {
  const kindParam = request.nextUrl.searchParams.get("kind");
  const services = listServices(
    kindParam === "dialysis" || kindParam === "skilled_nursing" || kindParam === "physiotherapy"
      ? { kind: kindParam }
      : {},
  );
  return NextResponse.json({ services });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;

  const service = getService(parsed.serviceId);
  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  const v = createVisit({
    patientEmail: session.user.email,
    patientName: session.user.name || "Patient",
    serviceId: service.id,
    organizationId: service.organizationId,
    address: parsed.address,
    scheduledFor: parsed.scheduledFor,
    lat: parsed.lat,
    lng: parsed.lng,
  });
  return NextResponse.json({ visit: v }, { status: 201 });
}
