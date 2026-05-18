// /api/procedure-plans
//   GET  — list plans for the caller (doctor sees their own;
//          patient sees plans assigned to them).
//   POST — doctor creates a multi-sitting plan for a patient.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createPlan, listPlans } from "@/lib/multi-sitting-procedures-store";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";

const CategorySchema = z.enum([
  "dental_rct",
  "dental_orthodontic",
  "dental_implant",
  "oncology_chemo",
  "oncology_radio",
  "physio_rehab",
  "skin_laser",
  "fertility_ivf",
  "psychiatry_therapy",
  "other",
]);

const CreateSchema = z.object({
  patientEmail: nonEmptyString.max(120),
  patientName: nonEmptyString.max(120),
  category: CategorySchema,
  title: nonEmptyString.max(200),
  plannedSittings: z.number().int().min(1).max(50),
  packageFeeUsd: z.number().min(0).max(1_000_000),
  perSittingFeeUsd: z.number().min(0).max(50_000).optional(),
  notes: z.string().trim().max(2000).optional(),
  initialSittings: z
    .array(z.object({ scheduledFor: nonEmptyString.max(40) }))
    .max(50)
    .optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  const filter = role === "doctor"
    ? { doctorId: session.user.email }
    : { patientEmail: session.user.email };
  return NextResponse.json({ plans: listPlans(filter) });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "doctor" && role !== "admin") {
    return NextResponse.json({ error: "Only doctors can create procedure plans" }, { status: 403 });
  }

  const parsed = await parseJson(request, CreateSchema);
  if (parsed instanceof NextResponse) return parsed;

  const orgId = (session.user as { organizationId?: string }).organizationId || "default";
  const { plan, sittings } = createPlan({
    organizationId: orgId,
    patientEmail: parsed.patientEmail,
    patientName: parsed.patientName,
    doctorId: session.user.email,
    doctorName: session.user.name || "Doctor",
    category: parsed.category,
    title: parsed.title,
    plannedSittings: parsed.plannedSittings,
    packageFeeUsd: parsed.packageFeeUsd,
    perSittingFeeUsd: parsed.perSittingFeeUsd,
    notes: parsed.notes,
    initialSittings: parsed.initialSittings,
  });
  return NextResponse.json({ plan, sittings }, { status: 201 });
}
