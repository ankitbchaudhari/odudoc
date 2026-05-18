// /api/lab/samples
//   GET    — list samples for the calling tenant.
//   POST   — collect a new sample.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createSample, listSamples } from "@/lib/lab-samples-store";
import { getLabClassInfo, type LabTestClass } from "@/lib/lab-test-classes";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({
  patientEmail: nonEmptyString.max(120),
  patientName: nonEmptyString.max(120),
  testClass: z.string().trim().min(1).max(40),
  tests: z.array(z.string().trim().max(80)).min(1).max(40),
  location: z.string().trim().max(120).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId;
  if (!orgId) return NextResponse.json({ samples: [] });
  return NextResponse.json({ samples: listSamples({ organizationId: orgId }) });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId;
  if (!orgId) return NextResponse.json({ error: "No tenant context" }, { status: 400 });

  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;

  const classInfo = getLabClassInfo(parsed.testClass);
  if (!classInfo) return NextResponse.json({ error: "Unknown test class" }, { status: 400 });

  const collectedBy = session.user?.email || "unknown";
  const s = createSample({
    organizationId: orgId,
    patientEmail: parsed.patientEmail,
    patientName: parsed.patientName,
    testClass: classInfo.code as LabTestClass,
    tests: parsed.tests,
    custodyEnforced: classInfo.flags.chainOfCustody,
    collectedBy,
    location: parsed.location,
  });
  return NextResponse.json({ sample: s }, { status: 201 });
}
