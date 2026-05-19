// /api/iv-mar/orders
//   POST — create a new IV order. The MAR auto-generates 24h of
//          scheduled administration rows from the start time +
//          interval, so the nurse console shows due doses
//          immediately.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createIvOrder } from "@/lib/iv-mar-store";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({
  patientEmail: nonEmptyString.max(120),
  patientName: nonEmptyString.max(120),
  patientBedId: z.string().trim().max(40).optional(),
  drug: nonEmptyString.max(80),
  dose: nonEmptyString.max(40),
  diluent: z.string().trim().max(80).optional(),
  rate: z.string().trim().max(80).optional(),
  frequency: nonEmptyString.max(40),
  intervalHours: z.number().min(0.25).max(168),
  durationHours: z.number().min(0).max(720).optional(),
  startsAt: nonEmptyString.max(40),
  scheduleClass: z.enum(["OTC", "H", "H1", "X", "G", "K"]).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "doctor" && role !== "admin") {
    return NextResponse.json({ error: "Only doctors can place IV orders" }, { status: 403 });
  }
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId || "default";
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;

  const o = createIvOrder({
    organizationId: orgId,
    patientEmail: parsed.patientEmail,
    patientName: parsed.patientName,
    patientBedId: parsed.patientBedId,
    doctorId: session.user.email,
    drug: parsed.drug,
    dose: parsed.dose,
    diluent: parsed.diluent,
    rate: parsed.rate,
    frequency: parsed.frequency,
    intervalHours: parsed.intervalHours,
    durationHours: parsed.durationHours,
    startsAt: parsed.startsAt,
    scheduleClass: parsed.scheduleClass,
  });
  return NextResponse.json({ order: o }, { status: 201 });
}
