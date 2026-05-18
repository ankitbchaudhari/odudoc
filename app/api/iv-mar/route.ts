// /api/iv-mar
//   GET   — list MAR rows + overdue count for the nurse dashboard.
//   POST  — record a dose. Body: { administrationId, patientEmailScanned, drugScanned, witnessBy?, reason?, status? }

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listMar, listOverdue, recordDose } from "@/lib/iv-mar-store";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";

const RecordSchema = z.object({
  administrationId: nonEmptyString.max(40),
  patientEmailScanned: nonEmptyString.max(120),
  drugScanned: nonEmptyString.max(80),
  witnessBy: z.string().trim().max(120).optional(),
  reason: z.string().trim().max(500).optional(),
  status: z.enum(["given", "held", "refused"]).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const patient = request.nextUrl.searchParams.get("patient") || undefined;
  return NextResponse.json({
    administrations: listMar({ patientEmail: patient }),
    overdue: listOverdue(),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "doctor" && role !== "admin" && role !== "pharmacist") {
    return NextResponse.json({ error: "Only clinical staff can record doses" }, { status: 403 });
  }
  const parsed = await parseJson(request, RecordSchema);
  if (parsed instanceof NextResponse) return parsed;
  const out = recordDose({ ...parsed, administeredBy: session.user.email });
  if (!out) return NextResponse.json({ error: "Administration not found" }, { status: 404 });
  return NextResponse.json(out);
}
